import React, { useState, useEffect } from "react";

const ProfilePage = () => {
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem("users")) || []);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")) || null);
  const [newUser, setNewUser] = useState("");

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

  return (
    <div className="p-4">
      <h2 className="text-yellow-400 text-xl">Profile</h2>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Enter new user name"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          className="w-full p-2 border border-yellow-500 rounded-md bg-gray-800 text-white placeholder-gray-400"
        />
        <button onClick={addUser} className="mt-2 p-2 bg-green-600 text-white rounded">Add User</button>
      </div>

      <h3 className="mt-4 text-yellow-300">Switch User</h3>
      <ul>
        {users.map((user) => (
          <li key={user} className="mb-2 flex justify-between items-center">
            <button onClick={() => switchUser(user)} className="p-2 bg-blue-500 text-white rounded flex-grow">
              {user} {currentUser === user ? "(Active)" : ""}
            </button>
            <button onClick={() => removeUser(user)} className="ml-2 p-2 bg-red-600 text-white rounded">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfilePage;