/**
 * Pilot UI — Application entry point.
 *
 * Bootstraps the React app into the #root DOM element.
 * M2 will add routing, providers, and the full UI.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
