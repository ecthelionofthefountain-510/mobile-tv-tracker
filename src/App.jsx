import React from "react";
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import Navbar from "./components/Navbar";
import FavoritesList from "./components/FavoritesList";
import "./index.css";

const App = () => {
  return (
    <Router>
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