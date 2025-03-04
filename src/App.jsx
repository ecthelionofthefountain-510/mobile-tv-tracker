import React, { useEffect } from "react";
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import ProfilePage from "./components/ProfilePage";
import Navbar from "./components/Navbar";
import FavoritesList from "./components/FavoritesList";
import "./index.css";

const App = () => {
  // Disable any default touch handling that might interfere with normal app operation
  useEffect(() => {
    // Prevent default touch behaviors that might be interpreted as swipes
    const preventDefaultTouchMove = (e) => {
      // Allow scrolling to continue working
      if (e.target.closest('.overflow-auto, .overflow-y-auto')) {
        return;
      }
      
      // Prevent horizontal swipes that might be misinterpreted as navigation
      const touchStartX = e.touches[0].clientX;
      const screenWidth = window.innerWidth;
      const edgeThreshold = screenWidth * 0.1; // 10% from edges
      
      if (touchStartX < edgeThreshold || touchStartX > screenWidth - edgeThreshold) {
        e.preventDefault();
      }
    };

    // Add the event listener for touchmove events
    document.addEventListener('touchmove', preventDefaultTouchMove, { passive: false });

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('touchmove', preventDefaultTouchMove);
    };
  }, []);

  return (
    <Router>
      <div className="flex flex-col h-screen">
        <div className="main-content flex-grow overflow-auto pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/shows" element={<ShowsList />} />
            <Route path="/movies" element={<MoviesList />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favorites" element={<FavoritesList />} />
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;