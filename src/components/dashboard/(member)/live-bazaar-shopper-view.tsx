'use client';

import React, { useState } from 'react';
import { ShoppingBag, Plus, Trash2, Check, ArrowRight, DollarSign, AlertCircle } from 'lucide-react';
import { BazaarItem } from '@/src/types';
import { showSuccessAlert, showErrorAlert } from '@/src/lib/alerts';

interface LiveBazaarShopperProps {
  assignmentId: string;
  date: string;
  partnerName?: string;
  initialItems?: string[];
  budget?: number;
  token: string;
  onSubmitted?: () => void;
  onClose?: () => void;
}

export default function LiveBazaarShopperView({
  assignmentId,
  date,
  partnerName,
  initialItems = [],
  budget = 0,
  token,
  onSubmitted,
  onClose,
}: LiveBazaarShopperProps) {
  const [items, setItems] = useState<BazaarItem[]>(() => {
    return initialItems.length > 0
      ? initialItems.map((item) => ({ name: item, qty: '1', cost: 0, checked: false }))
      : [{ name: 'Rice', qty: '5 kg', cost: 0, checked: false }];
  });

  const [extraName, setExtraName] = useState('');
  const [extraQty, setExtraQty] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const handleToggleCheck = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleUpdateItem = (index: number, field: 'qty' | 'cost', value: string | number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        name: extraName.trim(),
        qty: extraQty.trim() || '1',
        cost: Number(extraCost) || 0,
        checked: true,
        isExtra: true,
      },
    ]);
    setExtraName('');
    setExtraQty('');
    setExtraCost('');
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const queueOfflineSubmission = async (payload: any) => {
    try {
      const QUEUE_KEY = 'familia_offline_bazaar_queue';
      let currentQueue: any[] = [];
      try {
        currentQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      } catch (e) {
        currentQueue = [];
      }
      currentQueue.push({ ...payload, queuedAt: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));

      await showSuccessAlert(
        'রিকোয়েস্ট গ্রহণ করা হয়েছে! (অফলাইন মোড)',
        'আপনার ডিভাইস বর্তমানে অফলাইনে আছে। বাজার সফলভাবে সংরক্ষিত হয়েছে। ইন্টারনেট সংযোগ পাওয়া মাত্রই স্বয়ংক্রিয়ভাবে ম্যানেজারের নিকট বাজার বিবরণী পৌঁছে যাবে।'
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      if (onSubmitted) onSubmitted();
    } catch (e) {
      console.error('Error saving to offline queue', e);
      showErrorAlert('Error', 'অফলাইনে তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Please add at least one bazaar item.');
      return;
    }
    setError('');
    const payload = {
      assignmentId,
      date,
      items,
      totalCost,
      remarks,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await queueOfflineSubmission(payload);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bazaar/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      await showSuccessAlert(
        'বাজার সফলভাবে জমা হয়েছে!',
        'Bazaar details submitted successfully! Awaiting manager reconciliation.'
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('Network') ||
        err?.name === 'TypeError'
      ) {
        await queueOfflineSubmission(payload);
      } else {
        setError(err.message || 'Network error');
        showErrorAlert('Error', err.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111111] border border-zinc-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-zinc-100 flex items-center gap-2">
              Live Market Shopper Mode
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Duty Date: {date}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Partner: <span className="text-zinc-200 font-semibold">{partnerName || 'Mess Partner'}</span> • Est. Budget: <span className="text-emerald-400 font-bold">৳{budget}</span>
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-200 font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Checklist Table */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              item.checked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-zinc-900/60 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleToggleCheck(idx)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                  item.checked ? 'bg-emerald-500 text-zinc-950 font-black' : 'border border-zinc-700 hover:border-zinc-500 bg-zinc-900'
                }`}
              >
                {item.checked && <Check className="w-4 h-4" />}
              </button>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${item.checked ? 'text-zinc-100 line-through text-zinc-400' : 'text-zinc-200'}`}>
                  {item.name} {item.isExtra && <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded font-mono ml-1">Extra</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Qty"
                value={item.qty || ''}
                onChange={(e) => handleUpdateItem(idx, 'qty', e.target.value)}
                className="w-16 px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-center"
              />
              <div className="relative">
                <span className="absolute left-2 top-1 text-xs text-zinc-500">৳</span>
                <input
                  type="number"
                  placeholder="0"
                  value={item.cost || ''}
                  onChange={(e) => handleUpdateItem(idx, 'cost', e.target.value)}
                  className="w-20 pl-5 pr-2 py-1 text-xs font-bold bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 text-right"
                />
              </div>
              {item.isExtra && (
                <button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Extra Item Form */}
      <form onSubmit={handleAddExtra} className="grid grid-cols-12 gap-2 p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl">
        <input
          type="text"
          placeholder="+ Add extra item..."
          value={extraName}
          onChange={(e) => setExtraName(e.target.value)}
          className="col-span-5 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200"
        />
        <input
          type="text"
          placeholder="Qty (e.g. 1kg)"
          value={extraQty}
          onChange={(e) => setExtraQty(e.target.value)}
          className="col-span-3 px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200"
        />
        <input
          type="number"
          placeholder="Price ৳"
          value={extraCost}
          onChange={(e) => setExtraCost(e.target.value)}
          className="col-span-3 px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200"
        />
        <button type="submit" className="col-span-1 flex items-center justify-center p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl cursor-pointer">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Remarks */}
      <input
        type="text"
        placeholder="Remarks/Memo details (optional)..."
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200"
      />

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 flex-wrap gap-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Spent</p>
          <p className="text-xl font-black text-emerald-400">৳{totalCost.toFixed(2)}</p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || totalCost <= 0}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          {loading ? 'Submitting...' : 'Submit Bazaar to Manager'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
