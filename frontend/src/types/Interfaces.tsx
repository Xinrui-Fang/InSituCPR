import { HighlightArea } from "@react-pdf-viewer/highlight";

export type Message = {
  text: string;
  sender: "ai" | "user" | "collaborator" | "S" | "C";
  id?: number | null;
};

export interface PDFViewrProps {
  fileUrl: string;
  highlightPlace: any;
  setHighlightArea: any;
  notes: Note[];
  setNotes: (value: React.SetStateAction<Note[]>) => void;
  pdfDocument: any;
  setPdfDocument: (doc: any) => void;
  noteSelectType: string;
  reviewLabel: string;
  isGeneratingRef: any;
}

export interface Note {
  id: number;
  sub_id?: number; // sub_id points to parent note id
  childNote?: boolean; // if the current note is a child note
  perspective?: string; // perspective of the child note
  content: string; // comment
  highlightAreas?: HighlightArea[];
  quote: string; // highlight content
  label?: string; // highlight content label
  interactionStatus?: number; // 0: inital status
  avatar?: string; // avatar name
  pin: boolean;
  noteType?: number; // 0: Reactive Main Note, 1: Proactive Main Note, 2: Discussion Note
  thumbUpStatus?: boolean;
  thumbDownStatus?: boolean;
}
