import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import Navbar from "./components/Navbar";
import FavoritesList from "./components/FavoritesList";
import ProfilePage from "./components/ProfilePage";
import "./index.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Scrolla .main-content till toppen
    const main = document.querySelector('.main-content');
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
      <div className="flex flex-col h-screen">
        <div className="flex-grow pb-16 overflow-auto main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/shows" element={<ShowsList />} />
            <Route path="/movies" element={<MoviesList />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesList />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Fallback route */}
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;