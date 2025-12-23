import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaSearch, FaTv, FaFilm, FaUser, FaChartPie } from "react-icons/fa";
import "./Navbar.css";

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("currentUser"))
  );
  const [profileImages, setProfileImages] = useState(
    () => JSON.parse(localStorage.getItem("profileImages")) || {}
  );

  // Uppdatera om localStorage ändras (t.ex. när man byter profil)
  useEffect(() => {
    const onStorage = () => {
      setCurrentUser(JSON.parse(localStorage.getItem("currentUser")));
      setProfileImages(JSON.parse(localStorage.getItem("profileImages")) || {});
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const location = useLocation();
  const navItems = [
    { to: "/shows", icon: <FaTv />, label: "Shows" },
    { to: "/movies", icon: <FaFilm />, label: "Movies" },
    { to: "/search", icon: <FaSearch />, label: "Explore" },
    { to: "/overview", icon: <FaChartPie />, label: "Overview" },
    { to: "/profile", icon: <FaUser />, label: "Profile" },
  ];
  const foundIndex = navItems.findIndex(
    (item) => item.to === location.pathname
  );
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;

  return (
    <nav className="custom-navbar">
      <div className="navbar-content">
        {navItems.map((item, index) => (
          <Link
            key={item.label}
            to={item.to}
            className={`nav-link ${
              index === activeIndex ? "nav-link-active" : ""
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`}
            style={{
              flex: 1,
              textAlign: "center",
              position: "relative",
              zIndex: 2,
            }}
            aria-current={index === activeIndex ? "page" : undefined}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}

        {/* Floating Center Icon */}
        <div
          className="navbar-floating-icon"
          style={{
            left: `calc(${
              (activeIndex + 0.5) * (100 / navItems.length)
            }% - 28px)`,
          }}
          aria-hidden="true"
        >
          {navItems[activeIndex]?.icon}
        </div>
      </div>
    </nav>
  );
}
