import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import App from "./App";

createRoot(document.getElementById("react-root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
