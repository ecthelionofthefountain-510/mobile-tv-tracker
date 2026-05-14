import React, { useEffect, useState } from "react";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import SearchPage from "./components/SearchPage";
import ShowsList from "./components/ShowsList";
import MoviesList from "./components/MoviesList";
import Navbar from "./components/Navbar";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
import OverviewPage from "./components/OverviewPage";
import UpcomingPage from "./components/UpcomingPage";
import OnboardingModal from "./components/OnboardingModal";
import AppIntroSplash from "./components/AppIntroSplash";
import "./index.css";
import { applyThemePreference, getStoredThemePreference } from "./utils/theme";
import { getOnboardingSeen, setOnboardingSeen } from "./utils/appPreferences";
import {
  addRememberedSession,
  removeRememberedSession,
} from "./utils/authStorage";

function getCurrentUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.querySelector(".main-content");
    if (main) {
      main.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <AppShell />
    </Router>
  );
};

function AppShell() {
  const { pathname } = useLocation();
  const [currentUser, setCurrentUser] = useState(() =>
    getCurrentUserFromStorage(),
  );
  const [showIntroSplash, setShowIntroSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const applyFromStorage = () => {
      const user = getCurrentUserFromStorage();
      setCurrentUser(user);

      applyThemePreference(getStoredThemePreference(user));
    };

    applyFromStorage();
    window.addEventListener("storage", applyFromStorage);
    return () => window.removeEventListener("storage", applyFromStorage);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setShowOnboarding(false);
      return;
    }

    const user = getCurrentUserFromStorage();
    setShowOnboarding(!getOnboardingSeen(user));
  }, [pathname, currentUser]);

  const handleLogin = (user) => {
    if (!user || typeof user !== "string") return;
    try {
      localStorage.setItem("currentUser", JSON.stringify(user));
    } catch {
      // ignore
    }
    addRememberedSession(user);
    setCurrentUser(user);
    applyThemePreference(getStoredThemePreference(user));
  };

  // Switch user — keeps user in the remembered list for quick re-login
  const handleLogout = () => {
    try {
      localStorage.removeItem("currentUser");
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  // Full logout — removes from remembered list, requires password next time
  const handleFullLogout = () => {
    const user = getCurrentUserFromStorage();
    try {
      localStorage.removeItem("currentUser");
    } catch {
      // ignore
    }
    if (user) removeRememberedSession(user);
    setCurrentUser(null);
  };

  const finishOnboarding = () => {
    const user = getCurrentUserFromStorage();
    setOnboardingSeen(true, user);
    setShowOnboarding(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow overflow-auto main-content pb-20">
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={currentUser ? "/search" : "/login"} replace />
            }
          />
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to="/search" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/shows"
            element={
              currentUser ? <ShowsList /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/movies"
            element={
              currentUser ? <MoviesList /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/search"
            element={
              currentUser ? <SearchPage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/favorites"
            element={<Navigate to="/profile" replace />}
          />
          <Route
            path="/overview"
            element={
              currentUser ? <OverviewPage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/upcoming"
            element={
              currentUser ? <UpcomingPage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/profile"
            element={
              currentUser ? (
                <ProfilePage
                  onLogout={handleLogout}
                  onFullLogout={handleFullLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Fallback route */}
          <Route
            path="*"
            element={
              <Navigate to={currentUser ? "/search" : "/login"} replace />
            }
          />
        </Routes>
      </div>
      {currentUser && <Navbar />}
      {showIntroSplash && (
        <AppIntroSplash onDone={() => setShowIntroSplash(false)} />
      )}
      {showOnboarding && <OnboardingModal onFinish={finishOnboarding} />}
    </div>
  );
}

export default App;
