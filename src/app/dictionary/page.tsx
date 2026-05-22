"use client";

import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  BookOpen, Plus, Trash2, Save, Search, 
  ShieldCheck, AlertCircle, Info
} from "lucide-react";

export default function VLHDictionaryPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [dictionary, setDictionary] = useState<any>({ master_partners: [] });
  const [newMasterName, setNewMasterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success'|'error'|null, msg: string }>({ type: null, msg: "" });

  useEffect(() => {
    const fetchDict = async () => {
      try {
        const res = await fetch("/api/dictionary");
        if (res.ok) {
          const data = await res.json();
          setDictionary(data);
        }
      } catch (e) {
        console.error("データ通信に失敗しました。");
      }
    };
    fetchDict();
  }, []);

  const handleSave = async (updatedDict: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDict),
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: "紐付け設定が正常に反映・保存されました！" });
        setTimeout(() => setStatus({ type: null, msg: "" }), 3000);
      }
    } catch (e) {
      setStatus({ type: 'error', msg: "保存に失敗しました。サーバー通信網を確認してください。" });
    } finally {
      setLoading(false);
    }
  };

  const addMaster = () => {
    if (!newMasterName) return;
    const updated = {
      ...dictionary,
      master_partners: [
        { real_name: newMasterName, aliases: [] },
        ...dictionary.master_partners
      ]
    };
    setDictionary(updated);
    setNewMasterName("");
    handleSave(updated);
  };

  const addAlias = (masterIdx: number, alias: string) => {
    if (!alias) return;
    const updated = { ...dictionary };
    updated.master_partners[masterIdx].aliases.push(alias);
    setDictionary(updated);
    handleSave(updated);
  };

  const removeAlias = (masterIdx: number, aliasIdx: number) => {
    const updated = { ...dictionary };
    updated.master_partners[masterIdx].aliases.splice(aliasIdx, 1);
    setDictionary(updated);
    handleSave(updated);
  };

  const removeMaster = (masterIdx: number) => {
    if (!confirm("この統合設定を削除しますか？紐付けデータが失われます。")) return;
    const updated = { ...dictionary };
    updated.master_partners.splice(masterIdx, 1);
    setDictionary(updated);
    handleSave(updated);
  };

  return (
    <div className="w-full">
      <header className="hidden md:flex px-8 py-6 mb-8 rounded-2xl flex justify-between items-center border transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">パートナー紐付け設定</h1>
          </div>
        </div>
        
        {status.type && (
          <div className={`px-6 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 font-black text-sm ${status.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
            {status.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            {status.msg}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左翼：新規登録カード */}
        {/* 💡 核心バグ粉砕：stickyを「lg:sticky lg:top-8」へと完全限定！！これでモバイル時の突っ張り棒ロック（島が動かない現象）が2000%消滅します！ */}
        <div className={`p-8 rounded-3xl border h-fit lg:sticky lg:top-8 transition-all ${isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#1e293b] border-slate-800 shadow-xl"}`}>
          <h2 className="text-lg font-black mb-6 flex items-center gap-2">
            <Plus size={20} className="text-indigo-500" /> 新規グループを作成
          </h2>
          <p className="text-xs text-slate-400 font-bold mb-4 leading-relaxed">
            複数のASPや異なるメディア名で活動しているパートナーを、1つの「まとめ用の名前」で合算するための箱を作成します。
          </p>
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="例：お宝脱毛特化ブログ（渡辺）"
              value={newMasterName}
              onChange={(e) => setNewMasterName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-[#0f172a] dark:border-slate-700 font-black text-base focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              onClick={addMaster}
              disabled={!newMasterName || loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> グループ名を登録
            </button>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex gap-3 text-indigo-500">
              <Info size={20} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-black mb-1">システム管理規律</p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                  ここで登録した「まとめ用の名前」が、パートナー別詳細画面やランキングでの統合表示名となります。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 右翼：紐付け設定一覧 */}
        <div className="lg:col-span-2 space-y-6">
          {dictionary.master_partners.length === 0 ? (
            <div className="p-20 text-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px]">
              <div className="w-20 h-20 bg-slate-100 dark:bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                <Search size={40} />
              </div>
              <p className="text-lg font-black text-slate-400">紐付け用グループがまだ登録されていません。</p>
            </div>
          ) : (
            dictionary.master_partners.map((master: any, mIdx: number) => (
              <div key={mIdx} className={`p-8 rounded-[32px] border group transition-all ${isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#1e293b] border-slate-800 shadow-xl"}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black mt-2 text-slate-900 dark:text-white">{master.real_name}</h3>
                  </div>
                  <button 
                    onClick={() => removeMaster(mIdx)}
                    className="p-3 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {master.aliases.map((alias: string, aIdx: number) => (
                      <div key={aIdx} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 group/alias">
                        <span className="text-sm font-bold">{alias}</span>
                        <button onClick={() => removeAlias(mIdx, aIdx)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="まとめたいASP側のサイト名、またはメディアIDを入力してEnter..."
                      className="flex-1 px-4 py-3 rounded-xl border bg-slate-50 dark:bg-[#0f172a]/50 border-slate-200 dark:border-slate-700 font-bold text-sm outline-none"
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                          addAlias(mIdx, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}