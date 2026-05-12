import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Se till att den här finns!
import ErrorBoundary from "./components/ErrorBoundary";

document.documentElement.lang = "en";
// Prevent the browser from restoring scroll position on navigation
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  });
}
