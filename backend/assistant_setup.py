from openai import OpenAI

class ResearchAssistantManager:
    def __init__(self, client):
        """
        Initialize the ResearchAssistantManager.

        :param client: An instance of the OpenAI client
        """
        self.client = client

    def create_assistant(self, name, instructions, model, tools, vector_store_id=None):
        """
        Create an Assistant and optionally attach a vector store
        to its file_search tool resources.

        :param name: Name of the assistant
        :param instructions: Instruction set defining the assistant's behavior
        :param model: Model name to be used by the assistant
        :param tools: List of tools available to the assistant
        :param vector_store_id: Optional vector store ID for file search
        :return: The created (and possibly updated) Assistant object
        """
        # Create the Assistant
        assistant = self.client.beta.assistants.create(
            name=name,
            instructions=instructions,
            model=model,
            tools=tools,
        )

        # If a vector_store_id is provided, attach it to the assistant's tool resources
        if vector_store_id:
            assistant = self.client.beta.assistants.update(
                assistant_id=assistant.id,
                tool_resources={"file_search": {"vector_store_ids": [vector_store_id]}},
            )

        return assistant