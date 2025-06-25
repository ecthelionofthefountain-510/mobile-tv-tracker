import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSearch, FaTv, FaFilm, FaHeart } from 'react-icons/fa';
import './Navbar.css';

const navItems = [
  
  { to: "/shows", icon: <FaTv />, label: "Shows" },
  { to: "/movies", icon: <FaFilm />, label: "Movies" },
  { to: "/search", icon: <FaSearch />, label: "Explore" },
  { to: "/favorites", icon: <FaHeart />, label: "Favorites" },
];

export default function Navbar() {
  const location = useLocation();
  const activeIndex = navItems.findIndex(item => item.to === location.pathname);

  return (
    <nav className="custom-navbar">
      <div className="navbar-content">
        {navItems.map((item, index) => (
          <Link
            key={item.label}
            to={item.to}
            className={`nav-link ${index === activeIndex ? 'nav-link-active' : ''}`}
            style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 2 }}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}

        {/* Floating Center Icon */}
        <div
          className="navbar-floating-icon"
          style={{ left: `calc(${(activeIndex + 0.5) * 25}% - 28px)` }}
        >
          {navItems[activeIndex]?.icon}
        </div>
      </div>
    </nav>
  );
}