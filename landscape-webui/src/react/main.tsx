import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { applyInterceptors } from "@/api";
import "./theme.css";
import App from "./App";

setAxiosInstance(applyInterceptors(axios.create({ timeout: 30000 })));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
