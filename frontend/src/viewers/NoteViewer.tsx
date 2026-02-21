import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import { Link } from "@mui/material";
import NoteMessage from "../components/NoteMessage";
import callGenerativePerspAnswerAPI from "../api/GenerativePerspAnswerAPI";
import callGenerativeCommentQuestionAPI from "../api/GenerativeCommentQuestionAPI";
import callGenerativeImproveAnswerAPI from "../api/GenerativeImproveAnswerAPI";
import { Note } from "../types/Interfaces";
import { useState } from "react";
import getBackgroundColor from "../utils/ColorUtils";
import CircularProgress from "@mui/material/CircularProgress";
import { useParams } from "react-router-dom";
import { uploadToFirestore } from "../utils/firestoreUtils";

import { handleHighlightLabelBtnClick } from "../utils/HighlightUtils";

import {
  processNewDiscussionNote,
  processNewCommentQuestionNote,
  processRevisedAnswerFeedbackNote,
} from "../utils/NoteUtils";

// Define the props interface
interface ChildComponent1Props {
  avatars: [string, string][];
  setAvatars: (value: React.SetStateAction<[string, string][]>) => void;
  notes: Note[] | undefined;
  filteredNotes: Note[] | undefined;
  setHighlightArea: (
    value: React.SetStateAction<number | null | undefined>,
  ) => void;
  handleNoteCreate: (id: number, color?: string) => void;
  setNotes: (value: React.SetStateAction<Note[]>) => void;
  setNoteId: any;
  noteSelectType: string;
  isGeneratingRef: any;
}
// Component NodePanel
export default function NoteViewer({
  avatars,
  setAvatars,
  notes,
  filteredNotes,
  setNotes,
  setNoteId,
  noteSelectType,
  setHighlightArea,
  handleNoteCreate,
  noteId,
  reviewLabel,
  setReviewLabel,
  isGeneratingRef,
}: ChildComponent1Props) {
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();
  // State to control the visibility of child notes for each sub_id
  const [visibleSubIds, setVisibleSubIds] = useState<number[]>([]);

  // State to store selected color for each note
  const [noteColors, setNoteColors] = useState<{ [id: number]: string }>({});

  const [loadingNoteIds, setLoadingNoteIds] = useState<{
    [id: number]: boolean;
  }>({});

  // FUNCTION: jumpToNote
  const noteEles: Map<number, HTMLElement> = new Map();
  React.useEffect(() => {
    if (noteId) {
      if (noteEles.has(noteId)) {
        noteEles
          .get(noteId)
          .scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [noteId]);

  // Show submit form when create a parent note.
  React.useEffect(() => {
    if (!notes || notes.length === 0) return;

    const latestCreatedParentNode = notes[notes.length - 1];
    if (latestCreatedParentNode.id === latestCreatedParentNode.sub_id) {
      console.log(
        "Detected new note with id = sub_id:",
        latestCreatedParentNode.id,
      );
      toggleSubIdVisibility(latestCreatedParentNode.id);
      if (latestCreatedParentNode.noteType === 6) {
        console.log("User highlights");
      }
    }
  }, [notes]);

  // FUNCTION: show thread
  // Function to toggle visibility of child notes by sub_id
  const toggleSubIdVisibility = (subId: number) => {
    setVisibleSubIds((prev) => {
      const isCurrentlyVisible = prev.includes(subId);
      const subIdNoteType = notes.find((note) => note.id === subId)?.noteType;

      if (isCurrentlyVisible) {
        return prev.filter((id) => id !== subId);
      } else if (subIdNoteType === 3) {
        return [
          ...prev.filter((id) => {
            const note = notes.find((note) => note.id === id);
            return note?.noteType !== 3;
          }),
          subId,
        ];
      } else {
        return [...prev, subId];
      }
    });
    const parentNote = notes?.find((note) => note.id === subId);
    if (parentNote && parentNote.noteType != 3) {
      setNoteId(subId);
    }
  };

  const [discussionTexts, setDiscussionTexts] = useState<{
    [id: number]: string;
  }>({});

  // Handle Response Form Input Field
  const handleInputChange = (note_id: number, text: string) => {
    setDiscussionTexts((prev) => ({
      ...prev,
      [note_id]: text,
    }));
  };

  const handleHighlightClick = (note) => {
    console.log(isGeneratingRef);
    handleHighlightLabelBtnClick(
      note,
      notes,
      avatars,
      setNotes,
      loadingNoteIds,
      setLoadingNoteIds,
      participantId,
      selectedPaper,
      isGeneratingRef,
    );
  };

  // Handle Response Form Submit Button
  // 1.Create Discussion Note once click 'Submit' button
  // 2.Automatically Generate three answers response Note below discusion note.
  const handleInputSubmit = async (parentNoteId: number | null) => {
    const text = parentNoteId ? discussionTexts[parentNoteId] || "" : "";
    if (text.trim()) {
      const updatedNotes = processNewDiscussionNote(notes, parentNoteId, text);
      setNotes(updatedNotes);
      console.log(updatedNotes);

      setDiscussionTexts((prev) => ({
        ...prev,
        [parentNoteId!]: "",
      }));

      const newNote = updatedNotes[updatedNotes.length - 1];

      if (
        notes?.some(
          (note) => note.id === parentNoteId && note.interactionStatus === 0,
        )
      ) {
        console.log(isGeneratingRef);
        if (isGeneratingRef.current) return;

        isGeneratingRef.current = true;
        // Loading status
        setLoadingNoteIds((prev) => ({ ...prev, [parentNoteId!]: true }));
        // Generate feedbacks from 3 perspectives
        await handleNoteCreate(parentNoteId, "Check the answer", text, avatars);
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === parentNoteId ? { ...note, interactionStatus: 1 } : note,
          ),
        );

        console.log(notes);

        // finsih loading status
        setLoadingNoteIds((prev) => {
          const { [parentNoteId!]: _, ...rest } = prev;
          return rest;
        });

        isGeneratingRef.current = false;
      }

      // Q&A Interaction
      // When user submit revised answer
      // Update the interactionStatus 1 -> 2
      if (
        notes?.some(
          (note) => note.id === parentNoteId && note.interactionStatus === 1,
        )
      ) {
        const filteredNotes = updatedNotes.filter(
          (note) => note.noteType === 2 && note.sub_id === parentNoteId,
        );

        const agreeNotes = updatedNotes.filter(
          (note) =>
            note.noteType === 4 &&
            note.sub_id === parentNoteId &&
            note.thumbDownStatus != true,
        );
        const agreeText = agreeNotes.map((note) => note.content).join("\n");
        console.log(agreeText);

        try {
          // Loading status
          setLoadingNoteIds((prev) => ({ ...prev, [parentNoteId!]: true }));
          const response = await callGenerativeImproveAnswerAPI(
            filteredNotes[0].content,
            filteredNotes[1].content,
            agreeText,
          );
          console.log("API Response:", response);

          const updatedFeedbackNotes = processRevisedAnswerFeedbackNote(
            notes,
            parentNoteId,
            response,
          );
          console.log(updatedFeedbackNotes);
          setNotes((prevNotes) => [...prevNotes, updatedFeedbackNotes]);

          setNotes((prevNotes) =>
            prevNotes.map((note) =>
              note.id === parentNoteId
                ? { ...note, interactionStatus: 2 }
                : note,
            ),
          );

          // finsih loading status
          setLoadingNoteIds((prev) => {
            const { [parentNoteId!]: _, ...rest } = prev;
            return rest;
          });
        } catch (error) {
          console.error("Error calling API:", error);
        }
      }
      if (
        notes?.some(
          (note) => note.id === parentNoteId && note.interactionStatus === 2,
        )
      ) {
        setNotes((prevNotes) =>
          prevNotes.map((note) => {
            return { ...note, interactionStatus: 3 };
          }),
        );
      }

      // Comment Interaction
      // Update the interactionStatus 11 -> 12
      if (
        notes?.some(
          (note) => note.id === parentNoteId && note.interactionStatus === 11,
        )
      ) {
        if (isGeneratingRef.current) return;

        isGeneratingRef.current = true;
        await handleNoteCreate(parentNoteId, "Check the answer", text, avatars);
        setNotes((prevNotes) =>
          prevNotes.map((note) => {
            return { ...note, interactionStatus: 12 };
          }),
        );
        isGeneratingRef.current = false;
      }

      // Comment Interaction
      // Update the interactionStatus 12 -> 13
      if (
        notes?.some(
          (note) => note.id === parentNoteId && note.interactionStatus === 12,
        )
      ) {
        setNotes((prevNotes) =>
          prevNotes.map((note) => {
            return { ...note, interactionStatus: 13 };
          }),
        );
      }
    }
  };

  // Generate question for user's comment
  const handleCommentQuestionNoteCreate = async (note: Note) => {
    try {
      const request =
        "The reader highlight the sentence: " +
        note.quote +
        "and add comments: " +
        note.content;
      const data = await callGenerativeCommentQuestionAPI(request);
      // setResponseData(data);
      const updatedNotes = processNewCommentQuestionNote(notes, note.id, data);
      setNotes(updatedNotes);

      // Update interactionStatus to 11 for the specific note
      const finalUpdatedNotes = updatedNotes.map((updatedNote) => {
        if (updatedNote.id === note.id) {
          return { ...updatedNote, interactionStatus: 11 };
        }
        return updatedNote;
      });

      setNotes(finalUpdatedNotes);
      console.log(data);
    } catch (error) {
      console.log("Failed to fetch response.");
    }
    // setQuote(getRandomQuote()); // Update the quote with a new random one
  };

  // Custom handleNoteCreate handler that also sets the selected color for the note
  const handleButtonClick = (id: number, color?: string) => {
    handleNoteCreate(id, color);
    // Show child notes after click icons
    setVisibleSubIds((prev) => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }

      return prev;
    });
  };

  return (
    <div
      style={{
        width: "20vw",
        height: "100vh",
        // boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        borderRadius: "0px",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        // scrollbarWidth: "none", // For Firefox
        // msOverflowStyle: "none", // For Internet Explorer/Edge
      }}
    >
      {notes?.length === 0 && <></>}

      {/* Rnder the notes */}
      {filteredNotes
        ?.filter((note) => !note.childNote) // Filter to display only parent notes
        .filter(
          (note) =>
            noteSelectType === "" ||
            noteSelectType === "-1" ||
            note.noteType === Number(noteSelectType),
        )
        .sort((a, b) => {
          if (a.sub_id === b.sub_id) {
            // if sub_ids are same，sort by id
            return a.id - b.id;
          } else {
            // if sub_ids different，sort by sub_id
            return a.sub_id - b.sub_id;
          }
        })
        .map(
          (
            note, // map the parent note
          ) => (
            <Box
              // Generate the unique key
              key={`${note.id}-${note.sub_id ?? 0}`}
              // Click Highlight area -> jump to the note
              ref={(ref): void => {
                // Update the map
                noteEles.set(note.id, ref as HTMLElement);
              }}
              // Styles
              sx={{
                minWidth: "10vw",
                maxWidth: "20vw",
                mb: 3,
              }}
              onClick={() => {
                // Click the note -> jump to highlight area on the PDF
                setHighlightArea(note.id);
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  marginLeft: "10px",
                  marginRight: "10px",
                  marginTop: note.childNote ? "-30px" : "2px",
                  marginBottom: "-20px",
                  borderColor:
                    note.id === noteId
                      ? getBackgroundColor(note.label)
                      : "null",
                  borderStyle: "dashed",
                  borderWidth: "2.5px",
                }}
              >
                {/* UI: Parent NoteMessage */}
                <NoteMessage
                  note={note}
                  noteId={noteId}
                  handleCommentQuestionNoteCreate={
                    handleCommentQuestionNoteCreate
                  }
                  onHighlightLabelBtnClick={handleHighlightClick}
                  onButtonClick={handleButtonClick}
                  selectedColor={noteColors[note.id]} // Pass selected color to NoteMessage [NOT Implemented Yet]
                  loadingNoteIds={loadingNoteIds}
                  notes={notes}
                  setNotes={setNotes}
                  isGeneratingRef={isGeneratingRef}
                />

                {/* Hide or Show Child Notes Button */}
                <Button
                  sx={{ marginBottom: "5px" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSubIdVisibility(note.id);
                    console.log(note);
                  }}
                  size="small"
                >
                  {(note.noteType === 3 ||
                    notes.some(
                      (n) =>
                        n.childNote === true &&
                        n.sub_id === note.id &&
                        n.noteType !== 3,
                    )) &&
                    (visibleSubIds.includes(note.id)
                      ? "Hide Thread"
                      : "Show Thread")}
                </Button>

                {/* UI: Children NoteMessage */}
                {/* Conditionally render the CHILD NOTES based on visibility state */}
                {visibleSubIds.includes(note.id) &&
                  notes
                    ?.filter(
                      (childNote) =>
                        childNote.sub_id === note.id && childNote.childNote,
                    )
                    .map((childNote, index, filteredNotes) => (
                      <Card
                        key={`${childNote.id}-${childNote.sub_id ?? 0}`}
                        variant="outlined"
                        sx={{ margin: "10px" }} // option: marginLeft
                      >
                        {/*Child Notes */}
                        <NoteMessage
                          note={childNote}
                          index={
                            [0, 6].includes(note.noteType) ? index + 1 : index
                          }
                          avatars={avatars}
                          setAvatars={setAvatars}
                          onButtonClick={handleButtonClick}
                          selectedColor={noteColors[childNote.id]} // Pass selected color to child notes
                          parentNoteType={note.noteType}
                          loadingNoteIds={loadingNoteIds}
                          notes={notes}
                          setNotes={setNotes}
                          isGeneratingRef={isGeneratingRef}
                        />
                      </Card>
                    ))}

                {/* Render response field and Submit button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    // minHeight: 40,
                  }}
                >
                  {loadingNoteIds[note.id] ? (
                    <CircularProgress size={24} />
                  ) : null}
                </div>
                {note.noteType != 6 &&
                  note.noteType !== 0 &&
                  !loadingNoteIds[note.id] &&
                  visibleSubIds.includes(note.id) && (
                    <Box
                      sx={{
                        padding: "16px",
                        backgroundColor: "#f9f9f9",
                        borderRadius: "8px",
                        mt: 2,
                      }}
                    >
                      {/* UI: TextInputField */}
                      {note.noteType != 6 && note.noteType !== 0 && (
                        <>
                          {" "}
                          <Typography variant="body2" sx={{ marginBottom: 2 }}>
                            {note.interactionStatus === 1 ? (
                              "Refine your answer by incorporating insights from the perspectives above:"
                            ) : note.interactionStatus === 2 ||
                              note.interactionStatus === 13 ? (
                              <>
                                Great, let's start the next section or{" "}
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => {
                                    // TODO: Add your handler logic here
                                    setReviewLabel(note.label);
                                    setNoteId(note.id);
                                    console.log(reviewLabel);
                                  }}
                                >
                                  review this section
                                </Button>
                              </>
                            ) : note.interactionStatus === 3 ? (
                              "Good, let's read the next section"
                            ) : note.interactionStatus === 11 ? (
                              "Try to answer this critical question"
                            ) : note.interactionStatus === 12 ? (
                              "Improve your answer from the above perspectives"
                            ) : note.interactionStatus === 13 ? (
                              "Good, consider answering the question from a new perspective"
                            ) : null}
                          </Typography>
                          {/* Response Form TextField */}
                          {note.interactionStatus != 2 && (
                            <>
                              <TextField
                                fullWidth
                                variant="outlined"
                                label="Add a response"
                                placeholder={
                                  // Place holder is previous answers when users are asked to answer the questions
                                  (note.interactionStatus === 1 &&
                                    notes.find(
                                      (n) =>
                                        n.sub_id === note.id &&
                                        n.noteType === 2,
                                    )?.content) ||
                                  ""
                                }
                                // placeholder={}
                                multiline
                                rows={2}
                                sx={{ mt: 1 }}
                                value={discussionTexts[note.id]}
                                onChange={(e) => {
                                  handleInputChange(note.id, e.target.value);
                                }} // Handle input change
                                onClick={(event) => {
                                  event.stopPropagation();
                                }}
                              />
                              {/* Response Form Submit Button */}
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleInputSubmit(note.id);
                                }}
                                sx={{ mt: 2 }}
                              >
                                Submit
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </Box>
                  )}
              </Card>
            </Box>
          ),
        )}
    </div>
  );
}
