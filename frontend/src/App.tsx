import * as React from "react";
import "./App.css";
import PDFViewer from "./viewers/PDFViewer";
import NoteViewer from "./viewers/NoteViewer";
import HighlightTextButton from "./components/HighlightTextButton";
import useAppState from "./hooks/useAppState";
import { useParams } from "react-router-dom";
import styles from "./App.module.css";
import { NoteTypeSelectButton } from "./components/NoteTypeSelectButton";
import HighlightViewer from "./viewers/HighlightViewer";
import PersectiveSelector from "./components/header/PerspectiveSelector";

import { Note } from "./types/Interfaces";

function App() {
  const {
    avatars,
    setAvatars,
    notes,
    setNotes,
    noteSelectType,
    setNoteSelectType,
    pdfDocument,
    setPdfDocument,
    highlightPlace,
    setHighlightArea,
    handleNoteCreate,
    reviewLabel,
    setReviewLabel,
  } = useAppState();

  const { participantId, selectedPaper, apiKey } = useParams<{
    participantId: string;
    selectedPaper: string;
    apiKey: string;
  }>();

  const isGeneratingRef = React.useRef(false);

  const [noteId, setNoteId] = React.useState<number | null>(null); // Type of the state is string

  const noteViewerRef = React.useRef<any>(null);

  const filteredQANotes = notes.filter(
    (note) => note.noteType === 3 || note.childNote,
  );

  const filteredHighlightNotes = notes.filter(
    (note) => note.noteType != 3 || note.childNote,
  );

  const scrollToNote = (noteId: number) => {
    if (noteViewerRef.current) {
      noteViewerRef.current.scrollToNote(noteId);
    }
  };

  // Set vector-store
  React.useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    //   call /api/set-vector-store when mount papge (Refresh)
    const setVectorStore = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/set-vector-store",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ selectedPaper, apiKey: storedKey }),
          },
        );
        if (!response.ok) {
          throw new Error("Failed to get vector store ID");
        }

        const data = await response.json();
        const vectorStoreId = data.vector_store_id;
        // Store localStorage 或 Context（localStorage）
        localStorage.setItem("vector_store_id", vectorStoreId);
      } catch (err) {
        console.error("Failed to set vector store.", err);
      }
    };

    setVectorStore();
  }, [selectedPaper]);

  return (
    <>
      <div
        style={{
          height: "30px",
          width: "100vw",
          backgroundColor: "#f8f8f8",
          position: "fixed",
          zIndex: 1000,
          // boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <PersectiveSelector avatars={avatars} setAvatars={setAvatars} />
        <p
          style={{
            textAlign: "right",
            paddingRight: "20px",
            marginTop: "4px",
          }}
        >
          {" "}
          {participantId}
        </p>
      </div>
      <div className={styles.container}>
        {/* Reactive Reading Area */}
        <div>
          <NoteViewer
            avatars={avatars}
            setAvatars={setAvatars}
            notes={notes}
            filteredNotes={filteredHighlightNotes}
            setNotes={setNotes}
            noteSelectType={noteSelectType}
            setHighlightArea={setHighlightArea}
            handleNoteCreate={handleNoteCreate}
            noteId={noteId}
            setNoteId={setNoteId}
            isGeneratingRef={isGeneratingRef}
          />
        </div>
        {/* Pdf Viewer Area */}
        <div>
          <PDFViewer
            fileUrl={`/${selectedPaper}.pdf`}
            highlightPlace={highlightPlace}
            setHighlightArea={setHighlightArea}
            notes={notes}
            setNotes={setNotes}
            noteSelectType={noteSelectType}
            pdfDocument={pdfDocument}
            setPdfDocument={setPdfDocument}
            setNoteId={setNoteId}
            noteId={noteId}
            reviewLabel={reviewLabel}
            isGeneratingRef={isGeneratingRef}
          />
        </div>
        {/* Q&A Area */}
        <div>
          <NoteViewer
            avatars={avatars}
            setAvatars={setAvatars}
            notes={notes}
            filteredNotes={filteredQANotes}
            setNotes={setNotes}
            noteSelectType={noteSelectType}
            setHighlightArea={setHighlightArea}
            handleNoteCreate={handleNoteCreate}
            noteId={noteId}
            setNoteId={setNoteId}
            reviewLabel={reviewLabel}
            setReviewLabel={setReviewLabel}
            isGeneratingRef={isGeneratingRef}
          />
        </div>
      </div>
    </>
  );
}

export default App;
