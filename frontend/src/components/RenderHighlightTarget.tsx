import React, { useState, useEffect } from "react";
import { Button, Tooltip, Position } from "@react-pdf-viewer/core";
import {
  RenderHighlightTargetProps,
  MessageIcon,
} from "@react-pdf-viewer/highlight";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import { processHighlightMainNote } from "../utils/NoteUtils";
import { Note } from "../types/Interfaces";
import { getHighlightAreasForText } from "../utils/HighlightUtils";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { HighlightArea } from "@react-pdf-viewer/highlight";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";

interface RenderHighlightTargetPropsExtended extends RenderHighlightTargetProps {
  setTempHighlight: React.Dispatch<React.SetStateAction<any[]>>;
  notes: Note[];
  setNotes: (value: React.SetStateAction<Note[]>) => void;
  setNoteId: any;
  pdfDocument: any;
  isGeneratingRef: any;
}

const RenderHighlightTarget: React.FC<RenderHighlightTargetPropsExtended> = ({
  selectionRegion,
  highlightAreas,
  selectedText,
  toggle,
  cancel,
  setTempHighlight,
  notes,
  setNotes,
  setNoteId,
  pdfDocument,
  isGeneratingRef,
}) => {
  if (isGeneratingRef.current) return; // 禁止重复触发
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();
  const [showBox, setShowBox] = useState(false);
  const [matchFlag, setMatchFlag] = useState(false);
  const [proactiveHighlightArea, setProactiveHighlightArea] = useState<
    HighlightArea[]
  >([]);
  const [proactiveHighlightText, setProactiveHighlightText] =
    useState<string>("");
  const [proactiveHighlightLabel, setProactiveHighlightLabel] =
    useState<string>("");

  const [highlights, setHighlights] = useState(null);

  // set highlights
  useEffect(() => {
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

  // NOTE: create highlight note (noteType: 6)
  // setNotes,setNoteId

  const handleHighlightTagBtnClick = async (label: string) => {
    const noteIdLength = notes.length;

    const updatedNoets = processHighlightMainNote(
      notes,
      noteIdLength,
      selectedText,
      label,
      highlightAreas,
    );
    setNotes(updatedNoets); // Update Note List

    setTempHighlight([]);
    cancel();

    const newNote = updatedNoets[updatedNoets.length - 1];
    setNoteId(newNote.id);
  };

  // Create a note for highlight text
  const handleExploreBtnClick = async (
    proactiveHighlightArea: HighlightArea[],
    proactiveHighlighttext: string,
    proactiveHighlightLabel: string,
  ) => {
    const noteIdLength = notes.length;

    const updatedNoets = processHighlightMainNote(
      notes,
      noteIdLength,
      proactiveHighlighttext,
      proactiveHighlightLabel,
      proactiveHighlightArea,
    );
    setNotes(updatedNoets); // Update Note List
    const newNote = updatedNoets[updatedNoets.length - 1];

    setTempHighlight([]);
    cancel();
  };

  // Select Proactive Hihlight Sentneces
  useEffect(() => {
    const fetchPageData = async () => {
      let foundMatch = false;
      const allHighlightAreas: HighlightArea[] = [];

      const module = await import(`../data/highlights_${selectedPaper}.json`);
      let highlights = module.default;
      for (let i = 0; i < highlights.length; i++) {
        const coords = highlights[i]["coords"];
        for (let j = 0; j < coords.length; j++) {
          const coordParameter = coords[j].split(",");
          const page = await pdfDocument.getPage(Number(coordParameter[0]));

          if (Number(coordParameter[0]) - 1 !== selectionRegion.pageIndex) {
            continue;
          }

          const viewport = page.getViewport({ scale: 1 });
          const [x, y] = [Number(coordParameter[1]), Number(coordParameter[2])]; // x: left, y: top
          const [sectionWidth, sectionHeight] = [
            Number(coordParameter[3]),
            Number(coordParameter[4]),
          ];
          const left = (x / viewport.width) * 100;
          const top = (y / viewport.height) * 100;
          const width = (sectionWidth / viewport.width) * 100;
          const height = (sectionHeight / viewport.height) * 100;

          // Match the height of the sentence
          if (Math.abs(selectionRegion.top + height - top) < 1) {
            if (
              selectionRegion.left >= left &&
              selectionRegion.left <= left + width
            ) {
              foundMatch = true;

              for (let k = 0; k < coords.length; k++) {
                const areas = await getHighlightAreasForText(
                  coords[k],
                  pdfDocument,
                );
                allHighlightAreas.push(...areas);
              }
              setProactiveHighlightText(highlights[i]["content"]);
              setProactiveHighlightLabel(highlights[i]["tag"]);
              break;
            }
          }
        }
      }

      setMatchFlag(foundMatch);
      // Explore feature.
      if (foundMatch) {
        setTempHighlight(allHighlightAreas);
        setProactiveHighlightArea(allHighlightAreas);
      }
    };

    fetchPageData();
  }, []);

  return (
    <div
      // className="highlight-popup"
      style={{
        background: "#eee",
        display: "flex",
        position: "absolute",
        left: `${selectionRegion.left}%`,
        top: `${selectionRegion.top + selectionRegion.height}%`,
        transform: "translate(0, 8px)",
        zIndex: 100,
        padding: "4px",
        borderRadius: "4px",
        gap: "8px",
      }}
    >
      {/* Select a proactive highlight sentence */}

      {matchFlag && (
        <Tooltip
          position={Position.TopCenter}
          target={
            <Button
              onClick={() => {
                setTempHighlight(highlightAreas);
                handleExploreBtnClick(
                  proactiveHighlightArea,
                  proactiveHighlightText,
                  proactiveHighlightLabel,
                );
                // toggle();
                const selection = window.getSelection();
                if (selection && selection.removeAllRanges) {
                  selection.removeAllRanges();
                }
              }}
            >
              <TipsAndUpdatesIcon />
            </Button>
          }
          content={() => <div style={{ width: "100px" }}>Explore</div>}
          offset={{ left: 0, top: -8 }}
        />
      )}
      {/* Add Note Button */}
      <Tooltip
        position={Position.TopCenter}
        target={
          <Button
            onClick={() => {
              setTempHighlight(highlightAreas);
              toggle();
            }}
          >
            <MessageIcon />
          </Button>
        }
        content={() => <div style={{ width: "100px" }}>Add a note</div>}
        offset={{ left: 0, top: -8 }}
      />

      {/* Highlight Button */}
      <Tooltip
        position={Position.TopCenter}
        target={
          <Button
            onClick={() => {
              setTempHighlight(highlightAreas);
              setShowBox(!showBox);

              const selection = window.getSelection();
              if (selection && selection.removeAllRanges) {
                selection.removeAllRanges();
              }
            }}
          >
            <DriveFileRenameOutlineIcon />
          </Button>
        }
        content={() => <div style={{ width: "80px" }}>Highlight</div>}
        offset={{ left: 0, top: -8 }}
      />

      {/* 弹出框 */}
      {showBox && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "8px",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Button onClick={() => handleHighlightTagBtnClick("Goal")}>
            Goal
          </Button>
          <Button onClick={() => handleHighlightTagBtnClick("Novelty")}>
            Novelty
          </Button>
          <Button onClick={() => handleHighlightTagBtnClick("Method")}>
            Method
          </Button>
          <Button onClick={() => handleHighlightTagBtnClick("Result")}>
            Result
          </Button>
        </div>
      )}
    </div>
  );
};

export default RenderHighlightTarget;
