import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  mealRate: number;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  mealRate,
  onLoginClick,
  onRegisterClick,
}) => {
  return (
    <div className="container-custom min-h-[calc(100vh-64px)] flex flex-col justify-center py-6 md:py-8 lg:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 space-y-5 lg:space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-full shadow-sm tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cohesive Meal Management Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-zinc-100 leading-tight">
            Smart dining, <br />
            <span className="italic font-serif text-emerald-500">
              Perfectly managed
            </span>{" "}
            <br />
            for your familia.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
            Power Point Familia coordinates meal schedules, daily menus, and
            financial balances with absolute transparent data isolation. Built
            for families, shared apartments, and small organizations.
          </p>

          <div className="flex flex-wrap gap-4 pt-1">
            <button
              id="btn-register-hero"
              onClick={onRegisterClick}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-950/20 transition-all duration-150 flex items-center gap-2 cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick stats banner */}
          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800/80 pt-5 mt-6 lg:mt-8">
            <div>
              <p className="text-2xl sm:text-3xl font-light text-zinc-100">{mealRate}৳</p>
              <p className="text-[11px] sm:text-xs text-zinc-500 uppercase tracking-wider font-bold">
                Standard Meal Rate
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-light text-zinc-100">4 Tiers</p>
              <p className="text-[11px] sm:text-xs text-zinc-500 uppercase tracking-wider font-bold">
                RBAC Access Levels
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-light text-zinc-100">100%</p>
              <p className="text-[11px] sm:text-xs text-zinc-500 uppercase tracking-wider font-bold">
                Food Waste Free
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center lg:justify-end items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 500 500"
            className="w-full max-h-[320px] sm:max-h-[380px] lg:max-h-[440px] object-contain"
            height="100%"
          >
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                fontWeight="700"
                fill="#F8FAFC"
                letterSpacing="2"
              >
                POWER POINT
              </text>
              <text
                x="250"
                y="425"
                fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                fontSize="22"
                fontWeight="900"
                fill="#38BDF8"
                letterSpacing="6"
              >
                FAMILIA
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
