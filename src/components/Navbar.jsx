import React, { useState } from 'react';
import { FaHome, FaSearch, FaShoppingBasket, FaUser } from 'react-icons/fa';
import './Navbar.css';

const navItems = [
  { name: 'Home', icon: <FaHome /> },
  { name: 'Search', icon: <FaSearch /> },
  { name: 'Cart', icon: <FaShoppingBasket /> },
  { name: 'Profile', icon: <FaUser /> },
];

export default function Navbar() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <nav className="custom-navbar">
      <div className="navbar-content">
        {navItems.map((item, index) => (
          <div
            key={item.name}
            className={`nav-link ${index === activeIndex ? 'nav-link-active' : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.name}</span>
          </div>
        ))}

        {/* Floating Center Icon */}
        <div
          className="navbar-floating-icon"
          style={{ left: `calc(${(activeIndex + 0.5) * 25}% - 28px)` }} // 25% per tab
        >
          {navItems[activeIndex].icon}
        </div>
      </div>
    </nav>
  );
}