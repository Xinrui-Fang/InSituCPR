import callGenerativeHighlightReinterpretAPI from "../api/GenerativeHighlightReinterpretAPI";
import { processNewCommentQuestionNote } from "../utils/NoteUtils";

const handleHighlightLabelBtnClick = async (note: Note, setNotes: any) => {
  try {
    const request =
      "The reader highlight the sentence: " +
      note.quote +
      "and add label: " +
      note.label;
    const data = await callGenerativeHighlightReinterpretAPI(
      note.quote,
      note.label
    );
    const updatedNotes = processNewCommentQuestionNote(notes, note.id, data);
    setNotes(updatedNotes);
  } catch (error) {
    console.log("catch API error");
  }
};

export default handleHighlightLabelBtnClick;
