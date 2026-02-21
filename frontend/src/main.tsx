// main.tsx
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import Login from "./Login.tsx";
import "./index.css";
import TutorialPage from "./TutorialPage.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/app/:selectedPaper" element={<App />} />
      <Route path="/tutorial" element={<TutorialPage />} />
    </Routes>
  </BrowserRouter>,
);
