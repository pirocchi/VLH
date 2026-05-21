"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, MousePointer, Percent, ShoppingBag, DollarSign, Eye, 
  BarChart3, TrendingUp, Sun, Moon, Clock, Filter, Search, ShieldAlert,
  Coins, ArrowUpRight, Target, Flame, ChevronUp, ChevronDown
} from "lucide-react";

// --- サブコンポーネント: 独立浮遊する「11大指標」専用KPIカード ---
const VLHKPICard = ({ title, value, unit, icon: Icon, colorClass, isLight }: any) => (
  <div className={`
    ${isLight ? "bg-white border-transparent shadow-xl" : "bg-[#1e293b] border-slate-800 shadow-xl"} 
    p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden border
  `}>
    <div className="flex justify-between items-start">
      <span className={`text-[9px] font-black tracking-widest uppercase ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        {title}
      </span>
      <div className={`p-2 rounded-xl bg-opacity-10 ${colorClass}`}>
        <Icon size={14} />
      </div>
    </div>
    <div className="mt-3 flex items-end gap-1">
      <span className={`text-xl font-black tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
        {value}
      </span>
      <span className={`text-[9px] font-bold mb-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        {unit}
      </span>
    </div>
  </div>
);

export default function VLHDashboardPage() {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  // 💡 超多角的フィルタリング・ステート群
  const [filterRange, setFilterRange] = useState<string>("30d"); 
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [selectedAsp, setSelectedAsp] = useState<string>("all");
  const [searchMedia, setSearchMedia] = useState<string>("");
  const [tokutanFilter, setTokutanFilter] = useState<string>("all"); // "all" | "normal" | "tokutan"

  // 💡 双方向11値ソートステート
  const [mediaSortKey, setMediaSortKey] = useState<string>("issued_count");
  const [aspSortKey, setAspSortKey] = useState<string>("reward");
  const [aspSortAsc, setAspSortAsc] = useState<boolean>(false);

  useEffect(() => {
    const fetchVLHMemory = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/performance", { cache: "no-store" });
        if (!res.ok) throw new Error("データ抽出に失敗しました。");
        const data = await res.json();
        setPerformanceData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVLHMemory();
  }, []);

  useEffect(() => {
    const evaluateTheme = () => {
      if (themeMode === "auto") {
        const hour = new Date().getHours();
        setActiveTheme(hour >= 6 && hour < 18 ? "light" : "dark");
      } else {
        setActiveTheme(themeMode);
      }
    };
    evaluateTheme();
    const interval = setInterval(evaluateTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  const isLight = activeTheme === "light";

  // 🔍 究極調停：11大指標の動的インジェクション ＆ 超多角的マトリクスフィルター
  const filteredData = useMemo(() => {
    const now = new Date();
    const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfToday = getStartOfDay(now);

    return performanceData.map(row => {
      // 💡 運用型5大指標＋基礎指標の完全動的演算（ケノン単価: ¥79,800）
      const imp = row.impressions || 0;
      const clk = row.clicks || 0;
      const cv = row.issued_count || 0;
      const cost = row.issued_reward || 0;
      
      const revenue = cv * 79800;
      const ctr = imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0.0;
      const cvr = clk > 0 ? parseFloat(((cv / clk) * 100).toFixed(2)) : 0.0;
      const roas = cost > 0 ? parseFloat(((revenue / cost) * 100).toFixed(2)) : 0.0;
      const cpa = cv > 0 ? Math.round(cost / cv) : 0;
      const cpc = clk > 0 ? parseFloat((cost / clk).toFixed(2)) : 0.0;
      const cpm = imp > 0 ? parseFloat(((cost / imp) * 1000).toFixed(2)) : 0.0;

      return {
        ...row, revenue, ctr, cvr, roas, cpa, cpc, cpm
      };
    }).filter(row => {
      // ① ASPフィルター
      if (selectedAsp !== "all" && row.asp !== selectedAsp) return false;

      // ② パートナー（メディア）検索フィルター
      if (searchMedia && !row.media_name.toLowerCase().includes(searchMedia.toLowerCase()) && !row.media_id.toLowerCase().includes(searchMedia.toLowerCase())) return false;

      // ③ 特単（CPA）フィルター（例: 1件あたりのコストCPAが6000円超を特単メディアと指紋認識）
      if (tokutanFilter === "tokutan" && row.cpa <= 6000) return false;
      if (tokutanFilter === "normal" && row.cpa > 6000) return false;

      // ④ 期間フィルター
      if (!row.date) return filterRange === "30d" || filterRange === "all"; 
      const rowDate = getStartOfDay(new Date(row.date));
      const diffTime = startOfToday.getTime() - rowDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (filterRange) {
        case "yesterday": return diffDays === 1;
        case "7d": return diffDays >= 0 && diffDays <= 7;
        case "14d": return diffDays >= 0 && diffDays <= 14;
        case "30d": return diffDays >= 0 && diffDays <= 30;
        case "1y": return diffDays >= 0 && diffDays <= 365;
        case "thisMonth":
          const rDate = new Date(row.date);
          return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
        case "lastMonth":
          const rDate2 = new Date(row.date);
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return rDate2.getMonth() === lm.getMonth() && rDate2.getFullYear() === lm.getFullYear();
        case "custom":
          if (!customRange.start || !customRange.end) return true;
          const start = getStartOfDay(new Date(customRange.start)).getTime();
          const end = getStartOfDay(new Date(customRange.end)).getTime();
          return rowDate.getTime() >= start && rowDate.getTime() <= end;
        default: return true;
      }
    });
  }, [performanceData, filterRange, customRange, selectedAsp, searchMedia, tokutanFilter]);

  // 💡 11大指標 グローバル統合集計（最上段へ配給）
  const summary = useMemo(() => {
    const totalImp = filteredData.reduce((acc, row) => acc + (row.impressions || 0), 0);
    const totalClicks = filteredData.reduce((acc, row) => acc + (row.clicks || 0), 0);
    const totalIssued = filteredData.reduce((acc, row) => acc + (row.issued_count || 0), 0);
    const totalCost = filteredData.reduce((acc, row) => acc + (row.issued_reward || 0), 0);
    const totalRevenue = totalIssued * 79800;

    return {
      impressions: totalImp,
      clicks: totalClicks,
      ctr: totalImp > 0 ? parseFloat(((totalClicks / totalImp) * 100).toFixed(2)) : 0.0,
      issued_count: totalIssued,
      cvr: totalClicks > 0 ? parseFloat(((totalIssued / totalClicks) * 100).toFixed(2)) : 0.0,
      issued_reward: totalCost,
      revenue: totalRevenue,
      roas: totalCost > 0 ? parseFloat(((totalRevenue / totalCost) * 100).toFixed(2)) : 0.0,
      cpa: totalIssued > 0 ? Math.round(totalCost / totalIssued) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalCost / totalClicks).toFixed(2)) : 0.0,
      cpm: totalImp > 0 ? parseFloat(((totalCost / totalImp) * 1000).toFixed(2)) : 0.0
    };
  }, [filteredData]);

  // 💡 ASP別パフォーマンス・マトリクス（11大指標完全拡張版）
  const aspPerformance = useMemo(() => {
    const asps: any = {};
    filteredData.forEach(row => {
      if (!asps[row.asp]) asps[row.asp] = { impressions: 0, clicks: 0, issued: 0, reward: 0 };
      asps[row.asp].impressions += (row.impressions || 0);
      asps[row.asp].clicks += (row.clicks || 0);
      asps[row.asp].issued += (row.issued_count || 0);
      asps[row.asp].reward += (row.issued_reward || 0);
    });

    const list = Object.keys(asps).map(name => {
      const rev = asps[name].issued * 79800;
      const cost = asps[name].reward;
      return {
        name,
        impressions: asps[name].impressions,
        clicks: asps[name].clicks,
        ctr: asps[name].impressions > 0 ? parseFloat(((asps[name].clicks / asps[name].impressions) * 100).toFixed(2)) : 0.0,
        issued: asps[name].issued,
        cvr: asps[name].clicks > 0 ? parseFloat(((asps[name].issued / asps[name].clicks) * 100).toFixed(2)) : 0.0,
        reward: cost,
        revenue: rev,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: asps[name].issued > 0 ? Math.round(cost / asps[name].issued) : 0,
        cpc: asps[name].clicks > 0 ? parseFloat((cost / asps[name].clicks).toFixed(2)) : 0.0,
        cpm: asps[name].impressions > 0 ? parseFloat(((cost / asps[name].impressions) * 1000).toFixed(2)) : 0.0
      };
    });

    return list.sort((a: any, b: any) => {
      let valA = a[aspSortKey];
      let valB = b[aspSortKey];
      return aspSortAsc ? valA - valB : valB - valA;
    });
  }, [filteredData, aspSortKey, aspSortAsc]);

  // 💡 メディア別成果ランキング（11値完全ソート降順）
  const sortedMedias = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => {
        const valA = a[mediaSortKey] || 0;
        const valB = b[mediaSortKey] || 0;
        return valB - valA;
      })
      .slice(0, 5);
  }, [filteredData, mediaSortKey]);

  const handleAspSort = (key: string) => {
    if (aspSortKey === key) {
      setAspSortAsc(!aspSortAsc);
    } else {
      setAspSortKey(key);
      setAspSortAsc(false);
    }
  };

  const renderSortIcon = (key: string) => {
    if (aspSortKey !== key) return null;
    return aspSortAsc ? <ChevronUp size={10} className="inline ml-0.5" /> : <ChevronDown size={10} className="inline ml-0.5" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse">VLH: UNIFYING 11 METRICS...</div>;

  return (
    <div className="min-h-screen w-full font-sans p-4 sm:p-6 bg-[#0f172a] text-slate-100 transition-all duration-500">
      
      {/* 👑 ヘッダーの小島 */}
      <header className={`px-6 py-4 mb-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden border ${isLight ? "bg-white border-transparent text-slate-800 shadow-xl" : "bg-[#1e293b] border-slate-800 text-white shadow-xl"}`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-xs tracking-wider">VLH</div>
          <h1 className="text-sm font-black tracking-tight">Performance Intelligence Cockpit v2.5</h1>
        </div>
        <div className={`flex p-1 rounded-xl ${isLight ? "bg-slate-100" : "bg-[#0f172a]"}`}>
          {[ {m:"light", i:Sun}, {m:"dark", i:Moon}, {m:"auto", i:Clock} ].map(t => (
            <button key={t.m} onClick={() => setThemeMode(t.m as any)} className={`p-1.5 rounded-lg transition-all ${themeMode === t.m ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-400"}`}>
              <t.i size={12} />
            </button>
          ))}
        </div>
      </header>

      {/* 🛠️ 超多角的マトリクス・コントロールパネル（小島） */}
      <div className="mb-5">
        <div className={`p-5 rounded-2xl border flex flex-col gap-4 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-800 shadow-xl" : "bg-[#1e293b] border-slate-800 text-white shadow-lg"}`}>
          
          {/* 上段：期間コントロール */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-1.5 text-indigo-500 font-black text-[10px] uppercase tracking-widest min-w-[70px]">
              <Filter size={12} /> Range
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                {l:"前日", v:"yesterday"}, {l:"直近7日間", v:"7d"}, {l:"直近14日間", v:"14d"},
                {l:"直近30日間", v:"30d"}, {l:"直近1年間", v:"1y"}, {l:"当月", v:"thisMonth"},
                {l:"先月", v:"lastMonth"}, {l:"カスタム", v:"custom"}
              ].map(range => (
                <button
                  key={range.v}
                  onClick={() => setFilterRange(range.v)}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${filterRange === range.v ? "bg-indigo-600 text-white shadow-sm" : (isLight ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-[#0f172a] text-slate-400 hover:text-white")}`}
                >
                  {range.l}
                </button>
              ))}
            </div>
            {filterRange === "custom" && (
              <div className="flex items-center gap-1.5 ml-auto animate-in fade-in duration-200">
                <input type="date" value={customRange.start} onChange={(e)=>setCustomRange({...customRange, start: e.target.value})} className={`px-2 py-0.5 rounded bg-transparent border text-[9px] ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
                <span className="text-slate-500 text-xs">~</span>
                <input type="date" value={customRange.end} onChange={(e)=>setCustomRange({...customRange, end: e.target.value})} className={`px-2 py-0.5 rounded bg-transparent border text-[9px] ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
              </div>
            )}
          </div>

          {/* 下段：多面的多重ソーター（ASP・検索・特単） */}
          <div className="flex flex-wrap items-center gap-6">
            
            {/* ASPセレクト */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">ASP:</span>
              <select 
                value={selectedAsp} 
                onChange={(e) => setSelectedAsp(e.target.value)}
                className={`px-2 py-1 rounded text-[10px] font-bold border ${isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0f172a] border-slate-700 text-white"}`}
              >
                <option value="all">すべてのASPチャンネル</option>
                <option value="A8.net">A8.net</option>
                <option value="afb">afb</option>
                <option value="AccessTrade">AccessTrade</option>
                <option value="felmat">felmat</option>
                <option value="もしもアフィリエイト">もしもアフィリエイト</option>
                <option value="QUORIZa">QUORIZa</option>
              </select>
            </div>

            {/* パートナー検索 */}
            <div className="flex items-center gap-2 flex-grow max-w-xs">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1"><Search size={10}/> Partner:</span>
              <input 
                type="text" 
                placeholder="メディア名・IDを入力..."
                value={searchMedia}
                onChange={(e) => setSearchMedia(e.target.value)}
                className={`px-3 py-1 rounded text-[10px] w-full border ${isLight ? "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400" : "bg-[#0f172a] border-slate-700 text-white placeholder-slate-500"}`}
              />
            </div>

            {/* 特単（CPA）インテリジェンス */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-amber-500 uppercase flex items-center gap-1"><Coins size={10}/> 特単フィルター:</span>
              <div className={`flex p-0.5 rounded-lg border text-[9px] font-bold ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a] border-slate-700"}`}>
                {[
                  { v: "all", l: "すべて" },
                  { v: "normal", l: "通常単価" },
                  { v: "tokutan", l: "特単適用 (CPA>6k)" }
                ].map(b => (
                  <button
                    key={b.v}
                    onClick={() => setTokutanFilter(b.v)}
                    className={`px-2 py-0.5 rounded transition-all ${tokutanFilter === b.v ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                  >
                    {b.l}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 🚀 メインコンテンツ */}
      <div className="space-y-5">
        
        {/* 🏔️ 運用型アフィリエイト・11連KPI小島群 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3.5">
          <VLHKPICard title="インプレッション" value={summary.impressions.toLocaleString()} unit="IMP" icon={Eye} colorClass="text-blue-500 bg-blue-500" isLight={isLight} />
          <VLHKPICard title="総クリック数" value={summary.clicks.toLocaleString()} unit="CLK" icon={MousePointer} colorClass="text-orange-400 bg-orange-400" isLight={isLight} />
          <VLHKPICard title="平均誘導率" value={`${summary.ctr}%`} unit="CTR" icon={Percent} colorClass="text-purple-500 bg-purple-500" isLight={isLight} />
          <VLHKPICard title="発生成果数" value={summary.issued_count.toLocaleString()} unit="CV" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" isLight={isLight} />
          <VLHKPICard title="平均成約率" value={`${summary.cvr}%`} unit="CVR" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" isLight={isLight} />
          <VLHKPICard title="総発生報酬" value={`¥${Math.round(summary.issued_reward).toLocaleString()}`} unit="COST" icon={DollarSign} colorClass="text-red-500 bg-red-500" isLight={isLight} />
          
          {/* 新星5大運用指標 */}
          <VLHKPICard title="広告経由売上" value={`¥${summary.revenue.toLocaleString()}`} unit="REV" icon={ArrowUpRight} colorClass="text-emerald-500 bg-emerald-500" isLight={isLight} />
          <VLHKPICard title="絶対ROAS" value={`${summary.roas}%`} unit="ROAS" icon={Flame} colorClass="text-yellow-500 bg-yellow-500" isLight={isLight} />
          <VLHKPICard title="獲得単価" value={`¥${summary.cpa.toLocaleString()}`} unit="CPA" icon={Target} colorClass="text-pink-500 bg-pink-500" isLight={isLight} />
          <VLHKPICard title="クリック単価" value={`¥${summary.cpc}`} unit="CPC" icon={Coins} colorClass="text-cyan-500 bg-cyan-500" isLight={isLight} />
          <VLHKPICard title="1000回露出コスト" value={`¥${summary.cpm}`} unit="CPM" icon={BarChart3} colorClass="text-indigo-400 bg-indigo-400" isLight={isLight} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          
          {/* 📊 ASP別パフォーマンス・レポート（11値完全多角的インタラクティブソート） */}
          <div className={`xl:col-span-2 border rounded-2xl p-5 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-700 shadow-xl" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <h3 className={`text-[10px] font-black mb-4 flex items-center gap-1.5 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
              <BarChart3 size={12} className="text-indigo-500" /> ASP別パフォーマンス・レポート <span className="text-[8px] text-slate-500 font-normal normal-case">(ヘッダークリックで11指標を双方向ソート可能)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className={`border-b ${isLight ? "border-slate-100 text-slate-400" : "border-slate-800 text-slate-500"} font-black uppercase select-none cursor-pointer`}>
                    <th className="pb-2 hover:text-indigo-500" onClick={() => handleAspSort("name")}>ASP {renderSortIcon("name")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("impressions")}>インプ {renderSortIcon("impressions")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("clicks")}>クリック {renderSortIcon("clicks")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("ctr")}>誘導率 {renderSortIcon("ctr")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("issued")}>成果(CV) {renderSortIcon("issued")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("cvr")}>成約率 {renderSortIcon("cvr")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("reward")}>報酬(コスト) {renderSortIcon("reward")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("revenue")}>売上 {renderSortIcon("revenue")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("roas")}>ROAS {renderSortIcon("roas")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("cpa")}>CPA {renderSortIcon("cpa")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("cpc")}>CPC {renderSortIcon("cpc")}</th>
                    <th className="pb-2 text-right hover:text-indigo-500" onClick={() => handleAspSort("cpm")}>CPM {renderSortIcon("cpm")}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? "divide-slate-100 text-slate-600" : "divide-slate-800/50 text-slate-300"} font-bold`}>
                  {aspPerformance.map((asp:any, idx:number) => (
                    <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                      <td className={`py-3 font-black ${isLight ? "text-slate-800" : "text-white"} flex items-center gap-1.5`}>
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>{asp.name}
                      </td>
                      <td className="py-3 text-right opacity-70">{asp.impressions.toLocaleString()}</td>
                      <td className="py-3 text-right">{asp.clicks.toLocaleString()}</td>
                      <td className="py-3 text-right text-purple-500">{asp.ctr}%</td>
                      <td className="py-3 text-right text-green-500">{asp.issued}</td>
                      <td className="py-3 text-right text-teal-500">{asp.cvr}%</td>
                      <td className="py-3 text-right text-red-400">¥{Math.round(asp.reward).toLocaleString()}</td>
                      <td className="py-3 text-right text-emerald-500">¥{asp.revenue.toLocaleString()}</td>
                      <td className="py-3 text-right text-yellow-500 font-black">{asp.roas}%</td>
                      <td className="py-3 text-right text-pink-500">¥{asp.cpa.toLocaleString()}</td>
                      <td className="py-3 text-right text-cyan-500">¥{asp.cpc}</td>
                      <td className="py-3 text-right text-indigo-400">¥{asp.cpm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🏔️ メディア別成果ランキング（11大運用指標フルスペックス・トグルソート） */}
          <div className={`border rounded-2xl p-5 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-700 shadow-xl" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <div className="flex flex-col gap-2.5 mb-4">
              <h3 className={`text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
                <Layers size={12} className="text-amber-500" /> パートナー別効率ランキング
              </h3>
              
              {/* 11大指標完全網羅マトリクス・ソートパネル */}
              <div className={`grid grid-cols-4 gap-0.5 p-0.5 rounded-lg border text-[8px] font-black ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a] border-slate-800"}`}>
                {[
                  { k: "impressions", l: "IMP" }, { k: "clicks", l: "クリック" }, { k: "ctr", l: "CTR" },
                  { k: "issued_count", l: "CV" }, { k: "cvr", l: "CVR" }, { k: "issued_reward", l: "COST" },
                  { k: "revenue", l: "売上" }, { k: "roas", l: "ROAS" }, { k: "cpa", l: "CPA" },
                  { k: "cpc", l: "CPC" }, { k: "cpm", l: "CPM" }
                ].map(btn => (
                  <button
                    key={btn.k}
                    onClick={() => setMediaSortKey(btn.k)}
                    className={`py-1 rounded text-center transition-all ${mediaSortKey === btn.k ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    {btn.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {sortedMedias.length > 0 ? (
                sortedMedias.map((media: any, idx: number) => (
                  <div key={idx} className={`p-3.5 rounded-xl flex justify-between items-center transition-all border ${isLight ? "bg-slate-50 border-slate-100" : "bg-[#0f172a]/40 border-slate-800"}`}>
                    <div className="min-w-0 flex-grow pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 flex-shrink-0">R-{idx+1}</span>
                        <span className="text-[8px] opacity-60 font-mono truncate">ID:{media.media_id}</span>
                      </div>
                      <p className={`text-[10px] font-black truncate mt-1 ${isLight ? "text-slate-800" : "text-white"}`}>{media.media_name}</p>
                      <p className="text-[8px] text-slate-500 mt-0.5 font-bold uppercase">{media.asp}</p>
                    </div>
                    
                    {/* 右側：11大ステータス垂直並列・アクティブインジケーター */}
                    <div className="text-right flex-shrink-0 text-[8px] font-bold space-y-0.5 border-l border-slate-800 pl-3 min-w-[75px]">
                      <p className={mediaSortKey === "impressions" ? "text-blue-400 font-black text-[9px]" : "text-slate-500"}>{media.impressions.toLocaleString()} IMP</p>
                      <p className={mediaSortKey === "clicks" ? "text-orange-400 font-black text-[9px]" : "text-slate-500"}>{media.clicks.toLocaleString()} CLK</p>
                      <p className={mediaSortKey === "ctr" ? "text-purple-400 font-black text-[9px]" : "text-slate-500"}>CTR {media.ctr}%</p>
                      <p className={mediaSortKey === "issued_count" ? "text-green-500 font-black text-[9px]" : "text-slate-400"}>{media.issued_count} CV</p>
                      <p className={mediaSortKey === "cvr" ? "text-teal-400 font-black text-[9px]" : "text-slate-500"}>CVR {media.cvr}%</p>
                      <p className={mediaSortKey === "issued_reward" ? "text-red-400 font-black text-[9px]" : "text-slate-400"}>¥{Math.round(media.issued_reward).toLocaleString()}</p>
                      <p className={mediaSortKey === "revenue" ? "text-emerald-400 font-black text-[9px]" : "text-slate-500"}>¥{media.revenue.toLocaleString()}</p>
                      <p className={mediaSortKey === "roas" ? "text-yellow-400 font-black text-[9px]" : "text-slate-500"}>ROAS {media.roas}%</p>
                      <p className={mediaSortKey === "cpa" ? "text-pink-400 font-black text-[9px]" : "text-slate-500"}>CPA ¥{media.cpa.toLocaleString()}</p>
                      <p className={mediaSortKey === "cpc" ? "text-cyan-400 font-black text-[9px]" : "text-slate-500"}>CPC ¥{media.cpc}</p>
                      <p className={mediaSortKey === "cpm" ? "text-indigo-400 font-black text-[9px]" : "text-slate-500"}>CPM ¥{media.cpm}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-[9px] font-bold flex flex-col items-center justify-center gap-2">
                  <ShieldAlert size={16} className="text-slate-600"/>
                  マトリクスフィルターに該当する<br/>実弾データは存在しません。
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}