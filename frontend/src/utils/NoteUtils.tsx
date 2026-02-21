import perspectives from "../data/perspectives.json";
import { Note } from "../types/Interfaces";

export { perspectives };

// utils/generate random perspectives

export function getRandomPerspectives(labels: string[], count: number) {
  const shuffled = [...labels].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// noteType: 0
// Highlight and add comment by the user
// new main note
export function processNewMainNote(
  notes: Note[],
  noteId: number,
  message: string,
  props: any,
) {
  const newNote: Note = {
    id: ++noteId,
    sub_id: noteId,
    content: message,
    highlightAreas: props.highlightAreas,
    quote: props.selectedText,
    interactionStatus: 0,
    noteType: 0, // 0: Reactive Main Note, Comment Note
  };

  return notes.concat([newNote]);
}

// noteType: 1
// Proactively Highlight and add comment by the system
export function processNewProactiveNote(
  notes: Note[],
  noteId: number,
  message: string,
  highlightAreas: any,
  quote: string,
) {
  const newNote: Note = {
    id: noteId,
    sub_id: noteId,
    content: message,
    highlightAreas: highlightAreas,
    quote: quote,
    noteType: 1, // 1: Proactive Main Note
  };
  return newNote;
}

// new discussion note
export function processNewDiscussionNote(
  notes: Note[],
  parentNoteId: number,
  discussionText: string,
) {
  if (!discussionText.trim()) return notes;

  const newNote: Note = {
    id: notes.length + 1,
    sub_id: parentNoteId,
    childNote: true,
    content: discussionText,
    highlightAreas: [],
    quote: "Your Answer",
    noteType: 2, // 2: Discussion Note
  };
  return [...notes, newNote];
}

export function processNewQANote(
  notes: Note[],
  noteId: number,
  message: string,
  highlightAreas: any,
  quote: string,
  label: string,
) {
  const newNote: Note = {
    id: noteId,
    sub_id: noteId,
    content: message,
    highlightAreas: highlightAreas,
    quote: quote,
    label: label,
    interactionStatus: 0, // initial status
    noteType: 3, // 3: Question Note
  };
  return newNote;
}

// noteType: 4
// Generate responses in 3 perspectives for users to check
export function processNewCheckNote(
  notes: Note[],
  noteId: number,
  message: string,
  highlightAreas: any,
  quote: string,
) {
  const newNote: Note = {
    id: noteId,
    sub_id: noteId,
    content: message,
    highlightAreas: highlightAreas,
    quote: quote,
    noteType: 4, // 3: Question Note
  };
  return newNote;
}

// noteType: 5
// Generate critical question for user's comment
export function processNewCommentQuestionNote(
  notes: Note[],
  parentNoteId: number,
  discussionText: string,
) {
  if (!discussionText.trim()) return notes;

  const newNote: Note = {
    id: notes.length + 1,
    sub_id: parentNoteId,
    childNote: true,
    content: discussionText,
    highlightAreas: [],
    quote: "Reinterpret",
    noteType: 5, // 2: CommentQuestion Note
  };
  return [...notes, newNote];
}

// noteType: 0
// Highlight and add comment by the user
// new main note
export function processHighlightMainNote(
  notes: Note[],
  noteId: number,
  message: string,
  label: string,
  highlightAreas: any,
) {
  const newNote: Note = {
    id: ++noteId,
    sub_id: noteId,
    content: "",
    highlightAreas: highlightAreas,
    quote: message,
    interactionStatus: 0,
    label: label,
    noteType: 6, // 0: Highlight note
  };

  return notes.concat([newNote]);
}

// noteType: 7
// Evaluate user's revised answer and give feedback
export function processRevisedAnswerFeedbackNote(
  notes: Note[],
  parentNoteId: number,
  message: string,
) {
  const newNote: Note = {
    id: notes.length + 2, // Because the notes state update delay.
    sub_id: parentNoteId,
    childNote: true,
    content: message,
    highlightAreas: [],
    quote: "Overall Feedback",
    noteType: 7, // 7: feedback note
  };
  return newNote;
}
