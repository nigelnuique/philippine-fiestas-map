import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);