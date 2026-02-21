import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Dialog,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import QuizIcon from "@mui/icons-material/Quiz";
import LinkIcon from "@mui/icons-material/Link";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ThumbDownOffAltIcon from "@mui/icons-material/ThumbDownOffAlt";
import PushPinIcon from "@mui/icons-material/PushPin";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";

const TutorialPage: React.FC = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const handleOpen = (img: string) => {
    setSelectedImg(img);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedImg(null);
  };

  const steps = [
    {
      title: "Generate Questions",
      content: (
        <>
          Click <QuizIcon sx={{ verticalAlign: "middle", color: "darkred" }} />{" "}
          beside a section title to generate a critical question and answer it
          after reading the section.
        </>
      ),
      img: "./Q&A.gif",
    },
    {
      title: "Analyze Multi-disciplinary Answers",
      content: (
        <>
          Use <LinkIcon sx={{ verticalAlign: "middle", color: "#1976d2" }} /> to
          view references. Like{" "}
          <ThumbUpOffAltIcon sx={{ verticalAlign: "middle" }} /> or dislike{" "}
          <ThumbDownOffAltIcon sx={{ verticalAlign: "middle" }} /> responses, or
          pin <PushPinIcon sx={{ verticalAlign: "middle" }} /> to follow up.
        </>
      ),
      img: "./multiAnswer.gif",
    },
    {
      title: "Improve Your Answer",
      content: (
        <>
          Revise your response based on feedback. The system evaluates your
          improvement based on selected likes or all feedback.
        </>
      ),
      img: "./improveAnswer.gif",
    },
    {
      title: "Review Section Highlights",
      content: (
        <>
          Click <b style={{ color: "#1976d2" }}>REVIEW THIS SECTION</b> to see
          pre-labeled sentences in that section.
        </>
      ),
      img: "./reviewSection.gif",
    },
    {
      title: "Active Reading Support",
      content: (
        <>
          Highlight{" "}
          <DriveFileRenameOutlineIcon sx={{ verticalAlign: "middle" }} /> text,
          add comments <MessageOutlinedIcon sx={{ verticalAlign: "middle" }} />,
          and explore <TipsAndUpdatesIcon sx={{ verticalAlign: "middle" }} />{" "}
          insights for overlapping highlights.
        </>
      ),
      img: "./activeReading.gif",
    },
    {
      title: "Reinterpret Notes",
      content: (
        <>
          Click discipline labels (e.g., METHOD) to reinterpret notes from
          multi-disciplinary perspectives.
        </>
      ),
      img: "./reInterpret.gif",
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Tutorial
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Learn how to use the system for critical reading and reflective
          analysis.
        </Typography>
      </Box>

      <Divider sx={{ mb: 5 }} />

      {/* Steps */}
      {steps.map((step, index) => (
        <Card key={index} sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Step {index + 1}: {step.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {step.content}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box
                  component="img"
                  src={step.img}
                  alt={step.title}
                  onClick={() => handleOpen(step.img)}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    boxShadow: 2,
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "scale(1.03)",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* Image Preview Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <Box sx={{ position: "relative", bgcolor: "black" }}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              color: "white",
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>

          {selectedImg && (
            <Box
              component="img"
              src={selectedImg}
              sx={{
                width: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
              }}
            />
          )}
        </Box>
      </Dialog>

      {/* Back Button */}
      <Box textAlign="center" mt={6}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
        >
          Back to Login
        </Button>
      </Box>
    </Container>
  );
};

export default TutorialPage;
