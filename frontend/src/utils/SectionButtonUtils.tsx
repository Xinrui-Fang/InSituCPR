import React, { useEffect, useState, useRef } from "react";
import { processNewQANote } from "./NoteUtils";
import callGenerativeQuestionAPI from "../api/GenerativeQuestionAPI";
import QuizIcon from "@mui/icons-material/Quiz";
import { Button } from "@mui/material";
import getBackgroundColor from "./ColorUtils";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

export const SectionButtonUtils: React.FC<{
  pdfDocument: any;
  pageIndex: number;
  notes: Note[];
  setNotes: (value: React.SetStateAction<Note[]>) => void;
  setNoteId;
  isGeneratingRef: any;
}> = ({
  pdfDocument,
  pageIndex,
  notes,
  setNotes,
  setNoteId,
  isGeneratingRef,
}) => {
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);

  const [viewport, setViewport] = useState<any | null>(null);

  const [clickedLabels, setClickedLabels] = useState<string[]>([]);

  const [sectionData, setSectionData] = React.useState<any>(null);

  let noteId = notes.length;

  React.useEffect(() => {
    const fetchData = async () => {
      const data = await loadSectionData(selectedPaper);
 
      setSectionData(data);
    };
    fetchData();
  }, [selectedPaper]);

  const loadSectionData = async (selectedPaper: string) => {
    try {
      const module = await import(`../data/sections_${selectedPaper}.json`);
      return module.default;
    } catch (error) {
      console.error("Error loading JSON:", error);
      // fallback to a default
      const fallback = await import(`../data/sections_Paper_2.json`);
      return fallback.default;
    }
  };

  const handleGenerateCriticalQuestionBtn = async (label: string) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    setIsGenerating(true);
    setGeneratingLabel(label);
    try {
      const data = await callGenerativeQuestionAPI(label);

      const newNote = processNewQANote(
        notes,
        ++noteId,
        "", // content
        null, // Highlight Area
        data, // quote
        label,
      );
      setNotes((prevNotes) => [...prevNotes, newNote]);

      // Upload QA note to the database
    } catch (error) {
      console.log("Failed to fetch response.");
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setGeneratingLabel(null);
    }
  };

  useEffect(() => {
    if (!pdfDocument) {
      console.error("PDF document not loaded");
      return;
    }

    const fetchViewport = async () => {
      try {
        const page = await pdfDocument.getPage(pageIndex + 1); // pageIndex 需要 +1，因为 PDF.js 以 1 为基准
        const viewport = page.getViewport({ scale: 1 });
        setViewport(viewport);
      } catch (error) {
        console.error("Error fetching PDF page:", error);
      }
    };

    fetchViewport();
  }, [pdfDocument, pageIndex]);

  if (!viewport) {
    return null;
  }

  return (
    <>
      {sectionData
        .filter((line) => parseInt(line.split(",")[0], 10) === pageIndex + 1)
        .map((line, index) => {
          const parts = line.split(",");
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const width = parseFloat(parts[3]);
          const height = parseFloat(parts[4]);

          const firstTextIndex = parts.findIndex((p) => isNaN(parseFloat(p)));

          const section = parts.slice(firstTextIndex).join(" ");

          const label = section.replace(/\s+\d+\.\d+.*$/, "");

          return label === generatingLabel ? (
            <CircularProgress
              size={20}
              style={{
                position: "absolute",
                left: `${((x + width) / viewport.width) * 100 + 1}%`,
                top: `${((y - height) / viewport.height) * 100 + 0.9}%`,
                zIndex: 10,
              }}
            />
          ) : (
            <QuizIcon
              style={{
                position: "absolute",
                color:
                  notes.some((note) => note.label === label) ||
                  clickedLabels.includes(label)
                    ? "green"
                    : "darkred",
                left: `${((x + width) / viewport.width) * 100 + 1}%`,
                top: `${((y - height) / viewport.height) * 100 + 0.9}%`,
                marginLeft: "5px",
                zIndex: 10,
                cursor: "pointer",
              }}
              onClick={() => {
                if (isGeneratingRef.current) return;

                if (
                  !notes.some((note) => note.label === label) &&
                  !clickedLabels.includes(label)
                ) {
                  setClickedLabels((prev) => [...prev, label]);

                  handleGenerateCriticalQuestionBtn(label);
                }
              }}
            />
          );
        })}
      {notes
        .filter(
          (note) =>
            note.highlightAreas &&
            note.highlightAreas.length != 0 &&
            note.highlightAreas[0]["pageIndex"] === pageIndex,
        )
        .map((note, index) => {
          const top = note.highlightAreas[0]["top"];
          const left = note.highlightAreas[0]["left"];
          const width = note.highlightAreas[0]["width"];
          const height = note.highlightAreas[0]["height"];

          return (
            <Button
              variant="contained"
              size="small"
              style={{
                fontSize: "11px",
                color: note.label ? "white" : "black",
                position: "absolute",
                // left: `-1%`,
                left: left > 50 ? `93%` : `-1%`,
                top: `${top}%`,
                height: "20px",
                width: "6px",

                // height: `30px`,
                zIndex: 10,
                cursor: "pointer",
                background: getBackgroundColor(note.label),
              }}
              onClick={() => {
                setNoteId(note.id);
              }}

              // onClick={() => handleGenerateCriticalQuestionBtn(label)}
            >
              {note.label ? note.label : "Comment"}
            </Button>
          );
        })}
    </>
  );
};
