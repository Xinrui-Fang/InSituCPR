import { HighlightArea } from "@react-pdf-viewer/highlight";
import callGenerativeHighlightAPI from "../api/GenerativeHighlightAPI";
import callGenerativeCommentAnswerAPI from "../api/GenerativeCommentAnswerAPI";
import callGenerativeHighlightReinterpretAPI from "../api/GenerativeHighlightReinterpretAPI";
import { processNewProactiveNote } from "./NoteUtils";
import { Note } from "../types/Interfaces";
import * as React from "react";
import names from "../data/names.json";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";

// Function to get the content area for a given text
export const getHighlightAreasForText = async (
  coord: any,
  pdfDocument: any,
): Promise<HighlightArea[]> => {
  const areas: HighlightArea[] = [];
  const coordParameter = coord.split(",");

  const pageIndex = Number(coordParameter[0]) - 1;
  const [x, y] = [Number(coordParameter[1]), Number(coordParameter[2])];
  const [sectionWidth, sectionHight] = [
    Number(coordParameter[3]),
    Number(coordParameter[4]),
  ];
  const page = await pdfDocument.getPage(pageIndex + 1); // PDF.js uses 1-based indexing
  const viewport = page.getViewport({ scale: 1 });

  const width = (sectionWidth / viewport.width) * 100;
  const height = (sectionHight / viewport.height) * 100;
  const left = (x / viewport.width) * 100;
  const top = (y / viewport.height) * 100;

  areas.push({
    height,
    left,
    pageIndex,
    top,
    width,
  });

  return areas;
};

// Function to render highlights with text
export const renderHighlightsWithText = async (
  text: string,
  pdfDocument: any,
  notes: Note[],
  setNotes: (value: React.SetStateAction<Note[]>) => void,
): Promise<void> => {
  if (!pdfDocument) {
    console.error("PDF document not loaded");
    return;
  }
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();

  const [highlights, setHighlights] = React.useState(null);

  React.useEffect(() => {
    const loadHighlights = async () => {
      try {
        const module = await import(`../data/highlights_${selectedPaper}.json`);
        setHighlights(module.default);
      } catch (error) {
        console.error("Failed to load highlights:", error);
        setHighlights(null);
      }
    };

    if (selectedPaper) {
      loadHighlights();
    }
  }, [selectedPaper]);

  let noteId = notes.length;

  for (let i = 0; i < highlights.length; i++) {
    const coords = highlights[i]["coords"];
    const highlightAreas: HighlightArea[] = [];
    for (const coord of coords) {
      // Get each page

      const areas = await getHighlightAreasForText(coord, pdfDocument);
      highlightAreas.push(...areas);
    }
    if (highlightAreas.length !== 0) {
      const newNote = processNewProactiveNote(
        notes,
        ++noteId,
        highlights[i]["content"],
        highlightAreas,
        highlights[i]["tag"],
      );
      setNotes((prevNotes) => [...prevNotes, newNote]);
    }
  }
};
const getRandomName = () => {
  return names[Math.floor(Math.random() * names.length)];
};

// FUNCTION: add 3 reinterpretations
export const handleHighlightLabelBtnClick = async (
  note: Note,
  notes: Note[],
  avatars: [string, string][],
  setNotes: (value: React.SetStateAction<Note[]>) => void,
  loadingNoteIds: { [id: number]: boolean },
  setLoadingNoteIds: React.Dispatch<
    React.SetStateAction<{ [id: number]: boolean }>
  >,
  participantId: string,
  selectedPaper: string,
  isGeneratingRef: any,
) => {
  if (loadingNoteIds[note.id]) return;

  if (isGeneratingRef.current) return;

  isGeneratingRef.current = true;

  try {
    let result;
    setLoadingNoteIds((prev) => ({ ...prev, [note.id!]: true }));

    if (note.noteType === 0) {
      result = await callGenerativeCommentAnswerAPI(
        note.quote,
        note.content,
        avatars,
      );
    } else {
      result = await callGenerativeHighlightReinterpretAPI(
        note.quote,
        note.label,
        avatars,
      );
    }



    const cleanedData = result
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "");

    const jsonData = JSON.parse(cleanedData);


    let noteId = notes.length;
    const newNotes: Note[] = Object.entries(jsonData).map(
      ([key, value], index) => ({
        id: noteId + (index + 1),
        sub_id: note.id,
        childNote: true,
        perspective: key, // Perspective Name
        content: value.replace(/\[\d+\]/g, ""),
        highlightAreas: [],
        quote: key ?? "New Quote:",
        pin: avatars[index] ? true : false,
        avatar: avatars[index] ? avatars[index][0] : getRandomName(),
        noteType: 4, // Check answers type
      }),
    );


    setNotes((prevNotes) => [...prevNotes, ...newNotes]);

    setLoadingNoteIds((prev) => {
      const { [note.id!]: _, ...rest } = prev;
      return rest;
    });
  } catch (error) {
    console.log("catch API error");
  } finally {
    isGeneratingRef.current = false;
  }
};
