import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 w-full bg-gray-900 text-white border-t-4 border-red-600 shadow-lg">
      <div className="flex justify-around py-3">
        <Link 
          to="/shows" 
          className={`flex flex-col items-center p-2 ${
            location.pathname === '/shows' ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl mb-1">📺</span>
          <span className="text-xs">Shows</span>
        </Link>
        
        <Link 
          to="/movies" 
          className={`flex flex-col items-center p-2 ${
            location.pathname === '/movies' ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl mb-1">🎬</span>
          <span className="text-xs">Movies</span>
        </Link>
        
        <Link 
          to="/search" 
          className={`flex flex-col items-center p-2 ${
            location.pathname === '/search' ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl mb-1">🔍</span>
          <span className="text-xs">Explore</span>
        </Link>
        
        <Link 
          to="/profile" 
          className={`flex flex-col items-center p-2 ${
            location.pathname === '/profile' ? 'text-yellow-400' : 'text-gray-400'
          }`}
        >
          <span className="text-xl mb-1">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;