// Navbar.jsx - Improved Design
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 w-full bg-gradient-to-t from-gray-900/95 to-gray-800/90 text-white border-t border-yellow-600/30 shadow-lg backdrop-blur-lg">
      <div className="w-full mx-auto px-1">
        <div className="flex justify-between">
          <Link 
            to="/search" 
            className={`nav-link ${
              location.pathname === '/search' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon-container">
              <div className="nav-icon">🔍</div>
              <div className="nav-glow"></div>
            </div>
            <span className="nav-text">Search</span>
          </Link>

          <Link 
            to="/shows" 
            className={`nav-link ${
              location.pathname === '/shows' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon-container">
              <div className="nav-icon">📺</div>
              <div className="nav-glow"></div>
            </div>
            <span className="nav-text">Shows</span>
          </Link>
          
          <Link 
            to="/movies" 
            className={`nav-link ${
              location.pathname === '/movies' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon-container">
              <div className="nav-icon">🎬</div>
              <div className="nav-glow"></div>
            </div>
            <span className="nav-text">Movies</span>
          </Link>
          
          <Link 
            to="/favorites" 
            className={`nav-link ${
              location.pathname === '/favorites' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon-container">
              <div className="nav-icon">⭐</div>
              <div className="nav-glow"></div>
            </div>
            <span className="nav-text">Favorites</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;