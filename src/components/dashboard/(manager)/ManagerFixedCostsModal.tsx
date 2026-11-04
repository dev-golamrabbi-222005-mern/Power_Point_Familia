import React, { useState, useEffect } from 'react';
import { X, Receipt, Plus, Sparkles } from 'lucide-react';
import { User as UserType } from '@/src/types';

interface ManagerFixedCostsModalProps {
  user: UserType | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  assignRent: string;
  setAssignRent: (v: string) => void;
  assignElectricity: string;
  setAssignElectricity: (v: string) => void;
  assignWifi: string;
  setAssignWifi: (v: string) => void;
  assignGas: string;
  setAssignGas: (v: string) => void;
  assignServant: string;
  setAssignServant: (v: string) => void;
  assignExtraCost: string;
  setAssignExtraCost: (v: string) => void;
  assignExtraReason: string;
  setAssignExtraReason: (v: string) => void;
  assignPastDue: string;
  setAssignPastDue: (v: string) => void;
  assigningFixed: boolean;
}

export const ManagerFixedCostsModal: React.FC<ManagerFixedCostsModalProps> = ({
  user,
  onClose,
  onSubmit,
  assignRent,
  setAssignRent,
  assignElectricity,
  setAssignElectricity,
  assignWifi,
  setAssignWifi,
  assignGas,
  setAssignGas,
  assignServant,
  setAssignServant,
  assignExtraCost,
  setAssignExtraCost,
  assignExtraReason,
  setAssignExtraReason,
  assignPastDue,
  setAssignPastDue,
  assigningFixed,
}) => {
  const [showExtraField, setShowExtraField] = useState(Boolean(assignExtraCost || assignExtraReason));

  useEffect(() => {
    if (assignExtraCost || assignExtraReason) {
      setShowExtraField(true);
    } else {
      setShowExtraField(false);
    }
  }, [user, assignExtraCost, assignExtraReason]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Assign Fixed Costs & Due</h3>
            <p className="text-xs text-zinc-400">For member: <span className="text-emerald-400 font-bold">{user.name}</span></p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {/* 2x3 Grid of Standard Fixed Costs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">House Rent (৳)</label>
              <input
                type="number"
                value={assignRent}
                onChange={(e) => setAssignRent(e.target.value)}
                placeholder="e.g. 3500"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Electricity (৳)</label>
              <input
                type="number"
                value={assignElectricity}
                onChange={(e) => setAssignElectricity(e.target.value)}
                placeholder="e.g. 400"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Wi-Fi Bill (৳)</label>
              <input
                type="number"
                value={assignWifi}
                onChange={(e) => setAssignWifi(e.target.value)}
                placeholder="e.g. 200"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Gas / Utility (৳)</label>
              <input
                type="number"
                value={assignGas}
                onChange={(e) => setAssignGas(e.target.value)}
                placeholder="e.g. 300"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Cook / Servant (৳)</label>
              <input
                type="number"
                value={assignServant}
                onChange={(e) => setAssignServant(e.target.value)}
                placeholder="e.g. 800"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">Past Month Due (৳)</label>
              <input
                type="number"
                value={assignPastDue}
                onChange={(e) => setAssignPastDue(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Full Width + Add Extra Cost Button & Expandable Fields */}
          {!showExtraField ? (
            <button
              type="button"
              onClick={() => setShowExtraField(true)}
              className="w-full py-2.5 px-3 bg-zinc-950/80 hover:bg-zinc-800/80 border border-dashed border-zinc-700/80 hover:border-emerald-500/60 rounded-xl text-xs font-bold text-zinc-300 hover:text-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Extra Cost</span>
            </button>
          ) : (
            <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Extra Cost Details
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtraField(false);
                    setAssignExtraCost('');
                    setAssignExtraReason('');
                  }}
                  className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Cost Reason / Description (কি জন্য)
                </label>
                <input
                  type="text"
                  value={assignExtraReason}
                  onChange={(e) => setAssignExtraReason(e.target.value)}
                  placeholder="e.g. ময়লা বিল / পানির ফিল্টার / মেরামত"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Extra Amount (কয় টাকা - ৳)
                </label>
                <input
                  type="number"
                  value={assignExtraCost}
                  onChange={(e) => setAssignExtraCost(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigningFixed}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {assigningFixed ? 'Assigning...' : 'Save & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
