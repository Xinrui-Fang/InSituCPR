import * as React from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import { Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material/styles";

const DemoPaper = styled(Paper)(({ theme }) => ({
  width: 250,
  //   maxWidth: 300,
  //   height: 120,
  padding: theme.spacing(2),
  borderRadius: 10,
  ...theme.typography.body2,
  textAlign: "left",
  marginBottom: "30px",
}));

interface ChatBoxProps {
  text: string;
  sender: string;
}

const ChatBox: React.FC<ChatBoxProps> = (props) => {
  return (
    <div style={{ position: "relative", marginLeft: "50px" }}>
      <DemoPaper>
        <Stack direction="column" spacing={0.5} sx={{ alignItems: "left" }}>
          <Typography sx={{}}>{props.text}</Typography>
        </Stack>
      </DemoPaper>
      <Avatar
        sx={{
          position: "absolute",
          bottom: "35px", // Adjust this value as needed
          left: props.sender !== "user" ? "-45px" : "auto", // Adjust this value as needed
          right: props.sender === "user" ? "-45px" : "auto",
        }}
      >
        {props.sender}
      </Avatar>
    </div>
  );
};

export default ChatBox;
