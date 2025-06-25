import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import Navbar from "./components/Navbar";
import FavoritesList from "./components/FavoritesList";
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
        <div className="main-content flex-grow overflow-auto pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/shows" element={<ShowsList />} />
            <Route path="/movies" element={<MoviesList />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesList />} />
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;