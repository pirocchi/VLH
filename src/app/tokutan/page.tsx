"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Crown, ArrowUp, ArrowRight, ShieldAlert, Award, 
  Search, Filter, Percent, Flame, Target, DollarSign, MessageSquare, BrainCircuit,
  ExternalLink, Loader2, Route
} from "lucide-react";

// 👑 マスタ画面と完全同期した、アローエイト様準拠の集客経路マスター配列
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

const TokutanKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden min-h-[135px]">
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm font-black tracking-wider block text-slate-500 dark:text-slate-400">{title}</span>
      <div className={`p-2.5 rounded-xl bg-opacity-10 ${colorClass} flex-shrink-0`}><Icon size={16} /></div>
    </div>
    <div className="mt-4 flex items-end flex-wrap gap-0.5 leading-none">
      {prefix && <span className="text-xs md:text-sm font-black mr-0.5 mb-0.5 text-slate-400 dark:text-slate-500">{prefix}</span>}
      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">{value}</span>
      {suffix && <span className="text-xs md:text-sm font-black ml-0.5 mb-0.5 text-slate-400 dark:text-slate-500">{suffix}</span>}
    </div>
  </div>
);

const TOKUTAN_MASTER_TABLE = [
  { level: 1, name: "レベル1（通常）", minCV: 0,   maxCV: 10,   gross: 16500, net: 13200 },
  { level: 2, name: "レベル2",        minCV: 11,  maxCV: 20,   gross: 17600, net: 14300 },
  { level: 3, name: "レベル3",        minCV: 21,  maxCV: 30,   gross: 19250, net: 15400 },
  { level: 4, name: "レベル4",        minCV: 31,  maxCV: 50,   gross: 20900, net: 16500 },
  { level: 5, name: "レベル5",        minCV: 51,  maxCV: 100,  gross: 22550, net: 17600 },
  { level: 6, name: "レベル6",        minCV: 101, maxCV: 200,  gross: 24200, net: 19800 },
  { level: 7, name: "レベル7",        minCV: 201, maxCV: 300,  gross: 25850, net: 22000 },
  { level: 8, name: "レベル8（上限）", minCV: 301, maxCV: 9999, gross: 29150, net: 24200 },
];

const getLevelBadgeClass = (level: number, isSpecial: boolean) => {
  if (isSpecial) return "bg-purple-600 text-white font-black shadow-sm shadow-purple-500/10";
  switch (level) {
    case 1: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/40";
    case 2: return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case 3: return "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300";
    case 4: return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case 5: return "bg-yellow-50 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400";
    case 6: return "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    case 7: return "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400";
    case 8: return "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10";
    default: return "bg-slate-100 text-slate-700";
  }
};

export default function VLHTokutanPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchWord, setSearchWord] = useState<string>("");
  const [selectedAsp, setSelectedAsp] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all"); 

  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");

  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const [backlogLoading, setBacklogLoading] = useState<boolean>(false);
  const [backlogStatus, setBacklogStatus] = useState<'success' | 'error' | null>(null);
  const [backlogError, setBacklogError] = useState<string>("");

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const perfRes = await fetch("/api/performance", { cache: "no-store" });
        const perfData = perfRes.ok ? await perfRes.json() : [];
        
        const dictRes = await fetch(`/api/dictionary?t=${Date.now()}`, { cache: "no-store" });
        const dictionary = dictRes.ok ? await dictRes.json() : { master_partners: [] };

        setPerformanceData(perfData);
        setDictData(dictionary);
      } catch (err: any) {
        console.error("特単自動判定システムの同期に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  const partnersWithEvaluations = useMemo(() => {
    const map: any = {};
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    performanceData.forEach(row => {
      const rawName = row.media_name || "不明なパートナー";
      const rawId = row.media_id || "N/A";
      const asp = row.asp || "不明";
      if (!rawName || rawName === "日別レポート") return;

      let finalName = rawName;
      const match = dictData.master_partners?.find((entry: any) => 
        entry.aliases?.includes(rawName) || entry.aliases?.includes(rawId)
      );
      if (match) {
        finalName = match.real_name;
      }

      if (!map[finalName]) {
        map[finalName] = { 
          name: finalName, cv: 0, normalized_gross: 0, normalized_net: 0, 
          ids: new Set<string>(), asps: {}, detectedUnitGross: 0, detectedAsp: "", 
          hasValidUnit: false, backlogIssueKey: match?.backlog_issue_key || "",
          trafficSource: match?.traffic_source || "未設定", 
          trafficSourceUrl: match?.traffic_source_url || "" 
        };
      }

      map[finalName].ids.add(rawId);
      map[finalName].asps[asp] = true;

      const count = row.issued_count || 0;
      const staticUnitGross = row.unit_gross || 16500;

      if (count > 0 || !map[finalName].hasValidUnit) {
        map[finalName].detectedUnitGross = staticUnitGross;
        map[finalName].detectedAsp = asp;
        if (count > 0) {
          map[finalName].hasValidUnit = true;
        }
      }

      if (row.date) {
        const dateStr = String(row.date);
        const d = (dateStr.length === 8 && /^\d+$/.test(dateStr)) 
          ? new Date(parseInt(dateStr.slice(0, 4)), parseInt(dateStr.slice(4, 6)) - 1, parseInt(dateStr.slice(6, 8)))
          : new Date(dateStr);
        
        if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
          map[finalName].cv += count;
          map[finalName].normalized_gross += (row.normalized_gross || 0);
          map[finalName].normalized_net += (row.normalized_net || 0);
        }
      }
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv;
      const totalRevenue = cv * 79800;

      let detectedLevel = null;
      let isSpecial = false;

      if (p.detectedUnitGross > 0) {
        const unitGross = p.detectedUnitGross;

        if (p.detectedAsp === "QUORIZa") {
          isSpecial = true;
        } else {
          const found = TOKUTAN_MASTER_TABLE.find(t => Math.abs(t.gross - unitGross) <= 10);
          if (found) {
            detectedLevel = found.level;
          } else {
            isSpecial = true; 
          }
        }
      } else {
        detectedLevel = 1; 
      }

      const currentTier = isSpecial || !detectedLevel
        ? { level: 99, name: "特殊（個別契約） / 判定不能", gross: 0, net: 0, minCV: 0, maxCV: 0 }
        : TOKUTAN_MASTER_TABLE.find(t => t.level === detectedLevel) || TOKUTAN_MASTER_TABLE[0];

      const partnerProfit = p.normalized_net;
      const aspProfit = p.normalized_gross - p.normalized_net;
      const mainAsp = Object.keys(p.asps).join(" / ");

      return { 
        ...p, mainAsp, idList: Array.from(p.ids).join(", "), currentTier, isSpecial, 
        totalRevenue, partnerProfit, aspProfit, backlogIssueKey: p.backlogIssueKey,
        trafficSource: p.trafficSource, trafficSourceUrl: p.trafficSourceUrl 
      };
    }).sort((a: any, b: any) => b.cv - a.cv);
  }, [performanceData, dictData]);

  const filteredPartners = useMemo(() => {
    return partnersWithEvaluations.filter(p => {
      const matchesWord = p.name.toLowerCase().includes(searchWord.toLowerCase()) || p.idList.toLowerCase().includes(searchWord.toLowerCase());
      const matchesAsp = selectedAsp === "all" || Object.keys(p.asps || {}).includes(selectedAsp);
      const matchesSource = selectedSource === "all" || p.trafficSource === selectedSource;
      
      let matchesLevel = true;
      if (selectedLevel !== "all") {
        if (selectedLevel === "special") {
          matchesLevel = p.isSpecial;
        } else {
          matchesLevel = !p.isSpecial && p.currentTier.level === parseInt(selectedLevel);
        }
      }
      return matchesWord && matchesAsp && matchesLevel && matchesSource;
    });
  }, [partnersWithEvaluations, searchWord, selectedAsp, selectedLevel, selectedSource]);

  const currentPartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    const found = filteredPartners.find(p => p.name === selectedPartnerName);
    return found || filteredPartners[0];
  }, [filteredPartners, selectedPartnerName]);

  useEffect(() => {
    setAiAdvice("");
    setBacklogStatus(null);
  }, [currentPartner]);

  const handleGenerateAdvice = async () => {
    if (!currentPartner) return;
    try {
      setAiLoading(true);
      setAiAdvice("");
      const aiRes = await fetch("/api/ai/insight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: currentPartner.name, cv: currentPartner.cv, revenue: currentPartner.totalRevenue,
          partnerProfit: currentPartner.partnerProfit, aspProfit: currentPartner.aspProfit,
          tierName: currentPartner.currentTier.name, aspName: currentPartner.mainAsp
        })
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        setAiAdvice(aiJson.advice);
      } else {
        setAiAdvice("⚠️ 分析エンジンの呼び出しに失敗しました。");
      }
    } catch (err) {
      setAiAdvice("⚠️ 通信が一時的に遮断されました。");
    } finally {
      setAiLoading(false);
    }
  };

  const parseBacklogKeys = (keysString?: string) => {
    if (!keysString || !keysString.trim()) return [];
    return keysString
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k !== "")
      .map((key, index, arr) => {
        const isLatest = index === arr.length - 1;
        return {
          key,
          label: arr.length === 1 ? "課題スレッド" : isLatest ? "現行最新" : `過去ログ Vol.${index + 1}`,
          isLatest,
          url: `https://mkg.backlog.com/view/${key}`
        };
      });
  };

  const handlePostBacklogComment = async (actionType: 'pricing' | 'exposure' | 'ai_insight', customAdvice?: string) => {
    if (!currentPartner || !currentPartner.backlogIssueKey) return;
    try {
      setBacklogLoading(true);
      setBacklogStatus(null);
      const res = await fetch("/api/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backlogIssueKey: currentPartner.backlogIssueKey,
          partnerName: currentPartner.name,
          actionType: actionType,
          currentTier: currentPartner.currentTier.name,
          cv: currentPartner.cv,
          gross: currentPartner.normalized_gross,
          net: currentPartner.partnerProfit,
          aiAdvice: customAdvice || ""
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBacklogStatus('success');
        setTimeout(() => setBacklogStatus(null), 3000);
      } else {
        setBacklogStatus('error');
        setBacklogError(data.error || "投稿に失敗しました。");
      }
    } catch (e) {
      setBacklogStatus('error');
      setBacklogError("通信エラーが発生しました。");
    } finally {
      setBacklogLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">特別単価管理・分析 展開中...</div>;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">特別単価管理・分析</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">パートナー一覧</span>
          </div>

          <div className="space-y-2 mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <select 
                  value={selectedAsp} onChange={(e) => setSelectedAsp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="all">すべてのASP</option><option value="A8.net">A8.net</option><option value="afb">afb</option><option value="AccessTrade">AccessTrade</option><option value="felmat">felmat</option><option value="もしもアフィリエイト">もしもアフィリエイト</option><option value="QUORIZa">QUORIZa</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Crown size={12} className="text-indigo-500 flex-shrink-0" />
                <select 
                  value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="all">すべての設定レベル</option>
                  {TOKUTAN_MASTER_TABLE.map(t => (<option key={t.level} value={t.level.toString()}>レベル {t.level}</option>))}
                  <option value="special">特殊（個別契約）</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Route size={12} className="text-emerald-500 flex-shrink-0" />
                <select 
                  value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black border focus:outline-none focus:border-emerald-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="all">すべての集客経路</option>
                  {TRAFFIC_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>
          </div>
          
          <input type="text" placeholder="メディア名・IDで抽出..." value={searchWord} onChange={(e) => setSearchWord(e.target.value)} className="px-4 py-2.5 rounded-xl text-xs w-full border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-600 font-bold" />

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 h-80 xl:h-[480px] overflow-y-auto space-y-1.5 pr-1">
            {filteredPartners.map((partner, idx) => {
              const isSelected = currentPartner && currentPartner.name === partner.name;
              return (
                <div key={idx} onClick={() => setSelectedPartnerName(partner.name)} className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-black" : "bg-slate-50 hover:bg-slate-100 border-slate-200/50 text-slate-700 dark:bg-slate-950/40 dark:border-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100"}`}>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs md:text-sm truncate font-black flex-1">{partner.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black flex-shrink-0 transition-all ${getLevelBadgeClass(partner.currentTier.level, partner.isSpecial)}`}>
                      {partner.isSpecial ? "特殊" : `Lv.${partner.currentTier.level}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                     {partner.trafficSource !== "未設定" && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                          {partner.trafficSource}
                        </span>
                     )}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold text-[10px] opacity-80">
                    <span className="truncate text-slate-400 dark:text-slate-500">当月成果: {partner.cv} 件</span>
                    <span className={isSelected ? "text-white/90" : "text-indigo-600 dark:text-indigo-400 ml-2 flex-shrink-0"}><span className="text-[9px] text-slate-400 mr-0.5">￥</span>{Math.round(partner.totalRevenue).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredPartners.length === 0 && <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-bold">該当パートナー不在</div>}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          {currentPartner ? (
            <>
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 tracking-wider">特別単価判定</span>
                    
                    {/* 👑 【完全修正】バッジ全体を巨大なリンクボタン化し、クリック範囲の極小ストレスを完全粉砕！！！ */}
                    {currentPartner.trafficSource !== "未設定" && (
                      currentPartner.trafficSourceUrl ? (
                        <a 
                          href={currentPartner.trafficSourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="登録URLへ直行"
                          className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          {currentPartner.trafficSource}
                          <ExternalLink size={10} className="mb-[1px] opacity-80" />
                        </a>
                      ) : (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tracking-wider flex items-center gap-1">
                          {currentPartner.trafficSource}
                        </span>
                      )
                    )}
                  </div>
                  <h2 className="text-xl font-black mt-2 text-slate-900 dark:text-slate-50">{currentPartner.name}</h2>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-all ${getLevelBadgeClass(currentPartner.currentTier.level, currentPartner.isSpecial)}`}>
                      {currentPartner.isSpecial ? "特殊" : `Lv.${currentPartner.currentTier.level}`}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">判定された現在のステータス</p>
                      <p className="text-base font-black text-slate-900 dark:text-slate-100">{currentPartner.currentTier.name}</p>
                      {!currentPartner.isSpecial && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 font-bold">
                          (目安グロス: ￥{currentPartner.currentTier.gross.toLocaleString()} / ネット: ￥{currentPartner.currentTier.net.toLocaleString()})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-dashed border-slate-100 dark:border-slate-800/60 space-y-3">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-black text-slate-400 mr-1 select-none">対応Backlogスレッド:</span>
                      {currentPartner.backlogIssueKey ? (
                        parseBacklogKeys(currentPartner.backlogIssueKey).map((issue, idx) => (
                          <a
                            key={idx}
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 border transition-all ${
                              issue.isLatest
                                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {issue.label}
                            <ExternalLink size={10} />
                          </a>
                        ))
                      ) : (
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">キー未登録</span>
                      )}
                    </div>

                    {currentPartner.backlogIssueKey && (
                      <div className="flex items-center gap-2 pt-0.5">
                        {backlogStatus === null && (
                          <>
                            <button
                              disabled={backlogLoading}
                              onClick={() => handlePostBacklogComment('pricing')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              {backlogLoading ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                              特単変更を通知
                            </button>
                            <button
                              disabled={backlogLoading}
                              onClick={() => handlePostBacklogComment('exposure')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              露出拡大を通知
                            </button>
                          </>
                        )}
                        {backlogStatus === 'success' && !aiAdvice && (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200 select-none">
                            最新チケットへ投函完了！
                          </span>
                        )}
                        {backlogStatus === 'error' && !aiAdvice && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1" title={backlogError}>
                              投稿失敗
                            </span>
                            <button onClick={() => setBacklogStatus(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-500 underline">リトライ</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center h-full">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                        <MessageSquare size={14} /> 運用担当者への示唆・アドバイス（AI直結）
                      </div>
                      <button onClick={handleGenerateAdvice} disabled={aiLoading || !currentPartner} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:disabled:bg-slate-950 dark:disabled:text-slate-700 border border-transparent dark:disabled:border-slate-800">
                        <BrainCircuit size={13} className={aiLoading ? "animate-spin" : ""} /> {aiLoading ? "分析中..." : "AI分析を実行"}
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[90px] flex flex-col justify-between gap-3 transition-all">
                      {aiLoading ? (
                        <p className="text-xs font-black text-indigo-500 dark:text-indigo-400 animate-pulse tracking-widest flex items-center gap-2 py-4">⚡ データを分析中...</p>
                      ) : (
                        <>
                          <p className="text-xs md:text-sm font-black leading-relaxed text-slate-800 dark:text-slate-200">{aiAdvice ? `「 ${aiAdvice} 」` : "「 右上の『AI分析を実行』ボタンを押すと、現在のデータに基づく掲載交渉アイデアを生成します。 」"}</p>
                          {aiAdvice && currentPartner.backlogIssueKey && (
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
                              {backlogStatus === null && (
                                <button
                                  disabled={backlogLoading}
                                  onClick={() => handlePostBacklogComment('ai_insight', aiAdvice)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                                >
                                  {backlogLoading ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                                  この分析内容をBacklogへ送信
                                </button>
                              )}
                              {backlogStatus === 'success' && (
                                <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200 select-none">
                                  最新チケットへ投函完了！
                                </span>
                              )}
                              {backlogStatus === 'error' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1" title={backlogError}>
                                    投稿失敗
                                  </span>
                                  <button onClick={() => setBacklogStatus(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-500 underline">リトライ</button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase border-l-4 border-indigo-500 pl-2">■ 当月成果・報酬内訳（税込）</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <TokutanKPICard title="当月合算成果数" value={currentPartner.cv.toLocaleString()} suffix="件" icon={Crown} colorClass="text-indigo-500 bg-indigo-500" />
                  <TokutanKPICard title="アフィリエイター利益" prefix="￥" value={Math.round(currentPartner.partnerProfit).toLocaleString()} icon={Target} colorClass="text-green-500 bg-green-500" />
                  <TokutanKPICard title="ASPマージン" prefix="￥" value={Math.round(currentPartner.aspProfit).toLocaleString()} icon={Percent} colorClass="text-orange-400 bg-orange-400" />
                  <TokutanKPICard title="売上" prefix="￥" value={Math.round(currentPartner.totalRevenue).toLocaleString()} icon={DollarSign} colorClass="text-emerald-500 bg-emerald-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-hidden shadow-sm transition-all">
                <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  <Filter size={14} className="text-indigo-500" /> ケノン特別単価基準表
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase select-none">
                        <th className="pb-3 text-center">レベル設定</th>
                        <th className="pb-3 text-left">レベル名称</th>
                        <th className="pb-3 text-center">月間成果目安範囲</th>
                        <th className="pb-3 text-right">グロス単価（自社コスト）</th>
                        <th className="pb-3 text-right">ネット単価（メディア報酬）</th>
                        <th className="pb-3 text-right">ASP仲介マージン</th>
                        <th className="pb-3 text-center">現在の判定位置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                      {TOKUTAN_MASTER_TABLE.map((tier) => {
                        const isMatch = !currentPartner.isSpecial && currentPartner.currentTier.level === tier.level;
                        return (
                          <tr key={tier.level} className={`transition-colors ${isMatch ? "bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20" : "hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10"}`}>
                            <td className="py-4 text-center">
                              <span className={`px-2 py-0.5 rounded font-black transition-all ${getLevelBadgeClass(tier.level, false)}`}>Lv.{tier.level}</span>
                            </td>
                            <td className={`py-4 text-left ${isMatch ? "text-amber-600 dark:text-amber-400 font-black" : "text-slate-900 dark:text-slate-50"}`}>{tier.name}</td>
                            <td className="py-4 text-center opacity-70 text-slate-500 dark:text-slate-400">{tier.minCV} 〜 {tier.maxCV === 9999 ? "無制限" : `${tier.maxCV} 件`}</td>
                            <td className="py-4 text-right text-red-500 dark:text-red-400">￥{tier.gross.toLocaleString()}</td>
                            <td className="py-4 text-right text-green-500 dark:text-green-400">￥{tier.net.toLocaleString()}</td>
                            <td className="py-4 text-right text-orange-500 dark:text-orange-400">￥{(tier.gross - tier.net).toLocaleString()}</td>
                            <td className="py-4 text-center">
                              {isMatch ? (<span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-emerald-400 font-black animate-pulse"><ArrowRight size={12}/> 適合中</span>) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <ShieldAlert size={24} className="text-slate-300 dark:text-slate-600"/>
              指定のクロスフィルターに合致するパートナー情報が存在しません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}