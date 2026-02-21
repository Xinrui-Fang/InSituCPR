import * as React from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";

interface SelectButtonProps {
  noteSelectType: string;
  setNoteSelectType: React.Dispatch<React.SetStateAction<string>>;
}

export const NoteTypeSelectButton: React.FC<SelectButtonProps> = ({
  noteSelectType,
  setNoteSelectType,
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    setNoteSelectType(event.target.value as string);
    console.log(event.target.value);
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
      <InputLabel id="demo-select-small-label">Type</InputLabel>
      <Select
        sx={{ backgroundColor: "white" }}
        labelId="demo-select-small-label"
        id="demo-select-small"
        value={noteSelectType}
        label="Type"
        onChange={handleChange}
      >
        <MenuItem value="-1">All</MenuItem>
        <MenuItem value="0">My Notes</MenuItem>
        <MenuItem value="1">Agent Notes</MenuItem>
      </Select>
    </FormControl>
  );
};
