import { useEffect } from "react";

const useJumpToHighlight = (
  highlightPlace,
  setHighlightArea,
  notes,
  setNoteId,
  jumpToHighlightArea,
) => {
  useEffect(() => {
    if (highlightPlace) {
      const note = notes.find((note) => note.id === highlightPlace);

      if (note && note.highlightAreas?.length > 0) {
        jumpToHighlightArea(note.highlightAreas[0]);
        setNoteId(note.id);
        setHighlightArea(null);
      } else {
      }
    }
  }, [highlightPlace, notes]);
};

export default useJumpToHighlight;
