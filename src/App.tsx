import React, { useState, useEffect } from "react";
import { User, MealMenu, DashboardStats } from "./types";
import Hero from "./components/Hero";
import AuthModal from "./components/AuthModal";
import DashboardLayout from "./components/DashboardLayout";
import GuestDashboard from "./components/GuestDashboard";
import MemberDashboard from "./components/MemberDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { Utensils, Shield, KeyRound, Sparkles } from "lucide-react";
import { PPFLogo } from "./components/shared/PPFLogo";
import { showErrorAlert } from "./lib/alerts";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // App-wide data state
  const [menus, setMenus] = useState<MealMenu[]>([]);
  const [mealRate, setMealRate] = useState<number>(45);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  // Modal triggers
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  // Load user session from local storage on startup
  useEffect(() => {
    const storedToken = localStorage.getItem("familia_token");
    const storedUser = localStorage.getItem("familia_user");

    const verifySession = async () => {
      if (storedToken && storedUser) {
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = {};
          }
          if (response.ok && data.user) {
            setUser(data.user);
            setToken(storedToken);
          } else {
            // Token expired or invalid
            localStorage.removeItem("familia_token");
            localStorage.removeItem("familia_user");
          }
        } catch (err) {
          console.error("Session validation error", err);
        }
      }
      setAppLoading(false);
    };

    verifySession();
  }, []);

  // Fetch collective global menus and settings
  const fetchGlobalData = async (activeToken?: string | null) => {
    const bearerToken = activeToken || token;
    if (!bearerToken) return;

    try {
      // 1. Menus
      const menusRes = await fetch("/api/menu", {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (menusRes.ok) {
        const menusData = await menusRes.json();
        setMenus(menusData);
      }

      // 2. Meal settings rate
      const settingsRes = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setMealRate(settingsData.mealRate || 45);
      }

      // 3. User & System aggregates
      const statsRes = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Global data fetch error", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGlobalData();
    }
  }, [token]);

  const handleAuthSuccess = (loggedUser: User, loggedToken: string) => {
    setUser(loggedUser);
    setToken(loggedToken);
    localStorage.setItem("familia_token", loggedToken);
    localStorage.setItem("familia_user", JSON.stringify(loggedUser));
    fetchGlobalData(loggedToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setStats(null);
    localStorage.removeItem("familia_token");
    localStorage.removeItem("familia_user");
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("familia_user", JSON.stringify(updatedUser));
  };

  // Render proper dashboard according to role
  const renderDashboardByRole = () => {
    if (!user || !token) return null;

    switch (user.role) {
      case "admin":
        return (
          <AdminDashboard
            user={user}
            token={token}
            mealRate={mealRate}
            onRefreshSettings={() => fetchGlobalData()}
          />
        );
      case "manager":
        return (
          <ManagerDashboard
            user={user}
            token={token}
            menus={menus}
            mealRate={mealRate}
            onRefreshMenus={() => fetchGlobalData()}
          />
        );
      case "member":
        return (
          <MemberDashboard
            user={user}
            token={token}
            menus={menus}
            mealRate={mealRate}
            onRefreshStats={() => fetchGlobalData()}
          />
        );
      case "user":
      default:
        return (
          <GuestDashboard
            user={user}
            stats={stats}
          />
        );
    }
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-display font-bold text-zinc-100">
          Booting Power Point Familia...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Brand Header for Landing page */}
      {!user && (
        <nav className="bg-[#0f0f0f]/95 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 py-4 shadow-xl shadow-black/15">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
            {/* Could be used this logo as a Banner  */}
            {/* <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 500 500"
                width="100%"
                height="100%"
              >
                <defs>
                  <linearGradient
                    id="bgGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#0F172A" />
                    <stop offset="100%" stopColor="#1E293B" />
                  </linearGradient>

                  <linearGradient
                    id="primaryGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>

                  <linearGradient
                    id="accentGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FB923C" />
                    <stop offset="100%" stopColor="#EA580C" />
                  </linearGradient>

                  <filter
                    id="dropShadow"
                    x="-10%"
                    y="-10%"
                    width="120%"
                    height="120%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="8"
                      stdDeviation="6"
                      floodColor="#000000"
                      floodOpacity="0.3"
                    />
                  </filter>
                </defs>

                <rect width="500" height="500" rx="80" fill="url(#bgGrad)" />

                <circle
                  cx="250"
                  cy="210"
                  r="140"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                />

                <g filter="url(#dropShadow)">
                  <path
                    d="M 140 180 L 250 80 L 360 180"
                    fill="none"
                    stroke="url(#primaryGrad)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="250"
                    cy="225"
                    r="65"
                    fill="#0F172A"
                    stroke="url(#primaryGrad)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="250"
                    cy="225"
                    r="45"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />

                  <path
                    d="M 230 205 V 230 M 224 205 V 218 M 236 205 V 218"
                    stroke="url(#accentGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 270 230 V 215 A 8 10 0 0 0 270 198 A 8 10 0 0 0 270 215"
                    fill="url(#accentGrad)"
                    stroke="url(#accentGrad)"
                    strokeWidth="2"
                  />

                  <path
                    d="M 250 60 L 242 82 L 258 78 Z"
                    fill="url(#accentGrad)"
                  />
                </g>

                <g textAnchor="middle">
                  <rect
                    x="180"
                    y="320"
                    width="140"
                    height="36"
                    rx="18"
                    fill="url(#accentGrad)"
                  />
                  <text
                    x="250"
                    y="344"
                    fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    fontSize="18"
                    fontWeight="900"
                    fill="#FFFFFF"
                    letterSpacing="4"
                  >
                    PPF
                  </text>

                  <text
                    x="250"
                    y="395"
                    fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    fontSize="24"
                    fontWeight="800"
                    fill="#F8FAFC"
                    letterSpacing="2"
                  >
                    POWER POINT
                  </text>
                  <text
                    x="250"
                    y="425"
                    fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    fontSize="16"
                    fontWeight="600"
                    fill="#38BDF8"
                    letterSpacing="6"
                  >
                    FAMILIA
                  </text>
                </g>
              </svg> */}
            <PPFLogo />

            <div className="flex items-center gap-3">
              <a
                href="/about"
                className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
              >
                About
              </a>
              <a
                href="/contact"
                className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
              >
                Contact
              </a>
              <div className="flex gap-2 ml-2">
                <button
                  id="header-login"
                  onClick={() => {
                    setAuthTab("login");
                    setIsAuthOpen(true);
                  }}
                  className="px-4 py-2 hover:bg-zinc-850 text-zinc-200 text-xs font-bold rounded-xl transition-all border border-zinc-800 shadow-3xs cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  id="header-register"
                  onClick={() => {
                    setAuthTab("register");
                    setIsAuthOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main viewport */}
      <div className="flex-1">
        {user && token ? (
          <DashboardLayout
            user={user}
            token={token}
            stats={stats}
            onLogout={handleLogout}
            onProfileUpdated={handleProfileUpdated}
          >
            {renderDashboardByRole()}
          </DashboardLayout>
        ) : (
          <Hero
            onLoginClick={() => {
              setAuthTab("login");
              setIsAuthOpen(true);
            }}
            onRegisterClick={() => {
              setAuthTab("register");
              setIsAuthOpen(true);
            }}
            menus={menus}
            mealRate={mealRate}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Global Landing Footer */}
      {!user && (
        <footer className="bg-[#09090b] border-t border-zinc-800/85 py-10 mt-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center">
              <PPFLogo />
            </div>

            <div className="flex items-center gap-6">
              <a
                href="/about"
                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
              >
                About
              </a>
              <a
                href="/contact"
                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
              >
                Contact
              </a>
              <p className="text-[11px] text-zinc-500 font-mono text-center md:text-right">
                Secured with JWT & PBKDF2. Powered by Next.js, TypeScript &
                MongoDB.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
