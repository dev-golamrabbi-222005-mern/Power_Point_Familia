import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface HeroBannerProps {
  mealRate: number;
  onLoginClick: () => void;
  onRegisterClick?: () => void;
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
              onClick={onLoginClick}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/20 transition-all duration-150 flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started</span>
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
          <Image src="/ppf.png" alt="" width={500} height={500} />
        </div>
      </div>
    </div>
  );
};
