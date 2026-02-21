import React, { useState } from "react";
import { Message } from "./viewers/ChatBot"; // Import Message type
import SubmitForm from "./components/SubmitForm";

interface MessageHandlerProps {
  sharedState: Message[];
  setSharedState: (value: React.SetStateAction<Message[]>) => void;
  functionUrl: string;
}

const MessageHandler: React.FC<MessageHandlerProps> = ({
  sharedState,
  setSharedState,
  functionUrl,
}) => {
  const [newInputValue, setNewInputValue] = useState<string>("");

  const newMessage: React.FormEventHandler = async (e) => {
    e.preventDefault();
    setNewInputValue("");

    const newMessages: Message[] = [
      ...sharedState,
      {
        text: newInputValue,
        sender: "user",
      },
    ];

    setSharedState(newMessages);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ messages: newMessages }),
    });

    const result = await response.json();

    setSharedState([
      ...newMessages,
      {
        text: result.data,
        sender: "S",
      },
    ]);
  };

  return (
    <SubmitForm
      onSubmit={newMessage}
      value={newInputValue}
      onChange={(e) => setNewInputValue(e.currentTarget.value)}
    />
  );
};

export default MessageHandler;
