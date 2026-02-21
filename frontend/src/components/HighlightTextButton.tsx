// HighlightTextButton.tsx
import React from "react";
import { Button } from "@react-pdf-viewer/core";
import { HighlightArea } from "@react-pdf-viewer/highlight";
import { renderHighlightsWithText } from "../utils/HighlightUtils";
import { Message, Note } from "../types/Interfaces";
import BasicSwitches from "./BasicSwitches";

interface HighlightTextButtonProps {
  pdfDocument: any; // PDF.js 的 PDFDocumentProxy 类型
  notes: Note[];
  setNotes: (value: React.SetStateAction<Note[]>) => void;
}

const HighlightTextButton: React.FC<HighlightTextButtonProps> = ({
  pdfDocument,
  notes,
  setNotes,
}) => {
  const handleHighlight = () => {
    renderHighlightsWithText(
      "Science builds on the past work of others. Researchers draw from prior work to synthesize existing knowledge,",
      pdfDocument,
      notes,
      setNotes
    );
  };

  return (
    <>
      {/* <Button onClick={handleHighlight}> Generate Highlight</Button> */}
      <BasicSwitches handleHighlight={handleHighlight} />
    </>
  );
};

export default HighlightTextButton;
