import React from 'react';
import { User, DashboardStats } from '../types';
import { Clock, ShieldAlert, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface GuestDashboardProps {
  user: User;
  stats?: DashboardStats | null;
  token?: string;
  onRefreshUser?: () => void;
}

export default function GuestDashboard({ user, stats, token, onRefreshUser }: GuestDashboardProps) {
  const currentStatus = user.status;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner Greeting */}
      <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/6 opacity-10">
          <Clock className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-700 text-white font-bold text-xs rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Approval</span>
          </div>
          <h2 className="section-title">
            Hello, {user.name}!
          </h2>
          <p className="text-emerald-50 text-sm">
            Welcome to Power Point Familia. Your account is successfully registered in the system! You are currently classified under the guest tier.
          </p>
        </div>
      </div>

      {/* Account Status Card */}
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg text-zinc-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Registration Status & Workspace Info
          </h3>
          
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-zinc-200">Pending Member Elevation</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Only recognized Familia Members can book meals and deposit funds. Once the system Admin verifies your credentials, they will elevate your role to <strong>Member</strong>, granting full ledger access.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Account Credentials:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-950/50 p-3 rounded-lg border border-zinc-850/80 font-mono">
              <div>
                <span className="text-zinc-500">Email:</span> <span className="text-zinc-350 font-semibold">{user.email}</span>
              </div>
              <div>
                <span className="text-zinc-500">Phone:</span> <span className="text-zinc-350 font-semibold">{user.phone}</span>
              </div>
              <div>
                <span className="text-zinc-500">Tier:</span> <span className="text-emerald-400 font-bold capitalize">{user.role}</span>
              </div>
              <div>
                <span className="text-zinc-500">Status:</span> <span className="text-emerald-400 font-bold capitalize">{user.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/85 pt-5 mt-6 flex items-center justify-between text-xs text-zinc-500">
          <span>You can update your personal Name and Phone in the Profile Settings anytime.</span>
        </div>
      </div>

    </div>
  );
}
