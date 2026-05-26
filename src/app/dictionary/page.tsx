"use client";

import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  BookOpen, Plus, Trash2, Save, Search, 
  ShieldCheck, AlertCircle, Info, ExternalLink
} from "lucide-react";

export default function VLHDictionaryPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [dictionary, setDictionary] = useState<any>({ master_partners: [] });
  const [newMasterName, setNewMasterName] = useState("");
  const [loading, setLoading] = useState<boolean>(true); 
  const [status, setStatus] = useState<{ type: 'success'|'error'|null, msg: string }>({ type: null, msg: "" });

  useEffect(() => {
    const fetchDict = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dictionary?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setDictionary(data);
        }
      } catch (e) {
        console.error("データ通信に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchDict();
  }, []);

  const handleSave = async (updatedDict: any) => {
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
    }
  };

  const addMaster = () => {
    if (!newMasterName) return;
    const updated = {
      ...dictionary,
      master_partners: [
        { real_name: newMasterName, aliases: [], backlog_issue_key: "" },
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

  // カンマ区切りの文字列を分解して、各チケットへの直行URLオブジェクト配列を動的錬成する関数
  const parseBacklogKeys = (keysString: string) => {
    if (!keysString) return [];
    return keysString
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k !== "")
      .map((key, index, arr) => {
        const isLatest = index === arr.length - 1;
        return {
          key,
          label: arr.length === 1 ? "課題スレッド" : isLatest ? "最新スレッド" : `過去ログ Vol.${index + 1}`,
          isLatest,
          url: `https://mkg.backlog.com/view/${key}`
        };
      });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">パートナー統合設定 展開中...</div>;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">パートナー統合設定</h1>
        {status.type && (
          <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 font-black text-xs ${status.type === 'success' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400" : "bg-red-500/10 text-red-500 border border-red-500/20 dark:text-red-400"}`}>
            {status.msg}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左翼：新規登録カード */}
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl h-fit lg:sticky lg:top-8 shadow-sm transition-all space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <Plus size={20} className="text-indigo-500" /> 新規グループを作成
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            複数のASPや異なるメディア名で活動しているパートナーを、1つの「まとめ用の名前」で合算するための箱を作成します。
          </p>
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="例：お宝脱毛特化ブログ"
              value={newMasterName}
              onChange={(e) => setNewMasterName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-600 font-black text-base transition-all"
            />
            <button 
              onClick={addMaster}
              disabled={!newMasterName}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> グループ名を登録
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 dark:bg-indigo-950/20 dark:border-indigo-500/20">
            <div className="flex gap-3 text-indigo-600 dark:text-indigo-400">
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
            <div className="p-20 text-center border-4 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[40px] shadow-sm transition-all">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                <Search size={40} />
              </div>
              <p className="text-lg font-black text-slate-400 dark:text-slate-500">紐付け用グループがまだ登録されていません。</p>
            </div>
          ) : (
            dictionary.master_partners.map((master: any, mIdx: number) => {
              const linkedIssues = parseBacklogKeys(master.backlog_issue_key);
              
              return (
                <div key={mIdx} className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-sm group transition-all space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">{master.real_name}</h3>
                    </div>
                    <button 
                      onClick={() => removeMaster(mIdx)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {master.aliases.map((alias: string, aIdx: number) => (
                        <div key={aIdx} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl group/alias">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{alias}</span>
                          <button onClick={() => removeAlias(mIdx, aIdx)} className="text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 複数スレッドバッジリンクの動的マウント */}
                    {linkedIssues.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center pt-1">
                        <span className="text-[10px] font-black text-slate-400 mr-1">検出スレッド:</span>
                        {linkedIssues.map((issue, iIdx) => (
                          <a
                            key={iIdx}
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 border transition-all ${
                              issue.isLatest
                                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {issue.isLatest && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                            {issue.label} ({issue.key})
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* 2カラムフォーム */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block mb-1">対応Backlog課題キー（複数時はカンマ区切り）</label>
                        <input 
                          type="text"
                          placeholder="例：77057-123, 77057-890"
                          defaultValue={master.backlog_issue_key || ""}
                          onBlur={(e) => {
                            const updated = { ...dictionary };
                            // 👑 【絶対修正】masterIdx を 正しいループインデックス mIdx へ完全大修復！！！
                            updated.master_partners[mIdx].backlog_issue_key = e.target.value;
                            setDictionary(updated);
                            handleSave(updated);
                          }}
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter') {
                              const updated = { ...dictionary };
                              // 👑 【絶対修正】masterIdx を 正しいループインデックス mIdx へ完全大修復！！！
                              updated.master_partners[mIdx].backlog_issue_key = e.target.value;
                              setDictionary(updated);
                              handleSave(updated);
                              e.target.blur();
                            }
                          }}
                          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-600 font-bold text-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block mb-1">メディア名・サイトIDの追加</label>
                        <input 
                          type="text"
                          placeholder="入力してEnterで追加..."
                          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-50 dark:placeholder-slate-600 font-bold text-sm transition-all"
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
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}