import * as React from "react";
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";

// Define the type for props
interface InputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const SubmitForm: React.FC<InputProps> = (props) => {
  return (
    <Paper
      component="form"
      onSubmit={props.onSubmit}
      sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: 400 }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        type="text"
        placeholder="Enter Your Message"
        inputProps={{ "aria-label": "search google maps" }}
        value={props.value}
        onChange={props.onChange}
      />
      <IconButton type="button" sx={{ p: "10px" }} aria-label="search">
        {/* <SearchIcon /> */}
      </IconButton>
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton
        type="submit"
        color="primary"
        sx={{ p: "10px" }}
        aria-label="directions"
      >
        <SendIcon sx={{ color: "grey" }} />
      </IconButton>
    </Paper>
  );
};

export default SubmitForm;
