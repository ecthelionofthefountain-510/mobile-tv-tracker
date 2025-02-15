import React from "react";
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import SearchPage from "./components/SearchPage";
import WatchedList from "./components/WatchedItemList";
import ShowsList from "./components/ShowsList";  // Ny komponent för TV-serier
import MoviesList from "./components/MoviesList"; // Ny komponent för filmer
import ProfilePage from "./components/ProfilePage";
import Navbar from "./components/Navbar";
import "./index.css";

const App = () => {
  return (
    <Router>
      <div className="flex flex-col h-screen">
        <div className="main-content flex-grow overflow-auto pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/shows" replace />} />
            <Route path="/shows" element={<ShowsList />} />
            <Route path="/movies" element={<MoviesList />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;