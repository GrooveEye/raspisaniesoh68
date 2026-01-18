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

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
