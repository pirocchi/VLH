"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Layers, MousePointer, Percent, ShoppingBag, DollarSign, Eye, 
  BarChart3, TrendingUp, Filter, Search, ShieldAlert,
  Coins, ArrowUpRight, Target, Flame, ChevronUp, ChevronDown, Users
} from "lucide-react";

const VLHKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass }: any) => (
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

export default function VLHDashboardPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterRange, setFilterRange] = useState<string>("all"); 
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [selectedAsp, setSelectedAsp] = useState<string>("all");
  const [searchMedia, setSearchMedia] = useState<string>("");
  const [tokutanFilter, setTokutanFilter] = useState<string>("all");
  const [mediaSortKey, setMediaSortKey] = useState<string>("issued_count");
  const [aspSortKey, setAspSortKey] = useState<string>("normalized_gross");
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

  const filteredData = useMemo(() => {
    const now = new Date();
    const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfToday = getStartOfDay(now);

    return performanceData.map(row => {
      const imp = row.impressions || 0;
      const clk = row.clicks || 0;
      const cv = row.issued_count || 0;
      const cost = row.normalized_gross || 0; // 👑 修正：API側で正規化されたグロス税込コストを利用！
      
      const revenue = cv * 79800;
      const ctr = imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0.0;
      const cvr = clk > 0 ? parseFloat(((cv / clk) * 100).toFixed(2)) : 0.0;
      const roas = cost > 0 ? parseFloat(((revenue / cost) * 100).toFixed(2)) : 0.0;
      const cpa = cv > 0 ? Math.round(cost / cv) : 0;
      const cpf = clk > 0 ? parseFloat((cost / clk).toFixed(2)) : 0.0;
      const cpm = imp > 0 ? parseFloat(((cost / imp) * 1000).toFixed(2)) : 0.0;

      return { ...row, revenue, ctr, cvr, roas, cpa, cpc: cpf, cpm };
    }).filter(row => {
      if (selectedAsp !== "all" && row.asp !== selectedAsp) return false;
      if (searchMedia && !row.media_name.toLowerCase().includes(searchMedia.toLowerCase()) && !row.media_id.toLowerCase().includes(searchMedia.toLowerCase())) return false;
      if (tokutanFilter === "tokutan" && row.cpa <= 6000) return false;
      if (tokutanFilter === "normal" && row.cpa > 6000) return false;

      if (!row.date) return true;

      const dateStr = String(row.date);
      const d = (dateStr.length === 8 && /^\d+$/.test(dateStr)) 
        ? new Date(parseInt(dateStr.slice(0, 4)), parseInt(dateStr.slice(4, 6)) - 1, parseInt(dateStr.slice(6, 8)))
        : new Date(dateStr);
      
      const rowTime = d.getTime();
      const todayTime = startOfToday.getTime();
      const oneDayMs = 1000 * 60 * 60 * 24;

      switch (filterRange) {
        case "yesterday": return rowTime >= todayTime - oneDayMs && rowTime < todayTime;
        case "7d": return rowTime >= todayTime - (7 * oneDayMs);
        case "14d": return rowTime >= todayTime - (14 * oneDayMs);
        case "30d": return rowTime >= todayTime - (30 * oneDayMs);
        case "1y": return rowTime >= todayTime - (365 * oneDayMs);
        case "thisMonth": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case "lastMonth":
          const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lmYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getMonth() === lmMonth && d.getFullYear() === lmYear;
        case "custom":
          if (!customRange.start || !customRange.end) return true;
          const startLimit = getStartOfDay(new Date(customRange.start)).getTime();
          const endLimit = getStartOfDay(new Date(customRange.end)).getTime();
          return rowTime >= startLimit && rowTime <= endLimit;
        case "all":
        default: return true;
      }
    });
  }, [performanceData, filterRange, customRange, selectedAsp, searchMedia, tokutanFilter]);

  const summary = useMemo(() => {
    const totalImp = filteredData.reduce((acc, row) => acc + (row.impressions || 0), 0);
    const totalClicks = filteredData.reduce((acc, row) => acc + (row.clicks || 0), 0);
    const totalIssued = filteredData.reduce((acc, row) => acc + (row.issued_count || 0), 0);
    const totalCost = filteredData.reduce((acc, row) => acc + (row.normalized_gross || 0), 0); // 👑 修正
    const totalRevenue = totalIssued * 79800;

    return {
      impressions: totalImp, clicks: totalClicks,
      ctr: totalImp > 0 ? parseFloat(((totalClicks / totalImp) * 100).toFixed(2)) : 0.0,
      issued_count: totalIssued,
      vcr: totalClicks > 0 ? parseFloat(((totalIssued / totalClicks) * 100).toFixed(2)) : 0.0,
      normalized_gross: totalCost, revenue: totalRevenue,
      roas: totalCost > 0 ? parseFloat(((totalRevenue / totalCost) * 100).toFixed(2)) : 0.0,
      cpa: totalIssued > 0 ? Math.round(totalCost / totalIssued) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalCost / totalClicks).toFixed(2)) : 0.0,
      current_cpm: totalImp > 0 ? parseFloat(((totalCost / totalImp) * 1000).toFixed(2)) : 0.0
    };
  }, [filteredData]);

  const aspPerformance = useMemo(() => {
    const asps: any = {};
    filteredData.forEach(row => {
      if (!asps[row.asp]) asps[row.asp] = { impressions: 0, clicks: 0, issued: 0, normalized_gross: 0 };
      asps[row.asp].impressions += (row.impressions || 0);
      asps[row.asp].clicks += (row.clicks || 0);
      asps[row.asp].issued += (row.issued_count || 0);
      asps[row.asp].normalized_gross += (row.normalized_gross || 0); // 👑 修正
    });

    return Object.keys(asps).map(name => {
      const rev = asps[name].issued * 79800;
      const cost = asps[name].normalized_gross;
      return {
        name, impressions: asps[name].impressions, clicks: asps[name].clicks,
        ctr: asps[name].impressions > 0 ? parseFloat(((asps[name].clicks / asps[name].impressions) * 100).toFixed(2)) : 0.0,
        issued: asps[name].issued,
        cvr: asps[name].clicks > 0 ? parseFloat(((asps[name].issued / asps[name].clicks) * 100).toFixed(2)) : 0.0,
        normalized_gross: cost, revenue: rev,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: asps[name].issued > 0 ? Math.round(cost / asps[name].issued) : 0,
        cpc: asps[name].clicks > 0 ? parseFloat((cost / asps[name].clicks).toFixed(2)) : 0.0,
        cpm: asps[name].impressions > 0 ? parseFloat(((cost / asps[name].impressions) * 1000).toFixed(2)) : 0.0
      };
    }).sort((a: any, b: any) => {
      let valA = a[aspSortKey]; let valB = b[aspSortKey];
      if (typeof valA === "string") return aspSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return aspSortAsc ? valA - valB : valB - valA;
    });
  }, [filteredData, aspSortKey, aspSortAsc]);

  const sortedMedias = useMemo(() => {
    const mediaMap: Record<string, any> = {};

    filteredData.forEach(row => {
      if (!row.media_name) return;
      const key = `${row.media_name}_${row.asp}`;
      
      if (!mediaMap[key]) {
        mediaMap[key] = {
          media_name: row.media_name, asp: row.asp, impressions: 0, clicks: 0,
          issued_count: 0, normalized_gross: 0, revenue: 0
        };
      }
      
      mediaMap[key].impressions += (row.impressions || 0);
      mediaMap[key].clicks += (row.clicks || 0);
      mediaMap[key].issued_count += (row.issued_count || 0);
      mediaMap[key].normalized_gross += (row.normalized_gross || 0); // 👑 修正
      mediaMap[key].revenue += (row.revenue || 0);
    });

    const aggregatedList = Object.values(mediaMap).map((media: any) => {
      const cv = media.issued_count;
      const cost = media.normalized_gross;
      const rev = media.revenue;

      return {
        ...media,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: cv > 0 ? Math.round(cost / cv) : 0
      };
    });

    return aggregatedList.sort((a: any, b: any) => {
      if (mediaSortKey === "cpa") return (a.cpa || 0) - (b.cpa || 0);
      return (b[mediaSortKey] || 0) - (a[mediaSortKey] || 0);
    }).slice(0, 5);
  }, [filteredData, mediaSortKey]);

  const handleAspSort = (key: string) => {
    if (aspSortKey === key) { setAspSortAsc(!aspSortAsc); } else { setAspSortKey(key); setAspSortAsc(false); }
  };

  const renderSortIcon = (key: string) => {
    if (aspSortKey !== key) return null;
    return aspSortAsc ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">全体ダッシュボード 展開中...</div>;

  return (
    <div className="w-full space-y-5">
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">全体ダッシュボード</h1>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-5 transition-all">
        <div className="flex flex-wrap items-center gap-4 border-b pb-4 border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest min-w-[80px]"><Filter size={14} /> 期間切替</div>
          <div className="flex flex-wrap gap-1.5">
            {[{l:"全期間", v:"all"}, {l:"前日", v:"yesterday"}, {l:"直近7日間", v:"7d"}, {l:"直近14日間", v:"14d"}, {l:"直近30日間", v:"30d"}, {l:"直近1年間", v:"1y"}, {l:"当月", v:"thisMonth"}, {l:"先月", v:"lastMonth"}, {l:"カスタム", v:"custom"}].map(range => (
              <button key={range.v} onClick={() => setFilterRange(range.v)} 
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${filterRange === range.v ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"}`}>
                {range.l}
              </button>
            ))}
          </div>
          {filterRange === "custom" && (
            <div className="flex items-center gap-2 ml-auto animate-in fade-in duration-200">
              <input type="date" value={customRange.start} onChange={(e)=>setCustomRange({...customRange, start: e.target.value})} className="px-3 py-1 rounded-lg bg-transparent border text-xs font-bold focus:outline-none focus:border-indigo-500 border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-950" />
              <span className="text-slate-400 dark:text-slate-500 text-sm">~</span>
              <input type="date" value={customRange.end} onChange={(e)=>setCustomRange({...customRange, end: e.target.value})} className="px-3 py-1 rounded-lg bg-transparent border text-xs font-bold focus:outline-none focus:border-indigo-500 border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-950" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm font-bold">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-slate-400 dark:text-slate-500">ASP選択:</span>
            <select value={selectedAsp} onChange={(e) => setSelectedAsp(e.target.value)} 
              className="px-3 py-1.5 rounded-lg text-xs font-black border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200">
              <option value="all">すべてのASP</option><option value="A8.net">A8.net</option><option value="afb">afb</option><option value="AccessTrade">AccessTrade</option><option value="felmat">felmat</option><option value="もしもアフィリエイト">もしもアフィリエイト</option><option value="QUORIZa">QUORIZa</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-grow max-w-xs">
            <span className="text-xs font-black tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Search size={12}/> パートナー検索:</span>
            <input type="text" placeholder="メディア名・IDを入力..." value={searchMedia} onChange={(e) => setSearchMedia(e.target.value)} 
              className="px-3 py-1.5 rounded-lg text-xs w-full border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-amber-500 flex items-center gap-1"><Coins size={12}/> パートナー指定:</span>
            <div className="flex p-0.5 rounded-xl border bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-700">
              {[{ v: "all", l: "すべて" }, { v: "normal", l: "CPA ￥6,000以下" }, { v: "tokutan", l: "CPA ￥6,000以上" }].map(b => (
                <button key={b.v} onClick={() => setTokutanFilter(b.v)} 
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${tokutanFilter === b.v ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200"}`}>{b.l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-2 text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">■ 基礎成果セクション</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <VLHKPICard title="インプレッション数" value={summary.impressions.toLocaleString()} suffix="回" icon={Eye} colorClass="text-blue-500 bg-blue-500" />
            <VLHKPICard title="クリック数" value={summary.clicks.toLocaleString()} suffix="回" icon={MousePointer} colorClass="text-orange-400 bg-orange-400" />
            <VLHKPICard title="クリック率" value={summary.ctr.toString()} suffix="％" icon={Percent} colorClass="text-purple-500 bg-purple-500" />
            <VLHKPICard title="コンバージョン数" value={summary.issued_count.toLocaleString()} suffix="件" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" />
            <VLHKPICard title="コンバージョン率" value={summary.vcr.toString()} suffix="％" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" />
          </div>
          <div className="border-l-4 border-emerald-500 pl-2 text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase pt-2">■ 広告運用・財務効率セクション</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <VLHKPICard title="広告費(グロス税込)" prefix="￥" value={Math.round(summary.normalized_gross).toLocaleString()} icon={DollarSign} colorClass="text-red-500 bg-red-500" />
            <VLHKPICard title="売上" prefix="￥" value={Math.round(summary.revenue).toLocaleString()} icon={ArrowUpRight} colorClass="text-emerald-500 bg-emerald-500" />
            <VLHKPICard title="ROAS" value={summary.roas.toString()} suffix="％" icon={Flame} colorClass="text-yellow-500 bg-yellow-500" />
            <VLHKPICard title="CPM" prefix="￥" value={Math.round(summary.current_cpm).toLocaleString()} icon={BarChart3} colorClass="text-indigo-400 bg-indigo-400" />
            <VLHKPICard title="CPC" prefix="￥" value={Math.round(summary.cpc).toLocaleString()} icon={Coins} colorClass="text-cyan-500 bg-cyan-500" />
            <VLHKPICard title="CPA" prefix="￥" value={Math.round(summary.cpa).toLocaleString()} icon={Target} colorClass="text-pink-500 bg-pink-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 border rounded-2xl p-6 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all">
            <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-slate-50"><BarChart3 size={14} className="text-indigo-500" /> ASP別レポート</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase select-none cursor-pointer">
                    <th className="pb-3 text-left hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("name")}>ASP {renderSortIcon("name")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("impressions")}>インプレッション数 {renderSortIcon("impressions")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("clicks")}>クリック数 {renderSortIcon("clicks")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("normalized_gross")}>広告費(グロス税込) {renderSortIcon("normalized_gross")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("roas")}>ROAS {renderSortIcon("roas")}</th>
                    <th className="pb-3 text-right hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" onClick={() => handleAspSort("cpa")}>CPA {renderSortIcon("cpa")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200 font-bold">
                  {aspPerformance.map((asp:any, idx:number) => (
                    <tr key={idx} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors">
                      <td className="py-4 font-black text-slate-900 dark:text-slate-50 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{asp.name}</td>
                      <td className="py-4 text-right opacity-70 text-slate-500 dark:text-slate-400">{asp.impressions.toLocaleString()}回</td>
                      <td className="py-4 text-right text-slate-700 dark:text-slate-300">{asp.clicks.toLocaleString()}回</td>
                      <td className="py-4 text-right text-red-500 dark:text-red-400">￥{Math.round(asp.normalized_gross).toLocaleString()}</td>
                      <td className="py-4 text-right text-yellow-600 dark:text-yellow-400 font-black">{asp.roas}％</td>
                      <td className="py-4 text-right text-pink-500 dark:text-pink-400">￥{Math.round(asp.cpa).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border rounded-2xl p-6 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all">
            <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-slate-50"><Users size={14} className="text-amber-500" /> 効率ランキング</h3>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl border text-[10px] font-black mb-4 border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
              {[{ k: "issued_count", l: "成果数" }, { k: "roas", l: "ROAS" }, { k: "cpa", l: "CPA" }, { k: "normalized_gross", l: "広告費" }].map(b => (
                <button key={b.k} onClick={() => setMediaSortKey(b.k)} 
                  className={`py-1.5 rounded-lg text-center transition-all ${mediaSortKey === b.k ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"}`}>{b.l}</button>
              ))}
            </div>
            <div className="space-y-3">
              {sortedMedias.map((media: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl flex justify-between items-center border bg-slate-50/50 border-slate-200 dark:bg-slate-950/40 dark:border-slate-800">
                  <div className="min-w-0 flex-grow pr-3">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">第 {idx+1} 位</span>
                    <p className="text-base font-black truncate mt-2 text-slate-900 dark:text-slate-50">{media.media_name}</p>
                    <div className="py-1 font-black flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{media.asp}</div>
                  </div>
                  <div className="text-right flex-shrink-0 text-xs font-black space-y-0.5 border-l border-slate-200 dark:border-slate-800 pl-4 min-w-[105px]">
                    <p className={mediaSortKey === "issued_count" ? "text-green-500 dark:text-green-400 text-sm font-black" : "text-slate-400 dark:text-slate-500"}>{media.issued_count}件</p>
                    <p className={mediaSortKey === "roas" ? "text-yellow-500 dark:text-yellow-400 text-sm font-black" : "text-slate-400 dark:text-slate-500"}>{media.roas}％</p>
                    <p className={mediaSortKey === "cpa" ? "text-pink-500 dark:text-pink-400 text-sm font-black" : "text-slate-400 dark:text-slate-500"}>￥{Math.round(media.cpa).toLocaleString()}</p>
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