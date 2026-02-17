import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme class before render to prevent flash
const stored = localStorage.getItem("cerebro-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.classList.add(stored || (prefersDark ? "dark" : "light"));

createRoot(document.getElementById("root")!).render(<App />);
