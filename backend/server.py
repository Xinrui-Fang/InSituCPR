from flask import Flask, render_template, request, jsonify, Response, session
from flask_cors import CORS
from openai import OpenAI
import requests  
import random
from dotenv import load_dotenv
from assistant_setup import ResearchAssistantManager
import os

# Load .env file
load_dotenv()
semantic_scholar_api_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY')





app = Flask(__name__)
app.secret_key = "your-secret-key" 

CORS(app, supports_credentials=True)

message_queue = [] # message_queue TODO

def get_manager():
    
    print("SESSION FULL:", dict(session))
    api_key = session.get("OPENAI_API_KEY")
   
    if not api_key:
        raise RuntimeError("API key missing")

    client = OpenAI(api_key=api_key)
    return ResearchAssistantManager(client)



def match_field(perspective: str) -> str:
    manager = get_manager()
    client = manager.client   
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert in academic classification. "
                    "Given a research perspective, match it to the most relevant field from the following list:\n\n"
                    "Computer Science, Medicine, Chemistry, Biology, Materials Science, Physics, Geology, "
                    "Psychology, Art, History, Geography, Sociology, Business, Political Science, Economics, "
                    "Philosophy, Mathematics, Engineering, Environmental Science, Agricultural and Food Sciences, "
                    "Education, Law, Linguistics."
                    "Your response should contain only one field name from list, nothing else."

                )
            },
            {"role": "user", "content": perspective}
        ]
    )
    return response.choices[0].message.content

def match_section(title: str) -> str:
    manager = get_manager()
    client = manager.client   
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert in HCI academic writing structure. "
                    "Given a research paper title, match it to the most relevant section from the following list:\n\n"
                    "Introduction, Related Work, Method, Data, System / Design, Research Question / Hypotheses, "
                    "Experiment / Study, Participant, Task, Procedure, Measures, Analysis, Results, "
                    "Implication, Limitation / Future Work, Conclusion.\n\n"
                    "Your response should contain only one section name from the list, nothing else."
                )
            },
            {"role": "user", "content": title}
        ]
    )
    return response.choices[0].message.content

def get_paper_details(corpusId):
    request_url = f"https://api.semanticscholar.org/graph/v1/paper/CorpusId:{corpusId}?fields=year,url,tldr"
    try:
        response = requests.get(request_url, headers={
            'x-api-key': semantic_scholar_api_key,
            'Content-Type': 'application/json',
        })

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching paper details: {response.status_code}, {response.text}")
            return None
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        return None
    

@app.route('/api/set-vector-store', methods=['POST'])
def set_vector_store():
    data = request.get_json()
    paper_id = data.get('selectedPaper')  
    api_key = data.get("apiKey") 

    if not paper_id:
        return jsonify({"error": "Missing selectedPaper"}), 400
    
    if not api_key:
        return jsonify({"error": "Missing apiKey"}), 400
    
    # Save client's openai api key into the session
    session["OPENAI_API_KEY"] = api_key
    print("SESSION AFTER SET:", dict(session))

    key = f"VECTOR_STORE_ID_{paper_id}"
    vector_store_id = os.getenv(key)

    if vector_store_id:
        vector_store_id = vector_store_id
        print(f"[INFO] Set VECTOR_STORE_ID to: {vector_store_id}")
        return jsonify({"status": "success", "vector_store_id": vector_store_id})
    else:
        return jsonify({"error": f"No vector store ID for {paper_id}"}), 404
    
# API: semantic-scholar
@app.route('/api/semantic-scholar', methods=['POST'])
def get_semantic_scholar_data():
    # Get query from the client request
    data = request.get_json()
    query = data['query']
    perspective = data['perspective']

    if not query:
        return jsonify({"error": "No query provided"}), 400
    
    # Construct the request URL
    request_url = f"https://api.semanticscholar.org/graph/v1/snippet/search?query={query}&limit=10&fieldsOfStudy={match_field(perspective)}"
    print(f"Fetching from: {request_url}")
    
    # Make the request to the Semantic Scholar API
    response = requests.get(request_url, headers={
        'x-api-key': semantic_scholar_api_key,
        'Content-Type': 'application/json',
    })

    # Check for a successful response
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch data from Semantic Scholar"}), 500

    data = response.json()
    
    results = []
    seen_corpus_ids = set()  # Save stored corpusId
    max_results = 3  # Return max 3 papers
    count = 0  

    for item in data.get('data', []):
        if count >= max_results:
            break  # If have 3 papers, stop

        corpusId = item.get('paper', {}).get('corpusId')

        # If corpusId added, skip
        if corpusId in seen_corpus_ids:
            continue

        seen_corpus_ids.add(corpusId)  # Record corpusId to prevent duplication
        snippet_text = item.get('snippet', {}).get('text', "Not found")
        authors = item.get('paper', {}).get('authors', [])
        title = item.get('paper', {}).get('title', "Unknown Title")

        print(f"Processing CorpusId: {corpusId}")
        paper_details = get_paper_details(corpusId) if corpusId else None

        results.append({
            "snippet_text": snippet_text,
            "title": title,
            "authors": authors,
            "paper_details": paper_details
        })

        count += 1  

    # Return the data as JSON
    return jsonify(results)


# POST
@app.route('/revisedAnswerFeedback', methods=['POST'])
def revisedAnswerFeedback():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    initialAnswer = data['messages']['initialAnswer']
    revisedAnswer = data['messages']['revisedAnswer']
    agreeText = data['messages']['agreeText']
    vector_store_id = data['messages']['vector_store_id']

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (         
            f"User's initial answer is '{initialAnswer}', the revised answer is '{revisedAnswer}'. "
            f"The feedback for the initial answer is '{agreeText}'. "
            "Based on this feedback, evaluate how well the revised answer addresses the issues or suggestions mentioned. "
            "Provide a concise and constructive feedback on the revised answer in 100 words."
        ),    
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=f"User's initial answer is '{initialAnswer}', the revised answer is '{revisedAnswer}'. "
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        # message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"
    
# POST
@app.route('/perspectives', methods=['POST'])
def agentDiversePerspectives():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    agent_perspective = data['messages']['agent_perspective']
    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (         
            f"The reader's highlight and comment may reflect personal bias. Your task is to reframe the comment strictly from the '{agent_perspective}' perspective. "
            "This perspective should be well-defined and logically consistent, encouraging a balanced understanding. "
            "Focus on providing a constructive, concise response. Only provide the reframed sentence without mentioning the perspective name. "
            "Ensure that the reframed sentence is relevant and directly addresses the reader's original comment."

        ),    
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"
    

# POST
@app.route('/highlights', methods=['POST'])
def agentHighlights():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    agent_perspective = data['messages']['agent_perspective']
    vector_store_id = data['messages']['vector_store_id']

    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",

        # Stable Performance
        # instructions = (
        #     f"You are an expert specializing in '{agent_perspective}'. Your task is to identify and extract 20 sections evenly distributed throughout this paper that are particularly insightful or significant from the perspective of '{agent_perspective}'. "
        #     "Ensure that these sections are drawn from the entire paper, covering the beginning, middle, and end parts. "
        #     "Each extracted section must be a complete, **directly quoted sentence from the original paper**, exactly as it appears, fully retaining all punctuation, capitalization, and formatting. "
        #     "Do not rephrase, paraphrase, or modify the sentences in any way, and ensure they are directly searchable within the PDF. "
        #     "Do not include partial sentences or incomplete thoughts. "
        # ), 

    # Example
    # "Abstract: When reading a scholarly article, inline citations help researchers contextualize the current article and discover relevant prior work." 
    # - **Significance**: Understanding the abstract provides insight into how the augmentation of inline citations can aid psychological processes like contextual understanding and cognitive mapping in academic research
        # instructions = (
        #     f"You are an expert specializing in '{agent_perspective}'. Your task is to identify and extract 10 sections evenly distributed throughout this paper that are particularly insightful or significant from the perspective of '{agent_perspective}'. "
        #     "Ensure that these sections are drawn from the entire paper, covering the beginning, middle, and end parts. "
        #     "Each extracted section must follow this format:\n"
        #     "\"[Extracted sentence]\"\n"
        #     "- [Insightful annotation explaining the significance of the sentence.]\n"
            
        #     "Each extracted section must be a complete, **directly quoted sentence from the original paper**, exactly as it appears, fully retaining all punctuation, capitalization, and formatting. "
        #     "Do not rephrase, paraphrase, or modify the sentences in any way, and ensure they are directly searchable within the PDF. "
        #     "Do not include partial sentences or incomplete thoughts. "
        #     "After each section, provide an insightful annotation (comment) that explains the significance of the section from your perspective. "
        #     "These annotations should highlight why the sentence is particularly insightful, its relevance to '{agent_perspective}', and any broader implications it may have."
        # ),

        instructions = (
            "Your task is to identify at least 10 sentences from the text file citesee.txt that demonstrate potential bias. "
            # "You are strictly required to limit your analysis to the first 20% of the text file content, "
            # "based on either the number of lines or the number of characters. Do not analyze any content beyond this range. "
            "Each extracted sentence must be a complete, **directly quoted sentence from the original text**, exactly as it appears, " 
            "Fully retaining all punctuation, capitalization, and formatting, while excluding the final period. "
            "Do not rephrase, paraphrase, summarize, or modify the sentences in any way. "
            "Ensure that the response includes no additional text, interpretation, or context outside of the specified output format. "
            # Hyphens
            # "Ensure that line breaks with hyphens (e.g., 'strat- egy') are preserved exactly as they appear in the file. "
            "and that no attempt is made to join or alter them. Hyphenated words split across lines must remain split and formatted as in the original text. "
            "The extracted sentences must preserve the exact capitalization, punctuation, and spacing as they appear in the original text. "
            "and must not include any ellipses or additional periods. "
            "For each sentence, provide an explanation of the potential bias. "
            "Ensure that the response strictly follows the specified format and includes no additional text or context. "
            "Output format:\n"
            "\"[Extracted sentence]\"\n"
            "\"[The potential bias]\"\n"
            "\n"
            "Example:\n"
            "8. \"The second half of the interviews consisted of walking through the design mock-ups for 40 minutes, where we probed how strongly they reacted to the issues each design aimed to address\"\n"
            "    - The potential bias: The probing and structured setting might lead to responses that align with researchers' expectations, not necessarily reflecting genuine reactions.\n"
            "9. \"Results suggest the system strategy (Reencountered) significantly outperformed the three baselines for both measures\"\n"
            "    - The potential bias: Using 'significantly outperformed' may reflect confirmation bias or selective reporting without full statistical context shared.\n"
            "10. \"A promising approach to improve such recommendations can be to incorporate semantic similarity signals into the highlighting strategy\"\n"
            "    - The potential bias: The term 'promising' implies a favorable outcome of this approach without presenting potential challenges or alternative perspectives."
        ),


        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # Intro
        # vs_OP9zGY4Qn7hCDhSdIvROmT18
        # Full
        # vs_jWyWVjWUONrMgxHK1sx3MCQd
        
        
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text,
        # parameters={"temperature": 0}
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"


# POST
@app.route('/xml', methods=['POST'])
def agentXml():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    agent_perspective = data['messages']['agent_perspective']
    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (         
            "Extract as much <s> tags from the provided XML content as possible that describe:"
            "- Objective: Sentences explaining the goal or purpose of the research."
            "- Result: Experiment results."
            "- Method: Experiment Methods"
            "- Research Question: Sentences posing the specific questions the research aims to address."
            "- Novelty: Sentences highlighting what makes the research unique or original compared to prior work."
            "For each extracted <s> tag, include:"
            "### Output Requirements:"
            "- Each extracted sentence must be formatted in the XML-like structure: <s coords=\"coords\" tag=\"Objective\">Text</s>."
            "- The coords attribute must retain all its subparts and be included as it appears in the original <s> tag, without truncation or loss of detail."
            "- Ensure that multi-line coords values are concatenated into a single string, separated by semicolons, as they appear in the original XML."
            "- Do not provide additional metadata or summaries in the output."
            "- The result should only include sentences encapsulated by <s> tags without extra labels or explanations."
            "### Example:"
            "<s coords=\"1,53.53,325.17,240.51,7.94;1,53.80,336.12,241.76,7.94;1,53.80,347.08,220.82,7.94\" tag=\"Objective\">This paper introduces CiteSee, a tool that provides personalized visual augmentations and context around citations.</s>"

        ),    
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"
    
# FUNCTION: backend-generatePromptOf3MultiAnswers
def generatePromptOf3MultiAnswers(question, answer, avatars):
    manager = get_manager()
    client = manager.client   
    if len(avatars) == 0:
        # Detailed instructions when avatars is empty
        instructions = (
            f"The instructor asks a critical thinking question '{question}', and the reader's answer is '{answer}'. "
            "Judge the reader's answer first, then provide an improved response from **experts in three distinct and relevant academic disciplines**.  "
            "Each answer should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s answer introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each answer should:"  
            "- **Begin with an implicit evaluation** of the reader's answer before transitioning into the improved response.  "
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's answer introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per answer).**  "

            "In the output, replace any instance of 'The reader's answer' with 'Your answer'.\n"
            "Provide the output as **raw JSON text**, without any surrounding Markdown formatting like triple backticks.\n\n"

            "{\n"
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]",\n'
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]",\n'
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]"\n'
            "}"
        )
    else:
        # Extract the disciplines from avatars
        concatenated_disciplines = ", ".join([discipline for _, discipline ,_ in avatars])

        instructions = (
            f"The instructor asks a critical thinking question '{question}', and the reader's answer is '{answer}'. "
            "Judge the reader's answer first, then provide an improved response from **experts in three distinct and relevant academic disciplines**.  "
            f"First generate answers from '{concatenated_disciplines}'s perspectives. "
            "Each answer should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s answer introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each answer should:"  
            "- **Begin with an implicit evaluation** of the reader's answer before transitioning into the improved response.  "
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's answer introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per answer).**  "

            "In the output, replace any instance of 'The reader's answer' with 'Your answer'.\n"
            "Provide the output as **raw JSON text**, without any surrounding Markdown formatting like triple backticks.\n\n"

            f"Do not split or abbreviate any disciplines. Each discipline in '{concatenated_disciplines}' should be treated as a distinct entity. "
            "If fewer than three disciplines are provided, choose an additional relevant discipline to complete the set of three."

            "{\n"
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]",\n'
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]",\n'
            '  "[Perspective Name]": "[Judgement of answer][Improved answer]"\n'
            "}"
        )

    return instructions
# FUNCTION: backend-generatePromptOfMultiReinterpret
def generatePromptOfMultiReinterpret(quote, label, avatars):
    manager = get_manager()
    client = manager.client   
    if len(avatars) == 0:
        # Detailed instructions when avatars is empty
        instructions = (
            f"The reader highlights '{quote}' in the paper and marks it as : '{label}'. "
            f"Reinterpret '{label}' of reader's highlight from ** 3 most relevant different academic disciplines's perspective**. "
            "Each reinterpretation should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s reinterpretation introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each reinterpretation should:"  
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's reinterpretation introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per reinterpretation).**  "
            "Provide the response in **raw JSON format only**, with no introductory or concluding text:\n\n"
            "{\n"
            '  "[Perspective Name]": "[Reinterpretation]",\n'
            '  "[Perspective Name]": "[Reinterpretation]",\n'
            '  "[Perspective Name]": "[Reinterpretation]"\n'
            "}"
        )
    else:
        # Extract the disciplines from avatars
        concatenated_disciplines = ", ".join([discipline for _, discipline, _ in avatars])

        instructions = (
            f"The reader highlights '{quote}' in the paper and marks it as : '{label}'. "
            f"Reinterpret '{label}' of reader's highlight from ** 3 different academic disciplines's perspective**. "
            f"First generate reinterpretation from '{concatenated_disciplines}'s perspectives. "
            "Each reinterpretation should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s reinterpretation introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each reinterpretation should:"  
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's reinterpretation introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per reinterpretation).**  "

            "Provide the output as **raw JSON text**, without any surrounding Markdown formatting like triple backticks.\n\n"

            f"Do not split or abbreviate any disciplines. Each discipline in '{concatenated_disciplines}' should be treated as a distinct entity. "
            "If fewer than three disciplines are provided, choose an additional relevant discipline to complete the set of three."

           "{\n"
            '  "[Perspective Name]": "[Reinterpretation]",\n'
            '  "[Perspective Name]": "[Reinterpretation]",\n'
            '  "[Perspective Name]": "[Reinterpretation]"\n'
            "}"
        )
    print(instructions)
    return instructions

#FUNCTION: backend-generatePromptOfMultiAnswers
def generatePromptOfMultiAnswers(quote, comment, avatars):
    manager = get_manager()
    client = manager.client   
    if len(avatars) == 0:
        # Detailed instructions when avatars is empty
        instructions = (
            f"The reader highlights '{quote}' in the paper and adds comment: '{comment}'. "
            f"If reader asks a question, answer question based on highlights from ** 3 most relevant different academic disciplines's perspective**. "
            f"If reader leave a statement, discuss around reader's highlight and comment from ** 3 most relevant different academic disciplines's perspective**. "
            "Each response should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s response introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each response should:"  
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's response introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per response).**  "
            "Provide the response in **raw JSON format only**, with no introductory or concluding text:\n\n"
            "{\n"
            '  "[Perspective Name]": "[Response]",\n'
            '  "[Perspective Name]": "[Response]",\n'
            '  "[Perspective Name]": "[Response]"\n'
            "}"
        )
    else:
        # Extract the disciplines from avatars
        concatenated_disciplines = ", ".join([discipline for _, discipline in avatars])

        instructions = (
          f"The reader highlights '{quote}' in the paper and adds comment: '{comment}'. "
            f"If reader asks a question, answer question based on highlights from ** 3 most relevant different academic disciplines's perspective**. "
            f"If reader leave a statement, discuss around reader's highlight and comment from ** 3 most relevant different academic disciplines's perspective**. "
            f"First generate response from '{concatenated_disciplines}'s perspectives. "
            "Each response should emphasise how it **aligns with or challenges current trends or theories** in that discipline. "
            "Ensure that each discipline’s response introduces fundamentally different insights rather than paraphrasing the same idea in different terminology."
            "Each response should:"  
            "- **Highlight alignment with or challenges to current trends or theories** in that discipline.  "
            "- **Ensure each discipline's response introduces fundamentally different insights**, avoiding rephrasing the same idea.  "
            "- **Be concise (less than 100 words per response).**  "

            "Provide the output as **raw JSON text**, without any surrounding Markdown formatting like triple backticks.\n\n"

            f"Do not split or abbreviate any disciplines. Each discipline in '{concatenated_disciplines}' should be treated as a distinct entity. "
            "If fewer than three disciplines are provided, choose an additional relevant discipline to complete the set of three."

           "{\n"
            '  "[Perspective Name]": "[Response]",\n'
            '  "[Perspective Name]": "[Response]",\n'
            '  "[Perspective Name]": "[Response]"\n'
            "}"
        )
    print(instructions)
    return instructions

# API: /testResponse
# POST
@app.route('/testResponse', methods=['POST'])
def testResponse():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    
    question = data['messages']['question']
    answer = data['messages']['answer']
    agent_perspective = data['messages']['agent_perspective']
    avatars = data['messages']['avatars']
    vector_store_id = data['messages']['vector_store_id']

    print(question)
    instructions = generatePromptOf3MultiAnswers(question, answer, avatars)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Expert",
        instructions = instructions,
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=f"The instructor asks a critical thinking question '{question}' and reader's answer is '{answer}'. "
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        # message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"

def generate_example(section):
    manager = get_manager()
    client = manager.client   
    sections = {
        "Introduction": {
            "Motivation": [
                "Why should we care about this research problem?",
                "Is the motivation of this research clear and strong?",
                "Is the research problem important?",
                "How important is the problem or question that this submission addresses?"
            ],
            "Proposed work": [
                "Is the method of this work novel?"
            ],
            "Findings": [
                "What is the benefit of the findings?"
            ],
            "Contribution": [
                "Why do the contribution and benefit matter?",
                "How can these contributions help you?",
                "Is there an audience at CHI that would find this work influential and/or compelling?",
                "Does it make a novel contribution?",
                "How important / novel is the intended contribution of the paper?",
                "How likely is it that the output of this work will contribute to the identified problem or question?",
                "How greatly can others benefit from this work?",
                "How novel is the contribution?"
            ]
        },
        "Related Work": {
            "Logic/Structure": [
                "Do the authors only list the related works without a clear logic?"
            ],
            "Previous work": [
                "Why are people doing this research?",
                "Are the authors' comments reasonable?",
                "Do the authors' comments on previous works make sense?",
                "Do the related works come from reliable sources? Is prior work adequately reviewed?"
            ],
            "Need for this work": [
                "How well does the paper communicate the work and contribution to its audience (including situating the work in the context of the research literature)?",
                "How clearly does the submission describe how it differs from and goes beyond the most relevant previous work in this area?"
            ]
        },
        "Method": {
            "Purpose": [
                "Does the paper clearly explain what the purpose of each method is?"
            ],
            "Facts": [
                "Are these methods standard or classic?",
                "How appropriate are the chosen methods for the work being undertaken?",
                "Do any claims in the methods seem too certain?",
                "Do the authors clarify enough details for you to understand their methods?",
                "Whether the descriptions of the methods are clearly presented?",
                "Whether the methods are replicable or not?"
            ],
            "Justification": [
                "Whether the justification for methods is properly presented in this paper?",
                "How well are the chosen methods described and justified within the submission?"
            ],
            "Novelty/Strength": [
                "If a new approach/technique/method was introduced in a paper, what are the key elements of the newly proposed approach?",
                "What is the advantage of their method?",
                "What is the advantage over conventional methods?"
            ]
        },
        "Data": {
            "Collection": [
                "Why did the authors choose the data set?",
                "Do the authors justify why they collect the data in this way?",
                "If it is public, is the source reliable?",
                "Are the sources of the data set reliable?",
                "Do they have the right data for the following analyses?",
                "If the data needs labeling, are these labels reliable?"
            ],
            "Characteristics": [
                "Why do the authors use this data set?",
                "What other scenarios can use this type of data?",
                "Is the data set representative to address the research problem?",
                "Whether the data fit the research problem?"
            ],
            "Replicability/Availability": [
                "Do they describe the data clearly?",
                "Is the dataset replicable so that the readers can use it for their own purpose?",
                "Is the description of the data detailed enough for readers to reproduce this work?",
                "If it is collected by the authors, can the readers reproduce it using similar methods?"
            ],
            "Ethical concern": [
                "Are ethical concerns satisfied when the authors collected the data?",
                "Did the authors follow some practices to protect the privacy of the people in the data?"
            ]
        },
        "System / Design": {
            "Requirement/Criteria": [
                "Does the design satisfy the design requirements, if any?"
            ],
            "Idea/Function": [
                "What is the unique part of the system or design"
            ],
            "Design choice": [
                "Why are other design alternatives not appropriate in this context?",
                "How have people come up with this design?",
                "How do the authors argue for their design choices?",
                "Do the authors justify their design choices?",
                "Do you think the design is reasonable?",
                "Are all decisions the authors made supported by some references?",
                "What if the paper referred has also done wrong?",
                "Are you convinced by the arguments for the design choices presented?",
                "Are there specific weaknesses that would undermine confidence in the paper’s claims or results?",
                "Do you think the design is great?"
            ],
            "Reproducibility": [
                "Can we reproduce the system or design?"
            ]
        },
        "Research Question / Hypotheses": {
            "Variables": [
                "Are the independent variables and dependent variables reasonable?"
            ],
            "RQs/Hypos": [
                "Do the authors have clear justifications on their hypotheses or research questions?",
                "Can these research questions answer what the authors want to evaluate?",
                "Are they consistent with your own experience?",
                "Do the research questions or hypotheses make sense?",
                "Are the research questions matched with your motivation?",
                "Whether the research questions have strong connections to motivation?",
                "Are these research questions or hypotheses matched the authors' proposed works in the introduction?"
            ],
            "Clarity": [
                "Are the research questions or hypotheses short and concise? Could it be better written?"
            ]
        },
        "Experiment / Study": {
            "Main study goal": [
                "Why do the authors design the experiments in this way?",
                "Can the study achieve its purpose?"
            ],
            "Design": [
                "Why do the authors choose this type of experiment?",
                "Whether the experiment is designed appropriately to check their research questions?",
                "Is there any smart/impressive design in the experiment?"
            ],
            "Validity": [
                "How appropriate are the design and process of the experiment?",
                "Are there specific weaknesses that would undermine confidence in the paper’s claims or results?",
                "Is the experiment fair for each condition and each participant?"
            ],
            "Clarity/Replicability": [
                "Is the study replicable?",
                "Do the authors present the experiment clearly?"
            ]
        },
        "Participant": {
            "Sample size": [
                "Are the sample size of the users enough for the study?",
                "Are the number of participants sufficient enough for the study?",
                "Whether the sample size of the participants is enough?"
            ],
            "Background/Demographics": [
                "What should other background information of the participants be considered in this study?",
                "Does any background of the participants may affect the results significantly?"
            ],
            "Recruitment": [
                "Do the participants represent all of the people that this paper wants to research?",
                "Are they targeting the proper participants to explore their research questions?"
            ],
            "Validity": [
                "Are the participants representative as targeted users? Do the authors consider any bias, such as racism?"
            ]
        },
        "Task": {
            "Purpose": [
                "Why choose this task?",
                "Is the task appropriate to answer the research questions or hypotheses?"
            ],
            "Design": [
                "Is this task well-designed?",
                "Are there any flaws in this task design?",
                "Is the task reasonable, e.g., in terms of learning effect, workload, etc.?",
                "Is the task natural as the users can do it in their daily life?",
                "Is the task appropriately situated in a real-world context?",
                "Were the tasks used in other papers in similar contexts?"
            ],
            "Clarity/Replicability": [
                "Do the authors clearly explain the task?",
                "Is the description of the task detailed enough for replication?",
                "Can you think of the task scenario based on the description or image of the task, if any?"
            ]
        },
        "Procedure": {
            "Details": [
                "Why are the authors running the procedure in this way?",
                "Do the authors provide justifications for any decision made in the procedure?",
                "Do the authors propose something new in the procedure? If yes, do they have strong justification or references?"
            ],
            "Payment": [
                "Do the participants get reasonable payment for their time?"
            ],
            "Clarity": [
                "Is the procedure clear for you? Does the procedure include any necessary detail?"
            ]
        },
        "Measures": {
            "Purpose": [
                "Why have these measures been chosen specifically for this research?"
            ],
            "Details": [
                "What is the precision of the measures, like how accurate they can capture the intended things that the authors want to evaluate?",
                "Are these measurements able to answer the research questions?",
                "Whether these measurements are appropriate to investigate the research questions?",
                "Whether the measures can reflect the variables properly?"
            ],
            "Validity": [
                "If the paper has subjective measurements, are they standard?",
                "If the paper has biological measures, are they reasonable? For example, how many times have they measured it?",
                "Are the measurements from reliable sources?",
                "Will any factor affect the quality of the measurements, such as the system error?"
            ]
        },
        "Analysis": {
            "Method": [
                "Are the analysis methods, e.g., qualitative or quantitative analysis, suitable in this case?",
                "Do they use the right method to analyze the data? If not, what could be the alternative method?"
            ],
            "Clarity/Replicability": [
                "Are the descriptions of the analyses complete?",
                "Is the description of data analysis clear enough for you? If not, what details should be added?",
                "Is the description detailed enough for you to reproduce it?"
            ]
        },
        "Results": {
            "Findings": [
                "How well are the submission’s claims and conclusions supported by the results? Are these findings surprising?",
                "How confidently can researchers and practitioners use the results?"
            ],
            "Structure/Logic": [
                "Are the results presented correctly?",
                "Do the authors present the results completely, e.g., from both the good side and the bad side?",
                "Whether the subsections of results are closely connected to the research questions?",
                "If it is qualitative, are the results well-organized with users' own thinking? If it is quantitative, are the results presented in a standard way?"
            ],
            "Interpretation": [
                "Is the interpretation of the results reasonable?",
                "Are you convinced by the interpretations presented?"
            ]
        },
        "Implication": {
            "Usefulness": [
                "Do the implications have some impacts on someone out there?",
                "How can this research be generalized?",
                "How can you or other researchers make use of these implications?"
            ],
            "Depth/Insightfulness": [
                "Whether the implications are truly useful?",
                "Is the insight meaningful?",
                "Do the implications match your own experience?",
                "Are the insights here exciting for you?",
                "Do you feel that the implications are novel or have been discussed in other works?",
                "Would the insights be too common?",
                "Are these implications really insightful?",
                "Is there any insight for people who do not prefer the proposed design/system, if any?"
            ]
        },
        "Limitation / Future Work": {
            "Seriousness of limitation": [
                "Would the limitations largely impact the quality of the results?",
                "Are these limitations serious?",
                "Whether that kind of limitation is avoidable or inevitable in this study?",
                "Do these limitations harm the results to an unacceptable extent?",
                "Was the limitation intentional or unintentional?",
                "Are you convinced by the reasons that authors do not address these limitations in this work?"
            ],
            "Completeness/Integrity": [
                "Do the authors honestly discuss their limitations?",
                "Do the authors only mention the trivial limitations but ignore the serious ones?",
                "Are the authors honest in presenting the limitations? Are there other limitations that the authors did not mention?",
                "Whether some other parts of this research are not feasible or not complete?",
                "Think of that you are going to replicate this work, what kinds of new limitations may you encounter?"
            ],
            "Future work": [
                "Is the future work pointed out here insightful?",
                "How can we follow this work by addressing its limitations?",
                "Can we extend this research from the limitations?"
            ]
        },
        "Conclusion": {
            "Logic": [
                "Is the conclusion consistent with the introduction?"
            ],
            "Usefulness": [
                "What are the strengths and weaknesses of the paper?",
                "What is the take-home message of this work?",
                "How is this work useful? Is it useful for your work?",
                "What message can I learn from this paper? What is the main contribution of this work?"
            ]
        }

    }

    if section not in sections:
        return f"No examples available for section: {section}"
    
    
    random_category = random.choice(list(sections[section]))
    return [random_category, sections[section][random_category]] # [category, questions]

# API: /questions
# POST
@app.route('/questions', methods=['POST'])
def generateQuestions():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    matched_section = match_section(text)
    print(text)
    print(matched_section)
    [category, few_shot_questions] = generate_example(matched_section)
    print(category)
   
    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Critical Thinking Questions Generator",
        instructions = (
            f"""
            You are a critical thinking questions generator based on academic paper sections.

            ### **Task**
            1. Read the given section content carefully.
            2. Identify the main topic and the core ideas.
            3. Generate **only one** critical thinking question that is directly relevant to the section and aligned with the assigned category.
            4. Ensure that the question follows the structure and tone of the example questions provided.
            5. Return **only the question** with no extra formatting or explanation.
            6. Ensure the question is:
                - Clear and easy to understand for junior researchers, using simple and precise language.
                - Logically structured and specific, avoiding vague or overly abstract expressions.
                - Thought-provoking and rigorous, encouraging the reader to reflect critically.


            """
        ),
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=f"""
            ### **Input**  
            Section: {text}  
            Category: {category}

            ### **Output**  
              - Question  

            ### **Requirement**
            1. Read the given section content carefully.
            2. Identify the main topic and the core ideas.
            3. Generate **only one** critical thinking question that is directly relevant to the section and aligned with the assigned category.
            4. Ensure that the question follows the structure and tone of the example questions provided.
            5. Return **only the question** with no extra formatting or explanation.
            6. Ensure the question is:
                - Clear and easy to understand for junior researchers, using simple and precise language.
                - Logically structured and specific, avoiding vague or overly abstract expressions.
                - Thought-provoking and rigorous, encouraging the reader to reflect critically.

            ### **Examples**  
            **Input**  
            Section: {text}  
            Category: {category}  

            **Output**  
            {few_shot_questions}
            """
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"

# POST
######
# Ask ciritcal questions to reader's comments
######
@app.route('/commentQuestions', methods=['POST'])
def generateCommentQuestions():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    print(text)
    print(generate_example(text))

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (
        "You are an instructor training junior research students in critical reading skills."
        "Generate a concise critical thinking question for the '{text}'."
        "The critical thinking question should about 'Why' related. Only one question, without 'and' conjunction."
        ),   
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"    
    
# POST
# API: /highlightReinterpret
@app.route('/highlightReinterpret', methods=['POST'])
def generateHighlightReinterpret():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    quote = data['messages']['quote']
    label = data['messages']['label']
    avatars = data['messages']['avatars']
    vector_store_id = data['messages']['vector_store_id']
    # agent_perspective = data['messages']['agent_perspective']
    instructions = generatePromptOfMultiReinterpret(quote,label, avatars)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant",
        instructions=instructions,
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=f"The reader highlighted '{quote}' and labeled the highlight with '{label}'"
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        # message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"    

# POST
# API: /commentAnswers
@app.route('/commentAnswers', methods=['POST'])
def generateCommentAnswers():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    quote = data['messages']['quote']
    comment = data['messages']['comment']
    avatars = data['messages']['avatars']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    instructions = generatePromptOfMultiAnswers(quote,comment, avatars)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant",
        instructions=instructions,
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=f"The reader highlights '{quote}' and leave comment: '{comment}'"
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        # message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"    

# POST
@app.route('/perspQuestions', methods=['POST'])
def generatePerspQuestions():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (
        "You are an instructor training junior research students in critical reading skills."
        "Generate a concise critical question for the Introduction section from personalization perspective."
        "The question should be different from '{text}'."
        ),   
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"

# POST
@app.route('/perspAnswers', methods=['POST'])
def generatePerspAnswers():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (
        "Generaet an asnwer from 'scientifc papers' perpsective, The answer must be within 50 words."
        "The answer should be different from '{text}'."
        ),   
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"
    

# POST
@app.route('/searchQuery', methods=['POST'])
def generateSearchQuery():
    manager = get_manager()
    client = manager.client   
    thread = client.beta.threads.create()

    # Get data from request
    data = request.get_json()
    text = data['messages']['text']
    vector_store_id = data['messages']['vector_store_id']

    # agent_perspective = data['messages']['agent_perspective']
    print(text)

    # if receive assistant id, reuse it
    # if not receive assistant_id, create new one
    assistant_bot_agree = manager.create_assistant(
        name="Research Assistant A",
        instructions = (
        f"Generate a concise search query (max 5 words) from '{text}', without any introductory words."
        ),   
        model="gpt-4o",
        tools=[{"type": "file_search"}],
        vector_store_id=vector_store_id,
        # response_format="text"
    )

    client.beta.threads.messages.create(
        thread.id,
        role="user",
        content=text
    )
    try:
        # Use the create and poll SDK helper to create a run and poll the status of
        # the run until it's in a terminal state.
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id, assistant_id=assistant_bot_agree.id
        )
        # Log the run details
        print("Run ID:", run.id)
        print("Run Status:", run.status)
        print("Run Created At:", run.created_at)
        print("Run Completed At:", run.completed_at)

        # Log if there are any errors with the run
        if hasattr(run, 'error'):
            print("Run Error:", run.error)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
        if not messages:
            return jsonify({"error": "No messages returned from the API"}), 500

        message_content = messages[0].content[0].text
        annotations = message_content.annotations
        citations = []
        for index, annotation in enumerate(annotations):
            message_content.value = message_content.value.replace(annotation.text, f"[{index}]")
            if file_citation := getattr(annotation, "file_citation", None):
                cited_file = client.files.retrieve(file_citation.file_id)
                citations.append(f"[{index}] {cited_file.filename}")

        print('running the message')
        print(message_content.value)
        print("\n".join(citations))
        message_queue.append(text)
        return jsonify({"data": message_content.value}), 200

    except Exception as e:
        return f"An error occurred: {str(e)}"

# Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

# Run the app
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001)