'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Trash2, Check, DollarSign, AlertCircle } from 'lucide-react';
import { BazaarExpense, BazaarItem } from '@/src/types';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/src/lib/alerts';

interface EditBazaarExpenseModalProps {
  expense: BazaarExpense & { userName?: string; partnerName?: string };
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBazaarExpenseModal({
  expense,
  token,
  onClose,
  onSuccess,
}: EditBazaarExpenseModalProps) {
  const [items, setItems] = useState<BazaarItem[]>(
    Array.isArray(expense.items) && expense.items.length > 0
      ? [...expense.items]
      : [{ name: 'Bazaar Item', cost: expense.totalCost || 0 }]
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [remarks, setRemarks] = useState(expense.remarks || '');
  const [saving, setSaving] = useState(false);

  const totalSpent = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCost || Number(newItemCost) <= 0) {
      showWarningAlert('ইনভ্যালিড আইটেম', 'আইটেমের নাম এবং সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        name: newItemName.trim(),
        cost: Number(newItemCost),
        qty: '',
        isExtra: false,
        checked: true,
      },
    ]);
    setNewItemName('');
    setNewItemCost('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemCost = (index: number, newCost: string) => {
    const val = Number(newCost) || 0;
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, cost: val } : item)));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      showWarningAlert('কোনো আইটেম নেই', 'কমপক্ষে একটি বাজারের আইটেম তালিকায় থাকতে হবে');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/bazaar/expense', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: expense.id,
          items,
          totalCost: totalSpent,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      await showSuccessAlert('বাজার সফলভাবে সংশোধন হয়েছে!', 'Bazaar updated successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Failed to update bazaar details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Edit Bazaar Details (বাজারের হিসাব সংশোধন)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Duty Date: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{expense.date}</span>
              {expense.partnerName && ` • Partner: ${expense.partnerName}`}
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>ম্যানেজার অনুমোদন দেওয়ার আগ পর্যন্ত এই বাজারের হিসাব সংশোধন করা যাবে।</span>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Purchased Items ({items.length})
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                  {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-400">৳</span>
                    <input
                      type="number"
                      value={item.cost}
                      onChange={(e) => handleUpdateItemCost(idx, e.target.value)}
                      className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-right font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Item Input */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            placeholder="Add item (e.g. Potato 2kg)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
          <input
            type="number"
            placeholder="৳ Cost"
            value={newItemCost}
            onChange={(e) => setNewItemCost(e.target.value)}
            className="w-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Remarks / Note
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Bought from local bazaar"
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Total Spend Summary */}
        <div className="flex items-center justify-between p-3.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-2xl">
          <span className="text-xs font-bold text-orange-900 dark:text-orange-200">Total Bazaar Cost:</span>
          <span className="text-lg font-black text-orange-600 dark:text-orange-400">৳{totalSpent}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes (সংরক্ষণ করুন)'}
          </button>
        </div>
      </div>
    </div>
  );
}
