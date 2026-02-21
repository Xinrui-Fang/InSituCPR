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
