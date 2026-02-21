import { useState, useEffect } from "react";
import { Message, Note } from "../types/Interfaces";
import useNoteCreator from "./useNoteCreator";
import { HighlightArea } from "@react-pdf-viewer/highlight";

const useAppState = () => {
  // 状态管理
  const [sharedState, setSharedState] = useState<Message[]>([
    { text: "Hi, I am Agent S", sender: "S" },
    { text: "Hi, I am Agent C", sender: "C" },
  ]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [avatars, setAvatars] = useState<[string, string, string][]>([]);
  const [noteSelectType, setNoteSelectType] = useState<string>("");
  const [pdfDocument, setPdfDocument] = useState<any>(null); // PdfDocument: Highlight
  const [highlightPlace, setHighlightArea] = useState<
    number | null | undefined
  >(null);
  const [reviewLabel, setReviewLabel] = useState<string>("reviewLabel");

  // Note creation logic from custom hook
  const { handleNoteCreate, selectedNoteId } = useNoteCreator({
    notes,
    setNotes,
  });

  // Side effects
  useEffect(() => {
  }, [selectedNoteId]);

  return {
    avatars,
    setAvatars,
    sharedState,
    setSharedState,
    noteSelectType,
    setNoteSelectType,
    notes,
    setNotes,
    pdfDocument,
    setPdfDocument,
    highlightPlace,
    setHighlightArea,
    handleNoteCreate,
    reviewLabel,
    setReviewLabel,
  };
};

export default useAppState;
