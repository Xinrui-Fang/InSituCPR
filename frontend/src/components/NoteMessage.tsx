import * as React from "react";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Avatar, Card } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"; // Quesiton Marker
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ThumbDownOffAltIcon from "@mui/icons-material/ThumbDownOffAlt";
import { Note } from "../types/Interfaces";
import { getRandomPerspectives, perspectives } from "../utils/NoteUtils";
import callGenerativePerspQuestionAPI from "../api/GenerativePerspQuestionAPI";
import callGenerativeCommentQuestionAPI from "../api/GenerativeCommentQuestionAPI";
import callSearchQueryAPI from "../api/SearchQueryAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import PushPinIcon from "@mui/icons-material/PushPin";
import ReferenceIcon from "@mui/icons-material/Link";
import ButtonGroup from "@mui/material/ButtonGroup";
import Popover from "@mui/material/Popover";
import Paper from "@mui/material/Paper";
import names from "../data/names.json";
import getBackgroundColor from "../utils/ColorUtils";
import QuizIcon from "@mui/icons-material/Quiz";
import { uploadToFirestore } from "../utils/firestoreUtils";
import { useParams } from "react-router-dom";

// Interface:
interface NoteMessageProps {
  note: Note;
  noteId: number; // select noteId, click highlight && highlight button -> jump to notes
  index: number;
  avatars: [string, string, string][];
  setAvatars: (value: React.SetStateAction<[string, string][]>) => void;
  handleCommentQuestionNoteCreate: (note: Note) => void;
  onHighlightLabelBtnClick: (note: Note) => void;
  // onHighlightLabelBtnClick: () => void;
  onButtonClick: (id: number, color?: string) => void;
  selectedColor?: string;
  parentNoteType?: number;
  loadingNoteIds?: { [id: number]: boolean };
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  isGeneratingRef?: any;
}

/**
 * UI of the Note Element.
 *
 * @param id - The ID of the note.
 * @param color - (Optional) The selected color for the note.
 */
const NoteMessage: React.FC<NoteMessageProps> = ({
  note,
  noteId,
  index,
  avatars,
  setAvatars,
  handleCommentQuestionNoteCreate,
  onHighlightLabelBtnClick,
  onButtonClick,
  selectedColor,
  parentNoteType,
  loadingNoteIds,
  notes,
  setNotes,
  isGeneratingRef,
}) => {
  const colorList = ["#4caf50", "#2196f3", "#ff9800"];
  const { participantId, selectedPaper } = useParams<{
    participantId: string;
    selectedPaper: string;
  }>();

  const [quote, setQuote] = React.useState(note.quote); // set note.quote
  const [randomLabels, setRandomLabels] = React.useState(() =>
    getRandomPerspectives(perspectives, 3),
  );
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [referenceData, setReferenceData] =
    React.useState<string>("Loading...");
  const [papers, setPapers] = React.useState<any>(null);
  const [isThumbUp, setIsThumbUp] = React.useState(false);
  const [isThumbDown, setIsThumbDown] = React.useState(false);

  const handleThumbUpClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    console.log(isGeneratingRef);

    setIsThumbUp((prevThumbUp) => {
      const newThumbUp = !prevThumbUp;

      if (isThumbDown) {
        setIsThumbDown(false);
      }

      setNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === note.id ? { ...n, thumbUpStatus: newThumbUp } : n,
        ),
      );
      console.log(note);

      return newThumbUp;
    });
  };

  const handleThumbDownClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    setIsThumbDown((prevThumbDown) => {
      const newThumbDown = !prevThumbDown;

      if (isThumbUp) {
        setIsThumbUp(false);
      }

      setNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === note.id ? { ...n, thumbDownStatus: newThumbDown } : n,
        ),
      );
      console.log(note);

      return newThumbDown;
    });
  };

  const fetchReference = async (
    event: React.MouseEvent<HTMLButtonElement>,
    note: Note,
  ) => {
    setAnchorEl(event.currentTarget);
    let searchQuery = note.content;
    console.log(note);
    searchQuery = searchQuery.replace(/\[\d+\]/g, "").trim();

    if (searchQuery.startsWith('"') && searchQuery.endsWith('"')) {
      searchQuery = searchQuery.slice(1, -1);
    }
    const requestUrl = "http://localhost:5001/api/semantic-scholar";

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          query: searchQuery,
          perspective: note.perspective, // 传入 perspective
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);

      if (data) {
        const papers = data.map((item) => ({
          title: item.title,
          year: item.paper_details.year,
          url: item.paper_details.url,
          authors: item.authors, // Extract author names
          tldr0: item.paper_details.tldr
            ? item.paper_details.tldr.text
            : "Not available",
          tldr: item.snippet_text ? item.snippet_text : "Not found",
        }));

        setPapers(papers);
        setReferenceData(JSON.stringify(papers, null, 2));
      }
    } catch (error) {
      console.error("Error fetching reference:", error);
      setReferenceData("Failed to fetch references.");
    }
  };
  // Close Popover
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleRefresh = () => {
    // Refresh to generate 3 perspective buttons
    setRandomLabels(getRandomPerspectives(perspectives, 3));
  };

  const handleNextQuote = async (note: Note) => {
    try {
      const data = await callGenerativePerspQuestionAPI(note.quote);
      // setResponseData(data);
      setQuote(data);
      console.log(data);
    } catch (error) {
      console.log("Failed to fetch response.");
    }
    // setQuote(getRandomQuote()); // Update the quote with a new random one
  };

  // UI: SummaryText
  const SummaryText = ({ tldr }: { tldr: string }) => {
    const [expanded, setExpanded] = React.useState(false);
    const maxLength = 100;
    const shortText =
      tldr.length > maxLength ? tldr.slice(0, maxLength) + "..." : tldr;

    return (
      <Typography variant="body2" style={{ marginTop: "8px" }}>
        <span
          style={{
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            padding: "2px 6px",
            marginRight: "6px",
            fontWeight: "bold",
            fontSize: "0.85em",
          }}
        >
          Details
        </span>
        {expanded ? tldr : shortText}{" "}
        {tldr.length > maxLength && (
          <span
            onClick={() => setExpanded(!expanded)}
            style={{
              color: "blue",
              cursor: "pointer",
              fontSize: "0.85em",
              marginLeft: "6px",
            }}
          >
            {expanded ? "Show Less" : "Show More"}
          </span>
        )}
      </Typography>
    );
  };
  // UI: PaperCards (semantic scholar API)
  const PaperCards = () => {
    if (!papers || papers.length === 0) {
      return (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: "20vw",
            gap: "16px",
            padding: "10px",
          }}
        >
          Loading...
        </div>
      ); // 如果 papers 为 null 或空数组，则不渲染任何内容
    }
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: "20vw",
          gap: "16px",
          padding: "10px",
        }}
      >
        {papers.map((paper, index) => (
          <Card key={index}>
            {/* UI: paper card title */}
            <CardContent>
              <Typography
                variant="body1"
                component="a"
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontWeight: "bold",
                  color: "#1E88E5",
                  "&:hover": { color: "#1565C0", textDecoration: "underline" }, // 悬停时颜色加深 + 下划线
                  transition: "color 0.3s ease-in-out", // 平滑颜色变化
                }}
              >
                {paper.title}
              </Typography>
              {/* UI: paper card info */}
              <Typography variant="body2" color="textSecondary">
                {paper.year}. {paper.authors.join(", ")}
              </Typography>
              <Typography variant="body2" style={{ marginTop: "8px" }}>
                <span
                  style={{
                    backgroundColor: "#e0e0e0",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    marginRight: "6px",
                    fontWeight: "bold",
                    fontSize: "0.85em",
                  }}
                >
                  TLDR
                </span>
                {paper.tldr0}
              </Typography>
              <Typography variant="body2" style={{ marginTop: "8px" }}>
                <SummaryText tldr={paper.tldr || "No summary available."} />
              </Typography>
            </CardContent>
            {/* <CardActions>
              <Button
                size="small"
                color="primary"
                href={paper.url}
                target="_blank"
              >
                Read More
              </Button>
            </CardActions> */}
          </Card>
        ))}
      </div>
    );
  };
  // FUNCTION: generate random name
  const getRandomName = () => {
    return names[Math.floor(Math.random() * names.length)];
  };
  const randomName = React.useMemo(() => getRandomName(), []);

  return (
    <React.Fragment>
      <CardContent
        sx={{
          marginTop: note.childNote ? "-10px" : "1px",
          // borderColor:
          //   note.id === noteId ? getBackgroundColor(note.label) : "transparent",
          // borderStyle: "dashed",
        }}
      >
        {/* UI: note header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* UI: note title */}
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: "text.primary", textAlign: "left" }}
          >
            {/* If childNote, Hide note title, If ParentNote, Show note title */}
            {/* {!note.childNote && `Note`} */}
            {note.noteType === 0
              ? "Comment"
              : note.noteType === 1
                ? "Proactive Note"
                : note.noteType === 3
                  ? note.label
                  : note.noteType === 6
                    ? "Highlight"
                    : null}
          </Typography>
          {/* UI: note label button */}
          {[0, 6].includes(note.noteType) && (
            <Button
              variant="contained"
              size="small"
              style={{
                fontSize: "11px",
                color: note.label ? "white" : "black",
                height: "20px",
                width: "6px",
                marginBottom: "6px",
                background: getBackgroundColor(note.label),
              }}
              onClick={() => {
                console.log(isGeneratingRef);
                onHighlightLabelBtnClick(note);
              }}
            >
              {note.label || "COMMENT"}
            </Button>
          )}
          {[3].includes(note.noteType) && (
            <QuizIcon sx={{ marginBottom: "6px", color: "green" }} />
          )}
        </Box>
        {/* *************************************** */}
        {/* Note Quote */}
        {/* Note Quote Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor:
              note.noteType === 2 ||
              note.noteType === 3 ||
              note.noteType === 4 ||
              note.noteType === 7
                ? "transparent"
                : "#f0f0f0",
            padding: "0px",
            borderRadius: "4px",
            mb: "3px",
          }}
        >
          {/* Avatar */}
          {note.noteType === 4 && (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                mr: 1,
                bgcolor: note.pin
                  ? avatars.find((avatar) => avatar[0] === note.avatar)?.[2]
                  : "grey",
              }}
            >
              {/* {avatars[index - 1] ? avatars[index - 1][0][0] : randomName[0]} */}
              {note.avatar[0]}
            </Avatar>
          )}

          {/* Box for Typography stacked vertically */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {/* Typography - Name */}
            {note.noteType === 4 && (
              <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  fontWeight:
                    note.noteType === 4 ||
                    note.noteType === 2 ||
                    note.noteType === 7
                      ? "bold"
                      : "normal",
                  mb: -0.3, // Add margin-bottom to separate the name from the quote
                }}
              >
                {/* {avatars[index - 1] ? avatars[index - 1][0] : randomName} */}
                {note.avatar}
              </Typography>
            )}

            {/* Typography - Quote */}
            <Typography
              variant="body2"
              sx={{
                textAlign: "left",
                fontWeight:
                  note.noteType === 2 || note.noteType === 7
                    ? "bold"
                    : "normal",
              }}
            >
              {quote}
            </Typography>
          </Box>
          {note.noteType === 4 && (
            <PushPinIcon
              sx={{
                ml: "auto",
                cursor: "pointer",
                color: avatars.some(
                  ([name, discipline]) => discipline === quote,
                )
                  ? "green"
                  : "black",
              }}
              onClick={() => {
                setAvatars((prev) => {
                  const exists = prev.some(
                    ([name, discipline]) => discipline === quote,
                  );
                  if (exists) {
                    // Remove the avatar
                    // Interaction: Upload to Log
                    // const result = uploadToFirestore(
                    //   `${participantId}_${selectedPaper}`,
                    //   {
                    //     isNotNote: "true",
                    //     interaction: "Click Pin",
                    //     status: "Remove",
                    //     noteId: note.id,
                    //     noteParentId: note.sub_id,
                    //     createdAt: new Date(),
                    //   },
                    // );
                    // if (result instanceof Error) {
                    //   alert("Upload failed: " + result.message);
                    // }

                    return prev.filter(
                      ([name, discipline]) => discipline !== quote,
                    );
                  } else {
                    // Add the avatar

                    // Interaction: Upload to Log
                    // const result = uploadToFirestore(
                    //   `${participantId}_${selectedPaper}`,
                    //   {
                    //     isNotNote: "true",
                    //     interaction: "Click Pin",
                    //     status: "Add",
                    //     noteId: note.id,
                    //     noteParentId: note.sub_id,
                    //     createdAt: new Date(),
                    //   },
                    // );
                    // if (result instanceof Error) {
                    //   alert("Upload failed: " + result.message);
                    // }

                    return [
                      ...prev,
                      [
                        note.avatar,
                        quote,
                        colorList[(index - 1) % colorList.length],
                      ],
                    ]; // name and discipline
                  }
                });

                // 2. 更新 notes
                setNotes((prev) =>
                  prev.map((note) =>
                    note.quote === quote
                      ? { ...note, pin: !note.pin } // 切换 pin 状态
                      : note,
                  ),
                );
                console.log(note);
              }}
            />
          )}
        </Box>
        {/* *************************************** */}
        {/*Note Comment and Response Element*/}
        {/* UI: note.content */}
        <Typography
          variant="body2"
          gutterBottom
          sx={{
            color: "text.primary",
            textAlign: "left",
          }}
        >
          {note.content}
        </Typography>
      </CardContent>
      {/* *************************************** */}
      {/* Conditionally render the Discuss button based on note.childNote */}
      <CardActions sx={{ marginTop: note.childNote ? "-30px" : "-20px" }}>
        {/* Parent Note */}
        {!note.childNote && <></>}
        {note.noteType === 4 && (
          <>
            <Box
              sx={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                ml: "8px",
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ flexBasis: "100%", height: 10 }} />
              <Button
                sx={{
                  backgroundColor: "lightgrey",
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  // Handle reference functionality here
                  console.log("Reference note", note.id);

                  fetchReference(event, note);
                }}
              >
                <ReferenceIcon fontSize="small" />
              </Button>
              {/* UI: Popover Card */}
              <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                sx={{
                  pml: parentNoteType === 3 ? "-20%" : "+20%",
                  mt: 4,
                  overflow: "auto",
                  scrollbarWidth: "none",
                }} // 向左偏移 200px
              >
                <Paper
                  sx={{
                    padding: "10px",
                    // width: "600px",
                    overflow: "auto",
                  }}
                >
                  <Button
                    size="small"
                    sx={{
                      position: "absolute",
                      top: "-2px",
                      right: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 1)" },
                    }}
                    onClick={handleClose}
                  >
                    <CloseIcon />
                  </Button>
                  <PaperCards />
                </Paper>
              </Popover>
              {/* UI: thumbUp, thumbDown */}
              <ButtonGroup
                disableElevation
                // variant="contained"
                aria-label="Disabled button group"
              >
                <Button
                  disableElevation
                  disableFocusRipple
                  sx={{
                    "&:hover": {
                      backgroundColor: isThumbUp ? "lightgreen" : "lightgrey",
                    },
                    backgroundColor: isThumbUp ? "lightgreen" : "lightgrey",
                  }}
                  onClick={handleThumbUpClick}
                >
                  <ThumbUpOffAltIcon fontSize="small" />
                </Button>
                <Button
                  sx={{
                    "&:hover": {
                      backgroundColor: isThumbDown ? "lightcoral" : "lightgrey", // 继承背景色，防止颜色变化
                    },
                    backgroundColor: isThumbDown ? "lightcoral" : "lightgrey",
                  }}
                  onClick={handleThumbDownClick}
                >
                  <ThumbDownOffAltIcon fontSize="small" />
                </Button>
              </ButtonGroup>
            </Box>
          </>
        )}
      </CardActions>
    </React.Fragment>
  );
};

export default NoteMessage;
