import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Box,
  Link,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const papers = [
  { id: "Paper_2", title: "Paper 2" },
  { id: "Paper_3", title: "Paper 3" },
  { id: "Paper_4", title: "Paper 4" },
  { id: "Paper_5", title: "Paper 5" },
  { id: "Paper_6", title: "Paper 6" },
  { id: "Paper_7", title: "Paper 7" },
];

const Login: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [selectedPaper, setSelectedPaper] = useState("");
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const navigate = useNavigate();

  // ✅ API Key 校验函数
  const isValidApiKey = (key: string) => {
    const trimmed = key.trim();
    const pattern = /^sk-[a-zA-Z0-9_-]{20,}$/;
    return pattern.test(trimmed);
  };

  const handleLogin = async () => {
    const trimmedKey = apiKey.trim();

    if (!selectedPaper) {
      setError("Please select a paper.");
      return;
    }

    if (!trimmedKey) {
      setError("Please paste your OpenAI API key.");
      return;
    }

    if (!isValidApiKey(trimmedKey)) {
      setError("Invalid API key format. It should start with 'sk-'.");
      return;
    }

    try {
      localStorage.setItem("openai_api_key", trimmedKey);

      const response = await fetch(
        "http://localhost:5001/api/set-vector-store",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            selectedPaper,
            apiKey: trimmedKey,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed");
      }

      const data = await response.json();
      localStorage.setItem("vector_store_id", data.vector_store_id);

      navigate(`/app/${selectedPaper}`);
    } catch {
      setError("Server error when setting vector store.");
    }
  };

  return (
    <Container maxWidth="sm">
      {/* ===== Classic GitHub Corner ===== */}
      <a
        href="https://github.com/Xinrui-Fang/InSituCPR/tree/main"
        className="github-corner"
        aria-label="View source on GitHub"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 250 250"
          style={{
            fill: "#151513",
            color: "#fff",
            position: "fixed",
            top: 0,
            right: 0,
            zIndex: 1000,
          }}
          aria-hidden="true"
        >
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
          <path
            className="octo-arm"
            d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 
               C122.0,82.7 120.5,78.6 120.5,78.6 
               C119.2,72.0 123.4,76.3 123.4,76.3 
               C127.3,80.9 125.5,87.3 125.5,87.3 
               C122.9,97.6 130.6,101.9 134.4,103.2"
            fill="currentColor"
            style={{ transformOrigin: "130px 106px" }}
          />
          <path
            className="octo-body"
            d="M115.0,115.0 C114.9,115.1 118.7,116.5 
               119.8,115.4 L133.7,101.6 
               C136.9,99.2 139.9,98.4 
               142.2,98.6 C133.8,88.0 
               127.5,74.4 143.8,58.0 
               C148.5,53.4 154.0,51.2 
               159.7,51.0 C160.3,49.4 
               163.2,43.6 171.4,40.1 
               C171.4,40.1 176.1,42.5 
               178.8,56.2 C183.1,58.6 
               187.2,61.8 190.9,65.4 
               C194.5,69.0 197.7,73.2 
               200.1,77.6 C213.8,80.2 
               216.3,84.9 216.3,84.9 
               C212.7,93.1 206.9,96.0 
               205.4,96.6 C205.1,102.4 
               203.0,107.8 198.3,112.5 
               C181.9,128.9 168.3,122.5 
               157.7,114.1 C157.9,116.9 
               156.7,120.9 152.7,124.9 
               L141.0,136.5 C139.8,137.7 
               141.6,141.9 141.8,141.8 Z"
            fill="currentColor"
          />
        </svg>
      </a>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card sx={{ width: "100%", p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Experience the Demo
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              To run the demo below, please paste your OpenAI API key. You can
              obtain one{" "}
              <Link
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener"
              >
                here
              </Link>
              . Your key is stored locally in your browser and never shared.
            </Typography>

            {/* 选择 Paper */}
            <TextField
              select
              fullWidth
              label="Select Paper"
              value={selectedPaper}
              onChange={(e) => {
                setSelectedPaper(e.target.value);
                setError("");
              }}
              margin="normal"
            >
              {papers.map((paper) => (
                <MenuItem key={paper.id} value={paper.id}>
                  {paper.title}
                </MenuItem>
              ))}
            </TextField>

            {/* API Key 输入 */}
            <TextField
              fullWidth
              type={showKey ? "text" : "password"}
              label="OpenAI API Key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (e.target.value && !isValidApiKey(e.target.value)) {
                  setError("API key must start with 'sk-'.");
                } else {
                  setError("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              margin="normal"
              error={!!error}
              helperText={
                apiKey && !isValidApiKey(apiKey)
                  ? "API key should start with 'sk-'"
                  : ""
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowKey(!showKey)} edge="end">
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              onClick={handleLogin}
              disabled={!selectedPaper || !isValidApiKey(apiKey)}
            >
              Start
            </Button>

            <Button
              fullWidth
              variant="text"
              sx={{ mt: 1 }}
              onClick={() => navigate("/tutorial")}
            >
              Tutorial
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;
