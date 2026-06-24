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
import WidgetPreviewPage from "./components/WidgetPreviewPage";
import OnboardingModal from "./components/OnboardingModal";
import AppIntroSplash from "./components/AppIntroSplash";
import SearchOnboardingCoach from "./components/SearchOnboardingCoach";
import "./index.css";
import { applyThemePreference, getStoredThemePreference } from "./utils/theme";
import { getOnboardingSeen, setOnboardingSeen } from "./utils/appPreferences";
import { supabase } from "./utils/supabaseClient";
import { deriveDisplayName, signOutUser } from "./utils/supabaseAuth";

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
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showIntroSplash, setShowIntroSplash] = useState(true);
  const [onboardingStage, setOnboardingStage] = useState("none");
  const [introStartStep, setIntroStartStep] = useState(0);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const onAppInstalled = () => {
      setInstallPromptEvent(null);
    };

    const standaloneMatch = window.matchMedia?.(
      "(display-mode: standalone)",
    )?.matches;
    setIsStandalone(Boolean(standaloneMatch || window.navigator.standalone));

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const choiceResult = await installPromptEvent.userChoice;

    if (choiceResult?.outcome === "accepted") {
      setInstallPromptEvent(null);
    }
  };

  useEffect(() => {
    let active = true;

    // Bridge the Supabase session to the rest of the app, which still keys
    // per-user data (theme, avatars, watched/favorites) off a display name in
    // localStorage. When signed in we mirror the session's name there; when
    // signed out we clear it.
    const applySession = (session) => {
      const displayName = deriveDisplayName(session?.user || null);

      try {
        if (displayName) {
          localStorage.setItem("currentUser", JSON.stringify(displayName));
        } else {
          localStorage.removeItem("currentUser");
        }
      } catch {
        // ignore
      }

      if (!active) return;
      setCurrentUser(displayName);
      applyThemePreference(getStoredThemePreference(displayName));
      setAuthReady(true);
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      applySession(session),
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setOnboardingStage("none");
      return;
    }

    const user = getCurrentUserFromStorage();
    setOnboardingStage(getOnboardingSeen(user) ? "none" : "intro");
  }, [pathname, currentUser]);

  // Kept for the legacy in-app account switch (Profile/Settings). The primary
  // login flow now goes through Supabase in LoginPage, and the session
  // listener above is what actually drives `currentUser`.

  // Sign out of Supabase; the session listener clears `currentUser` and the
  // route guards redirect to /login.
  const handleFullLogout = () => {
    signOutUser();
  };

  const completeOnboarding = () => {
    const user = getCurrentUserFromStorage();
    setOnboardingSeen(true, user);
    setOnboardingStage("none");
    setIntroStartStep(0);
  };

  const continueOnboarding = () => {
    setIntroStartStep(0);
    setOnboardingStage("coach");
  };

  const backToIntroFromCoach = () => {
    setIntroStartStep(2);
    setOnboardingStage("intro");
  };

  if (!authReady) {
    return <div className="h-screen bg-black" />;
  }

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
              currentUser ? <Navigate to="/search" replace /> : <LoginPage />
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
          <Route path="/widget-preview" element={<WidgetPreviewPage />} />
          <Route
            path="/profile"
            element={
              currentUser ? (
                <ProfilePage onFullLogout={handleFullLogout} />
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
      {installPromptEvent && !isStandalone && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-white/10 bg-black/90 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Installera appen</div>
              <div className="text-white/75">
                Använd den riktiga installeringen för bättre stabilitet på
                Android.
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Installera
            </button>
          </div>
        </div>
      )}
      {currentUser && <Navbar />}
      {showIntroSplash && (
        <AppIntroSplash onDone={() => setShowIntroSplash(false)} />
      )}
      {onboardingStage === "intro" && (
        <OnboardingModal
          onSkip={() => completeOnboarding()}
          onContinue={continueOnboarding}
          initialStep={introStartStep}
          totalSteps={6}
          stepOffset={0}
        />
      )}
      {currentUser && onboardingStage === "coach" && !showIntroSplash && (
        <SearchOnboardingCoach
          open
          onComplete={completeOnboarding}
          onSkip={() => completeOnboarding()}
          onBackToIntro={backToIntroFromCoach}
          totalSteps={6}
          stepOffset={3}
        />
      )}
    </div>
  );
}

export default App;
