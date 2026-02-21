const callGenerativePerspQuestionAPI = async (generalQuestion) => {
  try {
    const vectorStoreId = localStorage.getItem("vector_store_id");

    const response = await fetch("http://localhost:5001/perspQuestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        messages: {
          text: generalQuestion,
          sender: "user",
          agent_perspective: null,
          vector_store_id: vectorStoreId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error calling the API:", error);
    throw error;
  }
};

export default callGenerativePerspQuestionAPI;
