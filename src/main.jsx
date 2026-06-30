import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { initTheme } from "./lib/theme.js";
import "maplibre-gl/dist/maplibre-gl.css";
import "./theme.css";
import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);