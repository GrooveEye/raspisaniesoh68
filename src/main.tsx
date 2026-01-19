import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Ensure theme is applied before first paint
try {
  const darkMode = localStorage.getItem("darkMode") === "true";
  document.documentElement.classList.toggle("dark", darkMode);
} catch {
  // ignore
}

// Service Workers are not supported on file:// (Electron packaged app).
// If we try to register on file:// it can throw and prevent React from mounting,
// resulting in a blank (dark) window.
try {
  const isFileProtocol = window.location.protocol === "file:";
  const canUseSW =
    !isFileProtocol &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator;

  if (canUseSW) {
    registerSW({ immediate: true });
  }
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);
