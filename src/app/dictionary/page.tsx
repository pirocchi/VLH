"use client";

import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  BookOpen, Plus, Trash2, Save, Search, 
  ShieldCheck, AlertCircle, Info, ExternalLink, Link2, Route
} from "lucide-react";

// 👑 横文字を完全パージした業務用日本語の集客経路マスター定義
const TRAFFIC_SOURCES = [
  { value: "ウェブサイト（SERP）", label: "ウェブサイト（SERP）" },
  { value: "検索広告（SERP）",     label: "検索広告（SERP）" },
  { value: "ディスプレイ広告",     label: "ディスプレイ広告" },
  { value: "ネイティブ広告",       label: "ネイティブ広告" },
  { value: "アプリ",               label: "アプリ" },
  { value: "YouTube",              label: "YouTube" },
  { value: "Facebook",             label: "Facebook" },
  { value: "Instagram",            label: "Instagram" },
  { value: "TikTok",               label: "TikTok" },
  { value: "X（旧Twitter）",       label: "X（旧Twitter）" },
  { value: "LINE",                 label: "LINE" },
  { value: "Pinterest",            label: "Pinterest" },
  { value: "ライブコマース",       label: "ライブコマース" },
  { value: "その他",               label: "その他" }
];

export default function VLHDictionaryPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [dictionary, setDictionary] = useState<any>({ master_partners: [] });
  const [newMasterName, setNewMasterName] = useState("");
  const [loading, setLoading] = useState<boolean>(true); 
  const [status, setStatus] = useState<{ type: 'success'|'error'|null, msg: string }>({ type: null, msg: "" });

  // 👑 パートナー毎の「新規インスタンス入力フォーム」の状態を管理する一時的なローカルステート
  const [formInputs, setFormInputs] = useState<{ [key: number]: { source: string, name: string, url: string } }>({});

  // 👑 【絶対安全防衛網】過去の古い形式のデータを、新次元のインスタンス配列構造へリアルタイム自動救済する関数
  const ensureInstances = (partner: any) => {
    if (partner.traffic_instances && Array.isArray(partner.traffic_instances)) {
      return partner.traffic_instances;
    }
    
    const rescuedInstances: any[] = [];
    const rawSource = partner.traffic_source;
    
    // 👑 構文エラーを起こした即時実行関数をパージし、安全でクリーンな三項演算子へ変更！
    const oldSources = !rawSource ? [] : (Array.isArray(rawSource) ? rawSource : [rawSource]);
    const oldUrls = partner.traffic_source_url ? partner.traffic_source_url.split(",").map((s: string) => s.trim()) : [];
    
    oldSources.forEach((source: string, idx: number) => {
      rescuedInstances.push({
        id: `saved-old-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: source,
        instance_name: `${source} ${idx + 1}`,
        url: oldUrls[idx] || ""
      });
    });
    return rescuedInstances;
  };

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
        // 👑 traffic_instances を空の初期配列として新規マウント！
        { real_name: newMasterName, aliases: [], backlog_issue_key: "", traffic_instances: [], traffic_source_url: "" },
        ...dictionary.master_partners
      ]
    };
    setDictionary(updated);
    newMasterName ? setNewMasterName("") : null;
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

  // 👑 新設：特定のパートナーに新しく「識別名＋URL」の集客経路インスタンスを追加する関数
  const addTrafficInstance = (masterIdx: number) => {
    const input = formInputs[masterIdx];
    if (!input || !input.source || !input.name) return;

    const updated = { ...dictionary };
    const targetPartner = updated.master_partners[masterIdx];
    
    // 現在のインスタンス群を救済回路経由で安全取得
    const currentInstances = [...ensureInstances(targetPartner)];
    
    const newInstance = {
      id: `instance-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: input.source,
      instance_name: input.name,
      url: input.url.trim()
    };

    targetPartner.traffic_instances = [newInstance, ...currentInstances];
    
    // 同期のために旧互換フィールドも配列ベースで自動文字列変換して裏補完（分断の完全防衛ファクト）
    targetPartner.traffic_source = targetPartner.traffic_instances.map((i: any) => i.source);
    targetPartner.traffic_source_url = targetPartner.traffic_instances.map((i: any) => i.url).join(", ");

    setDictionary(updated);
    
    // 入力フォームのクリア
    setFormInputs({
      ...formInputs,
      [masterIdx]: { source: "", name: "", url: "" }
    });

    handleSave(updated);
  };

  // 👑 新設：特定の集客経路インスタンス（識別名ペア）をピンポイントで破棄する関数
  const removeTrafficInstance = (masterIdx: number, instanceId: string) => {
    const updated = { ...dictionary };
    const targetPartner = updated.master_partners[masterIdx];
    const currentInstances = ensureInstances(targetPartner);

    targetPartner.traffic_instances = currentInstances.filter((i: any) => i.id !== instanceId);
    
    // 裏側の旧互換フィールドも超精密に自動同期再生成
    targetPartner.traffic_source = targetPartner.traffic_instances.map((i: any) => i.source);
    targetPartner.traffic_source_url = targetPartner.traffic_instances.map((i: any) => i.url).join(", ");

    setDictionary(updated);
    handleSave(updated);
  };

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
      {/* 👑 規律に則り、全角9文字の「パートナー統合設定」タイトルを完全維持 */}
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
              
              // 👑 安全装置マイグレーション網を通過させてインスタンス配列を取得
              const currentInstances = ensureInstances(master);
              
              // 対象行のインライン入力用フォームの現在の状態を取得
              const currentForm = formInputs[mIdx] || { source: "", name: "", url: "" };

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 block mb-1">対応Backlog課題キー（複数時はカンマ区切り）</label>
                        <input 
                          type="text"
                          placeholder="例：77057-123, 77057-890"
                          defaultValue={master.backlog_issue_key || ""}
                          onBlur={(e) => {
                            const updated = { ...dictionary };
                            updated.master_partners[mIdx].backlog_issue_key = e.target.value;
                            setDictionary(updated);
                            handleSave(updated);
                          }}
                          onKeyDown={(e: any) => {
                            if (e.key === 'Enter') {
                              const updated = { ...dictionary };
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

                    {/* 👑 【新次元】「大分類×識別名×URL」ペア管理用・動的インライン追加コックピット */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                      <label className="text-[10px] font-black text-slate-400 flex items-center gap-1 select-none">
                        <Route size={12} className="text-emerald-500" />
                        個別アカウント（インスタンス）の新規紐付け
                      </label>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                        {/* 1. カテゴリ大分類 */}
                        <select
                          value={currentForm.source}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormInputs({
                              ...formInputs,
                              [mIdx]: { ...currentForm, source: val, name: val ? `${val} 1` : "" } // カテゴリを選んだら初期識別名を自動補完
                            });
                          }}
                          className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 font-bold text-xs transition-all"
                        >
                          <option value="">-- カテゴリ選択 --</option>
                          {TRAFFIC_SOURCES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>

                        {/* 2. 識別名（自由入力） */}
                        <input
                          type="text"
                          placeholder="識別名（例：Instagram 1）"
                          value={currentForm.name}
                          onChange={(e) => setFormInputs({
                            ...formInputs,
                            [mIdx]: { ...currentForm, name: e.target.value }
                          })}
                          className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 dark:placeholder-slate-600 font-bold text-xs transition-all"
                        />

                        {/* 3. 専用URL入力 ＆ 追加トリガー */}
                        <div className="flex gap-2 sm:col-span-1">
                          <input
                            type="text"
                            placeholder="専用URLリンク"
                            value={currentForm.url}
                            onChange={(e) => setFormInputs({
                              ...formInputs,
                              [mIdx]: { ...currentForm, url: e.target.value }
                            })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && currentForm.source && currentForm.name) {
                                e.preventDefault();
                                addTrafficInstance(mIdx);
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:border-indigo-500 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-50 dark:placeholder-slate-600 font-bold text-xs transition-all"
                          />
                          <button
                            onClick={() => addTrafficInstance(mIdx)}
                            disabled={!currentForm.source || !currentForm.name}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-sm transition-all flex-shrink-0"
                          >
                            追加
                          </button>
                        </div>
                      </div>

                      {/* 👑 登録済みインスタンスのグリッド・マッピングリスト（神UX仕様） */}
                      {currentInstances.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {currentInstances.map((inst: any) => (
                            <div key={inst.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800/60 dark:hover:border-slate-700/60 transition-all text-xs shadow-2xs">
                              <div className="flex items-center gap-3 truncate flex-1">
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 select-none flex-shrink-0">
                                  {inst.source}
                                </span>
                                <span className="font-black text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                  {inst.instance_name}
                                </span>
                                {inst.url && (
                                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px] select-all">
                                    ({inst.url})
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1.5 ml-4">
                                {inst.url && (
                                  <a
                                    href={inst.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`${inst.instance_name} の最前線（リンク先）へ1秒で直行する`}
                                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-indigo-400 transition-all shadow-3xs"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                <button
                                  onClick={() => removeTrafficInstance(mIdx, inst.id)}
                                  title="このアカウント連携を解除する"
                                  className="p-1.5 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-transparent hover:border-red-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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