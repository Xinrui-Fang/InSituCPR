// Function to call Generative Highlight API
const callGenerativeHighlightAPI = async (perspective) => {
  try {
    const vectorStoreId = localStorage.getItem("vector_store_id");

    const response = await fetch("http://localhost:5001/highlights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        messages: {
          text: "Follow the instruction",
          sender: "user",
          agent_perspective: perspective,
          vector_store_id: vectorStoreId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const result = await response.json();
    // Extract text inside " "
    const extractedTexts = result.data
      .match(/["“](.*?)["”]/g)
      .map((match) => match.slice(1, -1));

    const significanceTexts =
      result.data
        .match(/-\s(.*?)(?=\n|$)/g)
        ?.map((match) => match.replace(/-\s/, "")) || [];
    return [extractedTexts, significanceTexts];
  } catch (error) {
    console.error("Error calling Generative Highlight API:", error);
    throw error;
  }
};

export default callGenerativeHighlightAPI;
