import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

const card = (
  <React.Fragment>
    <CardContent>
      {/* Title */}
      <Typography sx={{ textAlign: "left", fontSize: 12 }} gutterBottom>
        Synergi: A Mixed-Initiative System for Scholarly Synthesis and
        Sensemaking
      </Typography>
      <Typography
        sx={{ textAlign: "left", fontSize: 11 }}
        color="text.secondary"
      >
        Efficiently reviewing scholarly literature and synthesizing prior art
        are crucial for scientific progress. Yet, the growing scale of
        publications and the burden of knowledge make synthesis of research
        threads more challenging than ever.
      </Typography>
    </CardContent>
    <CardActions>
      <Button size="small">Read</Button>
      <Button size="small">Cite</Button>
    </CardActions>
  </React.Fragment>
);

function PaperCard() {
  return (
    <Box sx={{ minWidth: 275 }}>
      <Card variant="outlined">{card}</Card>
    </Box>
  );
}

export default PaperCard;
