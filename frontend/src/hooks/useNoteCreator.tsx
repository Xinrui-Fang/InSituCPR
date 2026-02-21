import { useState, useCallback } from "react";
import { Note } from "../types/Interfaces";
import * as React from "react";
import names from "../data/names.json";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";

// 根据 perspective 返回不同的接口地址
function agentHandler(perspective: string) {
  if (perspective === "psychology") {
    return "http://localhost:5001/testResponse";
  } else if (perspective === "orange") {
    return "http://localhost:5001/debate";
  } else {
    return "http://localhost:5001/testResponse";
  }
}

interface UseNoteCreatorProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

function useNoteCreator({ notes, setNotes }: UseNoteCreatorProps) {
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const getRandomName = () => {
    return names[Math.floor(Math.random() * names.length)];
  };
  const randomName = React.useMemo(() => getRandomName(), []);

  const handleNoteCreate = useCallback(
    async (
      id: number,
      perspective?: string,
      user_comment?: string,
      avatars?: [string, string, string][],
    ) => {
      setSelectedNoteId(id);

      let noteId = notes.length;
      const note = notes.find((node) => node.id === id);

      if (!note) {
        console.error("Note not found");
        return;
      }
      let messageText = "";
      // Question Note
      if (note.noteType === 3) {
        messageText = `The instructor ask the critical thinking question: ${note.quote} and reader's answer is: ${user_comment}.`;
      } else {
        messageText = user_comment
          ? `The user highlighted the sentence: ${note.quote} and also provided additional comment: ${user_comment}`
          : `The user highlighted the sentence: ${note.quote} and wrote this comment: ${note.content}`;
      }
      const vectorStoreId = localStorage.getItem("vector_store_id");

      const response = await fetch(agentHandler(perspective || ""), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          messages: {
            // text: messageText,
            question: note.quote,
            answer: user_comment,
            sender: "user",
            agent_perspective: perspective,
            avatars: avatars,
            vector_store_id: vectorStoreId,
          },
        }),
      });
      const result = await response.json();

      const cleanedData = result.data
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");

      const jsonData = JSON.parse(cleanedData);
 

      const newNotes: Note[] = Object.entries(jsonData).map(
        ([key, value], index) => ({
          id: noteId + index + 2, // 递增 ID
          sub_id: id,
          childNote: true,
          perspective: key, // Perspective Name
          content: value.replace(/\[\d+\]/g, ""), // 移除 [数字] 格式
          highlightAreas: [],
          quote: key ?? "New Quote:", // 视角名称作为 quote
          avatar: avatars[index] ? avatars[index][0] : getRandomName(),
          pin: avatars[index] ? true : false,
          noteType: 4, // Check answers type
        }),
      );

      setNotes((prevNotes) => [...prevNotes, ...newNotes]);
    },
    [notes, setNotes],
  );

  return { handleNoteCreate, selectedNoteId };
}

export default useNoteCreator;
