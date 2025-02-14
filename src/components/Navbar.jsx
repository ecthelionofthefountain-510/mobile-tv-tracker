import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed bottom-0 w-full bg-gray-900 text-white flex justify-around py-3 border-t-4 border-red-600 shadow-lg">
      <Link to="/" className="p-2 text-yellow-400 hover:text-yellow-500 transition-colors duration-300">🔍 Search</Link>
      <Link to="/watched" className="p-2 text-yellow-400 hover:text-yellow-500 transition-colors duration-300">📜 Watched</Link>
      <Link to="/favorites" className="p-2 text-yellow-400 hover:text-yellow-500 transition-colors duration-300">💖 Favorites</Link>
      <Link to="/profile" className="p-2 text-yellow-400 hover:text-yellow-500 transition-colors duration-300">🧙 Profile</Link>
    </nav>
  );
};

export default Navbar;