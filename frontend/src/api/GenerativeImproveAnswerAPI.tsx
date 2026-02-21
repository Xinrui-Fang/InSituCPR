const callGenerativeImproveAnswerAPI = async (
  initialAnswer: string,
  revisedAnswer: string,
  agreeText: string,
) => {
  try {
    const vectorStoreId = localStorage.getItem("vector_store_id");

    const response = await fetch(
      "http://localhost:5001/revisedAnswerFeedback",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          messages: {
            initialAnswer: initialAnswer,
            revisedAnswer: revisedAnswer,
            agreeText: agreeText,
            sender: "user",
            agent_perspective: null,
            vector_store_id: vectorStoreId,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("API Response:", result);
    const cleanedResult = result.data.replace(/\[\d+\]/g, "");
    return cleanedResult;
  } catch (error) {
    console.error("Error calling the API:", error);
    throw error;
  }
};

export default callGenerativeImproveAnswerAPI;
