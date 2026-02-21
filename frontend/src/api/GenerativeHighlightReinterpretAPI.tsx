const callGenerativeHighlightReinterpretAPI = async (
  quote,
  label,
  avatars?: [string, string][],
) => {
  try {
    const vectorStoreId = localStorage.getItem("vector_store_id");
    const response = await fetch("http://localhost:5001/highlightReinterpret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        messages: {
          quote: quote,
          label: label,
          sender: "user",
          agent_perspective: null,
          avatars: avatars,
          vector_store_id: vectorStoreId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("API2 Response:", result);
    return result.data;
  } catch (error) {
    console.error("Error calling the API:", error);
    throw error;
  }
};

export default callGenerativeHighlightReinterpretAPI;
