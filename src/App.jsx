import React, { useEffect, useState } from "react";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import Navbar from "./components/Navbar";
import ProfilePage from "./components/ProfilePage";
import OverviewPage from "./components/OverviewPage";
import SettingsPage from "./components/SettingsPage";
import "./index.css";
import { applyThemePreference, getStoredThemePreference } from "./utils/theme";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Scrolla .main-content till toppen
    const main = document.querySelector(".main-content");
    if (main) {
      main.scrollTo({ top: 0, behavior: "auto" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <AppShell />
    </Router>
  );
};

function AppShell() {
  const { pathname } = useLocation();
  const hideNavbar = pathname === "/settings";

  useEffect(() => {
    const applyFromStorage = () => {
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem("currentUser"));
      } catch {
        user = null;
      }

      applyThemePreference(getStoredThemePreference(user));
    };

    applyFromStorage();
    window.addEventListener("storage", applyFromStorage);
    return () => window.removeEventListener("storage", applyFromStorage);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div
        className={
          "flex-grow overflow-auto main-content" + (hideNavbar ? "" : " pb-16")
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/shows" element={<ShowsList />} />
          <Route path="/movies" element={<MoviesList />} />
          <Route path="/search" element={<SearchPage />} />
          <Route
            path="/favorites"
            element={<Navigate to="/profile" replace />}
          />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Fallback route */}
        </Routes>
      </div>
      {!hideNavbar && <Navbar />}
    </div>
  );
}

export default App;
