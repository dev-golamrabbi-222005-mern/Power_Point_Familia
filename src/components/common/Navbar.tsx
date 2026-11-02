"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { PPFLogo } from "@/src/components/shared/PPFLogo";
import {
  LayoutDashboard,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  Settings,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center group">
            <PPFLogo size="md" className="transition-transform group-hover:scale-105" />
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/60">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user && (
              <Link
                href="/dashboard"
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/dashboard")
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            )}
          </div>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-zinc-200 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[9px] text-zinc-500 capitalize font-mono">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-zinc-800">
                      <p className="text-xs font-bold text-zinc-200">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <Settings className="w-4 h-4 text-emerald-400" />
                      Profile Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Join Us
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
