import * as React from "react";
import createDefaultLayoutPluginInstance from "./ProactiveHighlight";
import RenderHighlightTarget from "../components/RenderHighlightTarget";
import getBackgroundColor from "../utils/ColorUtils";
import { getHighlightAreasForText } from "../utils/HighlightUtils";
import { processHighlightMainNote } from "../utils/NoteUtils";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import throttle from "lodash/throttle";

import {
  highlightPlugin,
  HighlightArea,
  RenderHighlightContentProps,
  RenderHighlightsProps,
} from "@react-pdf-viewer/highlight";
import {
  Button,
  Position,
  PrimaryButton,
  Viewer,
  Worker,
  SpecialZoomLevel,
} from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import { PDFViewrProps } from "../types/Interfaces";

import { processNewMainNote } from "../utils/NoteUtils";

import useJumpToHighlight from "../hooks/useJumpToHighlight";

import styles from "../App.module.css";
import zIndex from "@mui/material/styles/zIndex";

import callGenerativePerspectiveAPI from "../api/GenerativeQuestionAPI";

import { SectionButtonUtils } from "../utils/SectionButtonUtils";

const PDFViewer: React.FC<PDFViewrProps> = ({
  fileUrl,
  highlightPlace,
  setHighlightArea,
  notes,
  setNotes,
  noteSelectType,
  pdfDocument,
  setPdfDocument,
  setNoteId,
  noteId,
  reviewLabel,
  isGeneratingRef,
}) => {
  // ---------------------------------------------
  // State Management
  // ---------------------------------------------
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();
  // Input message entered by the user
  const [message, setMessage] = React.useState("");

  // Temporary highlight state for managing highlight areas
  const [tempHighlight, setTempHighlight] = React.useState<HighlightArea[]>([]);
  // Track current page
  const [currentPage, setCurrentPage] = React.useState(0);

  const noteIdLength = notes.length;

  const [scrollMarkers, setScrollMarkers] = React.useState<number[]>([]);

  const [responseData, setResponseData] = React.useState<string>("");

  const [sectionData, setSectionData] = React.useState<any>(null);

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  React.useEffect(() => {
    const fetchData = async () => {
      const data = await loadSectionData(selectedPaper);
      setSectionData(data);
    };
    fetchData();
  }, [selectedPaper]);

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

  // Click handleStarBtn to Request the Server
  const handleStarClick = async (note) => {
    try {
      const data = await callGenerativePerspectiveAPI(note.content);
      setResponseData(data);
    } catch (error) {
      console.log("Failed to fetch response.");
    }
  };

  // MouseDown Event, set tempHighlight to blank
  React.useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const commentMenu = document.getElementById("comment-menu");
      if (commentMenu && highlightMenu.contains(event.target as Node)) {
        return;
      }
      setTempHighlight([]);
    };

    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const renderHighlightContent = (props: RenderHighlightContentProps) => {
    // NOTE: create comment note (noteType: 1)
    const addNote = async (e) => {
      if (message !== "") {
        const updatedNotes = processNewMainNote(
          notes,
          noteIdLength,
          message,
          props,
        );
        setNotes(updatedNotes); // Update Note List
        props.cancel(); // Clear props status

        setNoteId(updatedNotes[updatedNotes.length - 1].id);
        // ✅ 上传新添加的 note 到 Firestore
        const lastNote = updatedNotes[updatedNotes.length - 1];
      }
    };

    // ---------------------------------------------
    // UI Elements to Create Highlights and Notes
    // ---------------------------------------------

    return (
      <div
        id="comment-menu" // 添加唯一 ID
        style={{
          background: "#fff",
          border: "1px solid rgba(0, 0, 0, .3)",
          borderRadius: "2px",
          padding: "8px",
          position: "absolute",
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          zIndex: 1,
        }}
      >
        <div>
          <textarea
            rows={3}
            style={{
              border: "1px solid rgba(0, 0, 0, .3)",
            }}
            onChange={(e) => {
              // e.stopPropagation();
              setMessage(e.target.value);
            }}
          ></textarea>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "8px",
          }}
        >
          {/* Add Note */}
          <div style={{ marginRight: "8px" }}>
            <PrimaryButton onClick={addNote}>Add</PrimaryButton>
          </div>

          {/* Cancel Note */}
          <Button
            onClick={() => {
              setTempHighlight([]);
              props.cancel();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Highlight Sentences
  const renderHighlights = (props: RenderHighlightsProps) => {
    return (
      <div>
        {notes
          .filter(
            (note) =>
              noteSelectType === "" ||
              noteSelectType === "-1" ||
              note.noteType === Number(noteSelectType),
          )
          .map((note) => (
            <React.Fragment key={note.id}>
              {note.highlightAreas
                ?.filter((area) => area.pageIndex === props.pageIndex)
                .map((area, idx) => (
                  <div
                    key={idx}
                    style={Object.assign(
                      {},
                      {
                        background: note.label
                          ? getBackgroundColor(note.label)
                          : "rgba(255, 255, 0, 0.4)",
                        zIndex: 1,
                        position: "relative",
                      },
                      props.getCssProperties(area, props.rotation),
                    )}
                    onClick={() => {
                      setNoteId(note.id);
                    }}
                  ></div>
                ))}
            </React.Fragment>
          ))}
        {/* 渲染 Grobid 解析出的按钮 */}
        {
          <SectionButtonUtils
            pdfDocument={pdfDocument}
            pageIndex={props.pageIndex}
            notes={notes}
            setNotes={setNotes}
            setNoteId={setNoteId}
            isGeneratingRef={isGeneratingRef}
          />
        }
        {tempHighlight
          .filter((area) => area.pageIndex === props.pageIndex)
          .map((area, idx) => (
            <div
              key={idx}
              style={Object.assign(
                {},
                {
                  background: "yellow",
                  opacity: 0.4,
                  position: "relative",
                },
                props.getCssProperties(area, props.rotation),
              )}
            ></div>
          ))}
      </div>
    );
  };

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props) => (
      <RenderHighlightTarget
        {...props}
        setTempHighlight={setTempHighlight}
        notes={notes}
        setNotes={setNotes}
        setNoteId={setNoteId}
        pdfDocument={pdfDocument}
        isGeneratingRef={isGeneratingRef}
      />
    ),
    renderHighlightContent,
    renderHighlights,
  });

  // Review this section
  React.useEffect(() => {
    const handleShowHighlightsFromPage1And2 = async () => {
      const allHighlightAreas: HighlightArea[] = [];

      const keyword = notes
        .find((note) => note.id === noteId)
        ?.label.replace(/\s+/g, ",")
        .toLowerCase();

      const index = sectionData.findIndex((line) =>
        line.toLowerCase().includes(keyword),
      );

      const currentSection = index !== -1 ? sectionData[index] : null;
      const nextSection =
        index !== -1 && index + 1 < sectionData.length
          ? sectionData[index + 1]
          : null;

      const currentSectionInfos = currentSection.split(",");
      const currentSectionPageIndex = Number(currentSectionInfos[0]);
      const currentSectionYaxis = parseFloat(currentSectionInfos[2]);

      const nextSectionInfos = nextSection.split(",");
      const nextSectionPageIndex = Number(nextSectionInfos[0]);
      const nextSectionYAxis = parseFloat(nextSectionInfos[2]);
      const nextSectionXaxis = parseFloat(nextSectionInfos[1]);
      const expectedColumn = nextSectionXaxis < 300 ? "left" : "right";

      for (let i = 0; i < highlights.length; i++) {
        const coords = highlights[i]["coords"];
        let currentHighlightAreas: HighlightArea[] = [];
        for (let j = 0; j < coords.length; j++) {
          const coordParameter = coords[j].split(",");
          const pageIndex = Number(coordParameter[0]);
          const coordYaxis = parseFloat(coordParameter[2]);
          const isInPageRange =
            pageIndex >= currentSectionPageIndex &&
            pageIndex <= nextSectionPageIndex;

          const isInYAxisRange =
            (pageIndex === currentSectionPageIndex &&
              coordYaxis >= currentSectionYaxis) ||
            (pageIndex === nextSectionPageIndex &&
              coordYaxis <= nextSectionYAxis) ||
            (pageIndex > currentSectionPageIndex &&
              pageIndex < nextSectionPageIndex);

          const coordXaxis = parseFloat(coordParameter[1]);

          const isInLeftColumn = coordXaxis < 300;
          const isInRightColumn = coordXaxis >= 300;

          const isInExpectedColumn =
            (expectedColumn === "left" && isInLeftColumn) ||
            (expectedColumn === "right" && isInRightColumn) ||
            pageIndex < nextSectionPageIndex;

          // If both conditions are met, add to the highlight areas
          if (isInPageRange && isInYAxisRange && isInExpectedColumn) {
            const areas = await getHighlightAreasForText(
              coords[j],
              pdfDocument,
            );
            currentHighlightAreas.push(...areas);

            allHighlightAreas.push(...areas);
            const noteIdLength = notes.length;
          }
        }

        if (currentHighlightAreas.length > 0) {
          setNotes((prevNotes) => {
            const noteIdLength = prevNotes.length;

            const newNote = processHighlightMainNote(
              prevNotes,
              noteIdLength,
              highlights[i]["content"],
              highlights[i]["tag"],
              currentHighlightAreas,
            );

            const lastNote = newNote[newNote.length - 1];

            return [...prevNotes, lastNote];
          });
        }
      }

      setTempHighlight(allHighlightAreas);
    };

    handleShowHighlightsFromPage1And2();
  }, [reviewLabel, pdfDocument]);

  // const defaultLayoutPluginInstance = createDefaultLayoutPluginInstance();

  // ---------------------------------------------
  // jumpToHighlightArea Function
  // ---------------------------------------------
  const { jumpToHighlightArea } = highlightPluginInstance;

  // useEffect Hook
  useJumpToHighlight(
    highlightPlace,
    setHighlightArea,
    notes,
    setNoteId,
    jumpToHighlightArea,
  );

  return (
    <div className={styles.pdfViewerContainer} ref={viewerRef}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[highlightPluginInstance]} //defaultLayoutPluginInstance
          onDocumentLoad={(e) => {
            setPdfDocument(e.doc);
          }}
          // Capture page change events
          defaultScale={SpecialZoomLevel.PageWidth}
        />
      </Worker>
    </div>
  );
};

export default PDFViewer;
