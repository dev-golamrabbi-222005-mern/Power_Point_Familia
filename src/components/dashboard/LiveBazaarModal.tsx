'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Check, 
  Camera, 
  DollarSign, 
  Calculator, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Receipt,
  Wifi,
  WifiOff
} from 'lucide-react';
import { BazaarAssignment, BazaarItem } from '@/src/types/bazaar';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/src/lib/alerts';

interface LiveBazaarModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: BazaarAssignment | null;
  token: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export default function LiveBazaarModal({
  isOpen,
  onClose,
  assignment,
  token,
  onSuccess,
  onError,
}: LiveBazaarModalProps) {
  const [items, setItems] = useState<BazaarItem[]>([]);
  const [allocatedCash, setAllocatedCash] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // New extra item input
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraQty, setExtraQty] = useState('');
  const [extraCost, setExtraCost] = useState('');

  // Process offline queued bazaar submissions
  const flushOfflineBazaarQueue = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    const QUEUE_KEY = 'familia_offline_bazaar_queue';
    let queue: any[] = [];
    try {
      queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch (e) {
      return;
    }
    if (queue.length === 0) return;

    const remaining: any[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const res = await fetch('/api/bazaar/expense', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch (e) {}

    if (synced > 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      showSuccessAlert(
        'অটো-সিঙ্ক সম্পন্ন হয়েছে!',
        `${synced}টি অফলাইনে সংরক্ষিত বাজার সফলভাবে ম্যানেজারের কাছে জমা হয়েছে!`
      );
      onSuccess?.();
    }
  }, [token, onSuccess]);

  // Track online/offline status & trigger queue flush
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        flushOfflineBazaarQueue();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Try flushing queue on mount
      if (navigator.onLine) {
        flushOfflineBazaarQueue();
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [flushOfflineBazaarQueue]);

  // Initialize data and restore draft if present
  useEffect(() => {
    if (assignment) {
      const cash = assignment.allocatedCash ?? assignment.budget ?? 0;
      setAllocatedCash(cash);

      let initialItems: BazaarItem[] = [];
      if (assignment.items && assignment.items.length > 0) {
        initialItems = assignment.items.map(i => ({
          name: i.name,
          qty: i.qty || '',
          cost: Number(i.cost || 0),
          isExtra: !!i.isExtra,
          checked: !!i.checked,
        }));
      } else if (assignment.shoppingList && assignment.shoppingList.length > 0) {
        initialItems = assignment.shoppingList.map((str: any) => ({
          name: typeof str === 'string' ? str : str.name || 'Item',
          qty: typeof str === 'object' ? str.qty || '' : '',
          cost: typeof str === 'object' ? Number(str.cost || 0) : 0,
          isExtra: false,
          checked: false,
        }));
      }

      // Check for saved local draft
      if (typeof window !== 'undefined') {
        try {
          const draftKey = `familia_bazaar_draft_${assignment.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
              setItems(parsed.items);
            } else {
              setItems(initialItems);
            }
            if (parsed.remarks) setRemarks(parsed.remarks);
            if (parsed.receiptImage) setReceiptImage(parsed.receiptImage);
            return;
          }
        } catch (e) {}
      }

      setItems(initialItems);
    }
  }, [assignment]);

  // Auto-save draft on changes
  useEffect(() => {
    if (assignment && items.length > 0 && typeof window !== 'undefined') {
      try {
        const draftKey = `familia_bazaar_draft_${assignment.id}`;
        localStorage.setItem(draftKey, JSON.stringify({ items, remarks, receiptImage }));
      } catch (e) {}
    }
  }, [assignment, items, remarks, receiptImage]);

  if (!isOpen || !assignment) return null;

  // Real-time calculations
  const totalSpent = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const returnedCash = Math.max(0, allocatedCash - totalSpent);
  const isOverBudget = totalSpent > allocatedCash;
  const deficitCash = isOverBudget ? totalSpent - allocatedCash : 0;

  const handleToggleCheck = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleItemChange = (index: number, field: 'qty' | 'cost' | 'name', value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: field === 'cost' ? Number(value) || 0 : value } : item
    ));
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExtraItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;

    setItems(prev => [
      ...prev,
      {
        name: extraName.trim(),
        qty: extraQty.trim(),
        cost: Number(extraCost) || 0,
        isExtra: true,
        checked: true,
      }
    ]);

    setExtraName('');
    setExtraQty('');
    setExtraCost('');
    setShowAddExtra(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

      // Clear draft
      try {
        localStorage.removeItem(`familia_bazaar_draft_${assignment.id}`);
      } catch (e) {}

      await showSuccessAlert(
        'রিকোয়েস্ট গ্রহণ করা হয়েছে! (অফলাইন মোড)',
        'আপনার ডিভাইস বর্তমানে অফলাইনে আছে। বাজার সফলভাবে সংরক্ষিত হয়েছে। ইন্টারনেট সংযোগ পাওয়া মাত্রই স্বয়ংক্রিয়ভাবে ম্যানেজারের নিকট বাজার বিবরণী পৌঁছে যাবে।'
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('Error saving to offline queue', e);
      showErrorAlert('Error', 'অফলাইনে তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      showWarningAlert('No Items', 'Please add at least one purchased item.');
      return;
    }

    const payload = {
      assignmentId: assignment.id,
      date: assignment.date,
      allocatedCash,
      returnedCash,
      totalCost: totalSpent,
      items,
      remarks,
      receiptImage,
    };

    // If device is offline right now, queue directly
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await queueOfflineSubmission(payload);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/bazaar/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit bazaar bill');
      }

      // Clear draft on successful submit
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`familia_bazaar_draft_${assignment.id}`);
        } catch (e) {}
      }

      await showSuccessAlert(
        'বাজার বিল জমা হয়েছে!',
        'Bazaar bill submitted successfully! Awaiting manager reconciliation.'
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.warn('Submission network failed, checking if offline queue fallback is appropriate', err);
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('Network') ||
        err?.name === 'TypeError'
      ) {
        await queueOfflineSubmission(payload);
      } else {
        showErrorAlert('Submission Error', err.message || 'Error submitting bazaar bill');
        onError?.(err.message || 'Error submitting bazaar bill');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <ShoppingBag className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  Live Market Mode (লাইভ কাঁচাবাজার)
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Mobile Dock</span>
                </h2>
                {isOnline ? (
                  <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-200" /> অনলাইন
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/30 text-amber-100 border border-amber-400/40 text-[10px] font-bold rounded-full flex items-center gap-1 animate-pulse">
                    <WifiOff className="w-3 h-3 text-amber-200" /> অফলাইন মোড
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 opacity-90">
                Date: {assignment.date} | Assigned: {assignment.userName || 'Member 1'}
                {assignment.member2Name && ` & ${assignment.member2Name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Manager Cash Handover Banner */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-amber-800 dark:text-amber-200 font-bold">Manager Handover Cash (ক্যাশ গ্রহণ)</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">ম্যানেজারের থেকে নেওয়া মোট টাকা</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-extrabold text-amber-900 dark:text-amber-100 font-mono">
                ৳{allocatedCash}
              </span>
            </div>
          </div>

          {/* Checklist Instructions */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>Grocery Checklist (বাজারের ফর্দ ও প্রকৃত হিসাব)</span>
              <span className="text-xs font-normal text-zinc-400">({items.length} items)</span>
            </h3>
            <button
              onClick={() => setShowAddExtra(!showAddExtra)}
              className="text-xs px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Extra Item (+)</span>
            </button>
          </div>

          {/* Inline Add Extra Item Form */}
          {showAddExtra && (
            <form onSubmit={handleAddExtraItem} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-emerald-500/40 rounded-xl space-y-2.5">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> তালিকার বাইরে নতুন আইটেম যুক্ত করুন (Extra Item)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Item Name (e.g. কাঁচামরিচ)"
                  value={extraName}
                  onChange={(e) => setExtraName(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Quantity (e.g. 250 gm)"
                  value={extraQty}
                  onChange={(e) => setExtraQty(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Cost ৳ (e.g. 30)"
                  value={extraCost}
                  onChange={(e) => setExtraCost(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExtra(false)}
                  className="text-xs px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          )}

          {/* Items Checklist Table/Cards */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                কোনো আইটেম নেই। "Add Extra Item (+)" বাটনে ক্লিক করে আইটেম যোগ করুন।
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    item.checked
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60'
                  }`}
                >
                  {/* Left: Checkbox & Name */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(idx)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        item.checked
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500'
                      }`}
                    >
                      {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          item.checked 
                            ? 'line-through text-emerald-800 dark:text-emerald-300 opacity-80' 
                            : 'text-zinc-900 dark:text-white'
                        }`}>
                          {item.name}
                        </span>
                        {item.isExtra && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md font-extrabold border border-orange-500/20">
                            Extra Item
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity, Cost Input & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Qty (2kg)"
                      value={item.qty || ''}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-20 px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                    />

                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-zinc-400">৳</span>
                      <input
                        type="number"
                        placeholder="Cost"
                        value={item.cost || ''}
                        onChange={(e) => handleItemChange(idx, 'cost', e.target.value)}
                        className="w-24 pl-5 pr-2 py-1 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Receipt / Memo Photo & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>Market Receipt / Memo Photo (মেমোর ছবি)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-500/20 cursor-pointer"
              />
              {receiptImage && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={receiptImage} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Remarks / Notes for Manager (মন্তব্য)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="যেমন: আলুর দাম কম ছিল, পেঁয়াজের দাম কিছুটা বেশি..."
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Smart Live Calculator Bottom Footer */}
        <div className="bg-zinc-50 dark:bg-zinc-800/80 p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
          {/* Live Summary Bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Cash Given</p>
              <p className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">৳{allocatedCash}</p>
            </div>

            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">Actual Spent</p>
              <p className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono">৳{totalSpent}</p>
            </div>

            <div className={`p-2 rounded-xl border ${
              isOverBudget
                ? 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-600 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-600 dark:text-emerald-400'
            }`}>
              <p className="text-[10px] font-bold uppercase">
                {isOverBudget ? 'Deficit (ঘাটতি)' : 'Cash Return (ফেরত)'}
              </p>
              <p className="text-sm sm:text-base font-extrabold font-mono">
                ৳{isOverBudget ? deficitCash : returnedCash}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Bazaar Bill (হিসাব জমা দিন)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
