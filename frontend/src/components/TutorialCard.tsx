import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { Divider } from "@mui/material";

type Props = {
  title: string;
  description: string;
  img: string;
  bgColor: string;
  reverse?: boolean; // 新增，用于判断是否反转布局
};

export const TurtorialCard = ({
  title,
  description,
  img,
  bgColor,
  reverse = false,
}: Props) => {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: reverse ? "row-reverse" : "row", // 控制图片左右
        background: bgColor,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        height: "500px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "500px",
          textAlign: "left",
          justifyContent: "center",
          margin: "30px",
        }}
      >
        <CardContent sx={{ flex: "1 0 auto" }}>
          <Typography component="div" variant="h5">
            {title}
          </Typography>
          <Divider
            sx={{
              borderBottomWidth: 5,
              borderColor: "primary.main",
              width: "400px",
              my: 1,
            }}
          />
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ color: "text.secondary" }}
          >
            {description}
          </Typography>
        </CardContent>
      </Box>
      <CardMedia component="img" sx={{ width: 700 }} image={img} alt={title} />
    </Card>
  );
};
