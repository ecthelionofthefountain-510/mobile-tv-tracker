import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Se till att den här finns!
import ErrorBoundary from "./components/ErrorBoundary";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);