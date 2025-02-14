import React from "react";
import SearchPage from "./components/SearchPage";
import WatchedList from "./components/WatchedList";
import FavoritesList from "./components/FavoritesList";
import ProfilePage from "./components/ProfilePage";
import Navbar from "./components/Navbar";
import "./index.css";
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <div className="flex flex-col h-screen">
        <div className="main-content flex-grow overflow-auto">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/watched" element={<WatchedList />} />
            <Route path="/favorites" element={<FavoritesList />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
        <Navbar />
      </div>
    </Router>
  );
};

export default App;