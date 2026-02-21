import { Avatar, Box, Typography } from "@mui/material";

interface AvatarComponentProps {
  index: number;
  name: string;
  discipline: string;
  color: string;
}

export default function AvatarComponent({
  index,
  name,
  discipline,
  color,
}: AvatarComponentProps) {
  const colorList = ["#4caf50", "#2196f3", "#ff9800"]; // Three avatar color

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center", // Avatar and text align
          // left: "25%",
          // position: "absolute",
          paddingBottom: "10px",
        }}
      >
        <Avatar
          sx={{
            width: 20,
            height: 20,
            m: 1,
            bgcolor: color,
          }}
        >
          {name[0]}
        </Avatar>

        {/* Box for Typography stacked vertically */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {/* Typography - Name */}

          {/* Typography - Quote */}
          <Typography
            variant="body2"
            sx={{
              textAlign: "left",
              fontWeight: "normal",
            }}
          >
            {discipline}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
