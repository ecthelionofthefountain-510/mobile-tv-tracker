// Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 w-full bg-gray-900/95 text-white border-t-2 border-yellow-600/50 shadow-lg backdrop-blur-sm">
      <div className="max-w-screen-lg mx-auto">
        <div className="flex justify-between px-6 py-2">
          <Link 
            to="/shows" 
            className={`nav-link ${
              location.pathname === '/shows' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon">📺</div>
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
            <div className="nav-icon">🎬</div>
            <span className="nav-text">Movies</span>
          </Link>
          
          <Link 
            to="/search" 
            className={`nav-link ${
              location.pathname === '/search' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon">🔍</div>
            <span className="nav-text">Explore</span>
          </Link>
          
          <Link 
            to="/favorites" 
            className={`nav-link ${
              location.pathname === '/favorites' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon">⭐</div>
            <span className="nav-text">Favorites</span>
          </Link>

          <Link 
            to="/profile" 
            className={`nav-link ${
              location.pathname === '/profile' 
                ? 'text-yellow-400 nav-link-active' 
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <div className="nav-icon">👤</div>
            <span className="nav-text">Profile</span>
          </Link>

      
        </div>
      </div>
    </nav>
  );
};

export default Navbar;