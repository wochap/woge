import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { suppressContextMenu } from "./lib/contextmenu";
import { initDocumentTheme } from "./lib/theme";

// Fonts must be ready before Konva measures text in later changes.
initDocumentTheme();

suppressContextMenu();

document.fonts.ready.finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
