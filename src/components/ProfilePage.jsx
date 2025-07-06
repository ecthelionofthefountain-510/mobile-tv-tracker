import React, { useState, useEffect } from "react";
import { FaUser, FaCamera } from "react-icons/fa";

const ProfilePage = () => {
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem("users")) || []);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")));
  const [newUser, setNewUser] = useState("");
  const [profileImages, setProfileImages] = useState(() => JSON.parse(localStorage.getItem("profileImages")) || {});

  // Lägg till ny användare
  const addUser = () => {
    if (newUser.trim() && !users.includes(newUser)) {
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      setNewUser("");
    }
  };

  // Byt användare
  const switchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  // Ta bort användare
  const removeUser = (user) => {
    const updatedUsers = users.filter((u) => u !== user);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));

    // Om den borttagna användaren var den aktiva, nollställ currentUser
    if (currentUser === user) {
      setCurrentUser(null);
      localStorage.removeItem("currentUser");
    }
  };

  const handleImageChange = (user, file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedImages = { ...profileImages, [user]: reader.result };
      setProfileImages(updatedImages);
      localStorage.setItem("profileImages", JSON.stringify(updatedImages));
    };
    if (file) reader.readAsDataURL(file);
  };

  const favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser}`)) || [];

  return (
    <div className="p-4">
      <h2 className="text-xl text-yellow-400">Profile</h2>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Enter new user name"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          className="w-full p-2 text-white placeholder-gray-400 bg-gray-800 border border-yellow-500 rounded-md"
        />
        <button onClick={addUser} className="p-2 mt-2 text-white bg-green-600 rounded">Add User</button>
      </div>

      <h3 className="mt-4 text-yellow-300">Switch User</h3>
      <ul className="mt-6 space-y-6">
        {users.map((user) => (
          <li
            key={user}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 rounded-xl shadow-lg bg-gray-700/90 transition-all ${
              currentUser === user ? "border-4 border-yellow-400" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <img
                src={profileImages[user] || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user)}
                alt="Profile"
                className="object-cover w-12 h-12 bg-gray-800 border-2 border-yellow-300 rounded-full"
              />
              <span className={`text-lg font-bold tracking-wide ${currentUser === user ? "text-yellow-300" : "text-white"}`}>
                {user} {currentUser === user && <span className="text-base font-normal">(active)</span>}
              </span>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-white transition-colors bg-gray-600 rounded cursor-pointer hover:bg-gray-700">
                <FaCamera className="text-yellow-300" />
                Change picture
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => handleImageChange(user, e.target.files[0])}
                />
              </label>
              {currentUser !== user && (
                <button
                  onClick={() => switchUser(user)}
                  className="px-4 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  Switch user
                </button>
              )}
              <button
                onClick={() => removeUser(user)}
                className="px-4 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfilePage;