import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Fonts must be ready before Konva measures text in later changes.
const root = document.documentElement;
if (!root.dataset.theme) {
  root.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "mocha" : "latte";
}

document.fonts.ready.finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
