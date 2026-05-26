"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, CheckCircle } from "lucide-react";

export default function PricingPage() {
  // 👑 unit_price を廃止し、gross_price と net_price の完全独立2軸に変更！
  const [prices, setPrices] = useState<{ partner_name: string; gross_price: number; net_price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    fetch("/api/pricing")
      .then(res => res.json())
      .then(data => {
        setPrices(data.special_prices || []);
        setLoading(false);
      });
  }, []);

  const handleAdd = () => {
    // 👑 新規追加時もグロスとネットの2軸を用意
    setPrices([{ partner_name: "", gross_price: 15000, net_price: 12000 }, ...prices]);
  };

  const handleRemove = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: "partner_name" | "gross_price" | "net_price", value: string | number) => {
    const newPrices = [...prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setPrices(newPrices);
  };

  const handleSave = async () => {
    setSaving(true);
    const validPrices = prices.filter(p => p.partner_name.trim() !== "");
    await fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ special_prices: validPrices }),
    });
    setPrices(validPrices);
    setSaving(false);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">手動・特殊単価設定 展開中...</div>;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">手動・特殊単価設定</h1>
        <button 
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
        >
          {saving ? <span className="animate-pulse">保存中...</span> : savedStatus ? <><CheckCircle size={16}/> 保存完了</> : <><Save size={16} /> 設定を保存</>}
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all">
        <button onClick={handleAdd} className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 font-black text-sm rounded-lg transition-colors border border-slate-200 dark:border-slate-800">
          <Plus size={16} /> 新規パートナーを追加
        </button>

        <div className="space-y-3">
          {prices.length === 0 && <p className="text-sm font-bold text-slate-400">現在設定されている特別単価はありません。</p>}
          {prices.map((item, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-1">パートナー名 (完全一致)</label>
                <input type="text" value={item.partner_name} onChange={(e) => handleChange(idx, "partner_name", e.target.value)} placeholder="例: QUORIZa専用サイトA" className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              
              {/* 👑 自社出費（グロス）の入力欄 */}
              <div className="w-40">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-1">税込グロス(出費・円)</label>
                <input type="number" value={item.gross_price} onChange={(e) => handleChange(idx, "gross_price", Number(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-black text-sm text-red-500 dark:text-red-400 focus:border-indigo-500 focus:outline-none" />
              </div>

              {/* 👑 アフィリエイター報酬（ネット）の入力欄 */}
              <div className="w-40">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-1">税込ネット(報酬・円)</label>
                <input type="number" value={item.net_price} onChange={(e) => handleChange(idx, "net_price", Number(e.target.value))} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-black text-sm text-emerald-500 dark:text-emerald-400 focus:border-indigo-500 focus:outline-none" />
              </div>

              <button onClick={() => handleRemove(idx)} className="mt-5 p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}