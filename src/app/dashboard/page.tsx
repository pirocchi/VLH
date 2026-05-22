"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Layers, MousePointer, Percent, ShoppingBag, DollarSign, Eye, 
  BarChart3, TrendingUp, Filter, Search, ShieldAlert,
  Coins, ArrowUpRight, Target, Flame, ChevronUp, ChevronDown,
  Users
} from "lucide-react";

// --- サブコンポーネント: 💡 改善！モバイルでの見切れを2000%防ぐアトミック・タイポグラフィ小島 ---
const VLHKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass, isLight }: any) => (
  <div className={`
    ${isLight ? "bg-white border-slate-200 shadow-md text-slate-800 shadow-md" : "bg-[#1e293b] border-slate-800 shadow-xl text-slate-100"} 
    p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden border min-h-[135px]
  `}>
    <div className="flex justify-between items-start gap-2">
      {/* 指標名はベテランのために視認性の高いサイズをキープ */}
      <span className="text-sm font-black tracking-wider block">
        {title}
      </span>
      <div className={`p-2.5 rounded-xl bg-opacity-10 ${colorClass} flex-shrink-0`}>
        <Icon size={16} />
      </div>
    </div>
    
    {/* 💡 核心：モバイル時はフォントを text-xl〜2xl に抑え、単位（￥や％）を足元に小さく添える不沈構造 */}
    <div className="mt-4 flex items-end flex-wrap gap-0.5 leading-none">
      {prefix && (
        <span className="text-xs md:text-sm font-black mr-0.5 mb-0.5 opacity-70">
          {prefix}
        </span>
      )}
      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
        {value}
      </span>
      {suffix && (
        <span className="text-xs md:text-sm font-black ml-0.5 mb-0.5 opacity-70">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

export default function VLHDashboardPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterRange, setFilterRange] = useState<string>("30d"); 
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [selectedAsp, setSelectedAsp] = useState<string>("all");
  const [searchMedia, setSearchMedia] = useState<string>("");
  const [tokutanFilter, setTokutanFilter] = useState<string>("all");
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
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVLHMemory();
  }, []);

  // 🔍 11大指標動的演算 & 多角的マトリクスフィルター
  const filteredData = useMemo(() => {
    const now = new Date();
    const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfToday = getStartOfDay(now);

    return performanceData.map(row => {
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

      return { ...row, revenue, ctr, cvr, roas, cpa, cpc, cpm };
    }).filter(row => {
      if (selectedAsp !== "all" && row.asp !== selectedAsp) return false;
      if (searchMedia && !row.media_name.toLowerCase().includes(searchMedia.toLowerCase()) && !row.media_id.toLowerCase().includes(searchMedia.toLowerCase())) return false;
      if (tokutanFilter === "tokutan" && row.cpa <= 6000) return false;
      if (tokutanFilter === "normal" && row.cpa > 6000) return false;

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
          return rowDate.getTime() >= getStartOfDay(new Date(customRange.start)).getTime() && rowDate.getTime() <= getStartOfDay(new Date(customRange.end)).getTime();
        default: return true;
      }
    });
  }, [performanceData, filterRange, customRange, selectedAsp, searchMedia, tokutanFilter]);

  // 💡 11大指標 グローバル統合集計
  const summary = useMemo(() => {
    const totalImp = filteredData.reduce((acc, row) => acc + (row.impressions || 0), 0);
    const totalClicks = filteredData.reduce((acc, row) => acc + (row.clicks || 0), 0);
    const totalIssued = filteredData.reduce((acc, row) => acc + (row.issued_count || 0), 0);
    const totalCost = filteredData.reduce((acc, row) => acc + (row.issued_reward || 0), 0);
    const totalRevenue = totalIssued * 79800;

    return {
      impressions: totalImp, clicks: totalClicks,
      ctr: totalImp > 0 ? parseFloat(((totalClicks / totalImp) * 100).toFixed(2)) : 0.0,
      issued_count: totalIssued,
      cvr: totalClicks > 0 ? parseFloat(((totalIssued / totalClicks) * 100).toFixed(2)) : 0.0,
      issued_reward: totalCost, revenue: totalRevenue,
      roas: totalCost > 0 ? parseFloat(((totalRevenue / totalCost) * 100).toFixed(2)) : 0.0,
      cpa: totalIssued > 0 ? Math.round(totalCost / totalIssued) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalCost / totalClicks).toFixed(2)) : 0.0,
      current_cpm: totalImp > 0 ? parseFloat(((totalCost / totalImp) * 1000).toFixed(2)) : 0.0
    };
  }, [filteredData]);

  const aspPerformance = useMemo(() => {
    const asps: any = {};
    filteredData.forEach(row => {
      if (!asps[row.asp]) asps[row.asp] = { impressions: 0, clicks: 0, issued: 0, reward: 0 };
      asps[row.asp].impressions += (row.impressions || 0);
      asps[row.asp].clicks += (row.clicks || 0);
      asps[row.asp].issued += (row.issued_count || 0);
      asps[row.asp].reward += (row.issued_reward || 0);
    });

    return Object.keys(asps).map(name => {
      const rev = asps[name].issued * 79800;
      const cost = asps[name].reward;
      return {
        name, impressions: asps[name].impressions, clicks: asps[name].clicks,
        ctr: asps[name].impressions > 0 ? parseFloat(((asps[name].clicks / asps[name].impressions) * 100).toFixed(2)) : 0.0,
        issued: asps[name].issued,
        cvr: asps[name].clicks > 0 ? parseFloat(((asps[name].issued / asps[name].clicks) * 100).toFixed(2)) : 0.0,
        reward: cost, revenue: rev,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: asps[name].issued > 0 ? Math.round(cost / asps[name].issued) : 0,
        cpc: asps[name].clicks > 0 ? parseFloat((cost / asps[name].clicks).toFixed(2)) : 0.0,
        cpm: asps[name].impressions > 0 ? parseFloat(((cost / asps[name].impressions) * 1000).toFixed(2)) : 0.0
      };
    }).sort((a: any, b: any) => {
      let valA = a[aspSortKey]; let valB = b[aspSortKey];
      return aspSortAsc ? valA - valB : valB - valA;
    });
  }, [filteredData, aspSortKey, aspSortAsc]);

  const sortedMedias = useMemo(() => {
    return [...filteredData].sort((a, b) => (b[mediaSortKey] || 0) - (a[mediaSortKey] || 0)).slice(0, 5);
  }, [filteredData, mediaSortKey]);

  const handleAspSort = (key: string) => {
    if (aspSortKey === key) { setAspSortAsc(!aspSortAsc); } else { setAspSortKey(key); setAspSortAsc(false); }
  };

  const renderSortIcon = (key: string) => {
    if (aspSortKey !== key) return null;
    return aspSortAsc ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest">全体ダッシュボード 展開中...</div>;

  return (
    <div className="w-full">
      
      {/* 👑 ヘッダー */}
      <header className={`px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white shadow-xl"}`}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight">全体ダッシュボード</h1>
        </div>
      </header>

      {/* 🛠️ コントロールパネル */}
      <div className="mb-5">
        <div className={`p-6 rounded-2xl border flex flex-col gap-5 shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white shadow-lg"}`}>
          
          <div className={`flex flex-wrap items-center gap-4 border-b pb-4 ${isLight ? "border-slate-200" : "border-slate-700/50"}`}>
            <div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest min-w-[80px]">
              <Filter size={14} /> 期間切替
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[{l:"前日", v:"yesterday"}, {l:"直近7日間", v:"7d"}, {l:"直近14日間", v:"14d"}, {l:"直近30日間", v:"30d"}, {l:"直近1年間", v:"1y"}, {l:"当月", v:"thisMonth"}, {l:"先月", v:"lastMonth"}, {l:"カスタム", v:"custom"}].map(range => (
                <button key={range.v} onClick={() => setFilterRange(range.v)} className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${filterRange === range.v ? "bg-indigo-600 text-white shadow-md" : (isLight ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-[#0f172a] text-slate-400 hover:text-white")}`}>{range.l}</button>
              ))}
            </div>
            {filterRange === "custom" && (
              <div className="flex items-center gap-2 ml-auto animate-in fade-in duration-200">
                <input type="date" value={customRange.start} onChange={(e)=>setCustomRange({...customRange, start: e.target.value})} className={`px-3 py-1 rounded-lg bg-transparent border text-xs font-bold ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
                <span className="text-slate-500 text-sm">~</span>
                <input type="date" value={customRange.end} onChange={(e)=>setCustomRange({...customRange, end: e.target.value})} className={`px-3 py-1 rounded-lg bg-transparent border text-xs font-bold ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-slate-400">ASP選択:</span>
              <select value={selectedAsp} onChange={(e) => setSelectedAsp(e.target.value)} className={`px-3 py-1.5 rounded-lg text-xs font-black border ${isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#0f172a] dark:border-slate-700 text-white"}`}>
                <option value="all">すべてのASPチャンネル</option>
                <option value="A8.net">A8.net</option><option value="afb">afb</option><option value="AccessTrade">AccessTrade</option><option value="felmat">felmat</option><option value="もしもアフィリエイト">もしもアフィリエイト</option><option value="QUORIZa">QUORIZa</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-grow max-w-xs">
              <span className="text-xs font-black tracking-wider text-slate-400 flex items-center gap-1"><Search size={12}/> パートナー検索:</span>
              <input type="text" placeholder="メディア名・IDを入力..." value={searchMedia} onChange={(e) => setSearchMedia(e.target.value)} className={`px-3 py-1.5 rounded-lg text-xs w-full border ${isLight ? "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400" : "bg-[#0f172a] border-slate-700 text-white placeholder-slate-500"}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-amber-500 flex items-center gap-1"><Coins size={12}/> 特単指定:</span>
              <div className={`flex p-0.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a] border-slate-700"}`}>
                {[{ v: "all", l: "すべて" }, { v: "normal", l: "通常単価" }, { v: "tokutan", l: "特単適用 (CPA>6k)" }].map(b => (
                  <button key={b.v} onClick={() => setTokutanFilter(b.v)} className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${tokutanFilter === b.v ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>{b.l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 メインコンテンツ */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-2 text-xs font-black tracking-widest text-slate-400 uppercase">■ 基礎成果セクション</div>
          {/* 💡 改善：prefix / suffix を個別に渡し、モバイル専用のフォント補正を起動 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <VLHKPICard title="インプレッション数" value={summary.impressions.toLocaleString()} suffix="回" icon={Eye} colorClass="text-blue-500 bg-blue-500" isLight={isLight} />
            <VLHKPICard title="クリック数" value={summary.clicks.toLocaleString()} suffix="回" icon={MousePointer} colorClass="text-orange-400 bg-orange-400" isLight={isLight} />
            <VLHKPICard title="クリック率" value={summary.ctr.toString()} suffix="％" icon={Percent} colorClass="text-purple-500 bg-purple-500" isLight={isLight} />
            <VLHKPICard title="コンバージョン数" value={summary.issued_count.toLocaleString()} suffix="件" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" isLight={isLight} />
            <VLHKPICard title="コンバージョン率" value={summary.cvr.toString()} suffix="％" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" isLight={isLight} />
          </div>
          <div className="border-l-4 border-emerald-500 pl-2 text-xs font-black tracking-widest text-slate-400 uppercase pt-2">■ 広告運用・財務効率セクション</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <VLHKPICard title="報酬額" prefix="￥" value={Math.round(summary.issued_reward).toLocaleString()} icon={DollarSign} colorClass="text-red-500 bg-red-500" isLight={isLight} />
            <VLHKPICard title="売上" prefix="￥" value={Math.round(summary.revenue).toLocaleString()} icon={ArrowUpRight} colorClass="text-emerald-500 bg-emerald-500" isLight={isLight} />
            <VLHKPICard title="ROAS" value={summary.roas.toString()} suffix="％" icon={Flame} colorClass="text-yellow-500 bg-yellow-500" isLight={isLight} />
            <VLHKPICard title="CPM" prefix="￥" value={Math.round(summary.current_cpm).toLocaleString()} icon={BarChart3} colorClass="text-indigo-400 bg-indigo-400" isLight={isLight} />
            <VLHKPICard title="CPC" prefix="￥" value={Math.round(summary.cpc).toLocaleString()} icon={Coins} colorClass="text-cyan-500 bg-cyan-500" isLight={isLight} />
            <VLHKPICard title="CPA" prefix="￥" value={Math.round(summary.cpa).toLocaleString()} icon={Target} colorClass="text-pink-500 bg-pink-500" isLight={isLight} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 border rounded-2xl p-6 overflow-hidden shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-700 shadow-md" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <h3 className={`text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}><BarChart3 size={14} className="text-indigo-500" /> ASP別レポート</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className={`border-b font-black uppercase select-none cursor-pointer ${isLight ? "border-slate-200 text-slate-500" : "border-slate-700 text-slate-400"}`}>
                    <th className="pb-3 text-left hover:text-indigo-500" onClick={() => handleAspSort("name")}>ASP {renderSortIcon("name")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500" onClick={() => handleAspSort("impressions")}>インプレッション数 {renderSortIcon("impressions")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500" onClick={() => handleAspSort("clicks")}>クリック数 {renderSortIcon("clicks")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500" onClick={() => handleAspSort("reward")}>報酬額 {renderSortIcon("reward")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500" onClick={() => handleAspSort("roas")}>ROAS {renderSortIcon("roas")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500" onClick={() => handleAspSort("cpa")}>CPA {renderSortIcon("cpa")}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-bold ${isLight ? "divide-slate-100 text-slate-700" : "divide-slate-800/60 text-slate-200"}`}>
                  {aspPerformance.map((asp:any, idx:number) => (
                    <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                      <td className={`py-4 font-black flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{asp.name}</td>
                      <td className="py-4 text-right opacity-80">{asp.impressions.toLocaleString()}回</td>
                      <td className="py-4 text-right">{asp.clicks.toLocaleString()}回</td>
                      <td className="py-4 text-right text-red-500">￥{Math.round(asp.reward).toLocaleString()}</td>
                      <td className="py-4 text-right text-yellow-500 font-black">{asp.roas}％</td>
                      <td className="py-4 text-right text-pink-500">￥{Math.round(asp.cpa).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`border rounded-2xl p-6 overflow-hidden shadow-md transition-all ${isLight ? "bg-white border-transparent text-slate-700 shadow-md" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <h3 className={`text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}><Users size={14} className="text-amber-500" /> 効率ランキング</h3>
            <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border text-[10px] font-black mb-4 ${isLight ? "border-slate-200 bg-slate-100" : "bg-[#0f172a] border-slate-800"}`}>
              {[{ k: "issued_count", l: "成果数" }, { k: "roas", l: "ROAS" }, { k: "cpa", l: "CPA" }, { k: "issued_reward", l: "報酬額" }].map(b => (
                <button key={b.v} onClick={() => setMediaSortKey(b.v)} className={`py-1.5 rounded-lg text-center transition-all ${mediaSortKey === b.v ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-400"}`}>{b.l}</button>
              ))}
            </div>
            <div className="space-y-3">
              {sortedMedias.map((media: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-xl flex justify-between items-center border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a]/40 border-slate-800"}`}>
                  <div className="min-w-0 flex-grow pr-3">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">第 {idx+1} 位</span>
                    <p className="text-base font-black truncate mt-2 text-slate-900 dark:text-white">{media.media_name}</p>
                    <div className={`py-1 font-black flex items-center gap-1.5 text-xs ${isLight ? "text-slate-700" : "text-slate-300"}`}><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{media.asp}</div>
                  </div>
                  <div className="text-right flex-shrink-0 text-xs font-black space-y-0.5 border-l border-slate-700/20 pl-4 min-w-[105px]">
                    <p className={mediaSortKey === "issued_count" ? "text-green-500 text-sm font-black" : "text-slate-400"}>{media.issued_count}件</p>
                    <p className={mediaSortKey === "roas" ? "text-yellow-500 text-sm font-black" : "text-slate-400"}>{media.roas}％</p>
                    <p className={mediaSortKey === "cpa" ? "text-pink-500 text-sm font-black" : "text-slate-400"}>￥{Math.round(media.cpa).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}