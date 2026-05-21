"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, MousePointer, Percent, ShoppingBag, DollarSign, Eye, 
  BarChart3, TrendingUp, Sun, Moon, Clock, Filter, ChevronUp, ChevronDown
} from "lucide-react";

// --- サブコンポーネント: 独立浮遊する「真の小島」KPI ---
const VLHKPICard = ({ title, value, unit, icon: Icon, colorClass, isLight }: any) => (
  <div className={`
    ${isLight ? "bg-white border-transparent shadow-xl" : "bg-[#1e293b] border-slate-800 shadow-xl"} 
    p-6 rounded-2xl flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden
  `}>
    <div className="flex justify-between items-start">
      <span className={`text-[10px] font-bold tracking-widest uppercase ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        {title}
      </span>
      <div className={`p-2 rounded-xl bg-opacity-10 ${colorClass}`}>
        <Icon size={16} />
      </div>
    </div>
    <div className="mt-4 flex items-end gap-1.5">
      <span className={`text-2xl font-extrabold tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
        {value}
      </span>
      <span className={`text-[10px] font-bold mb-1 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
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

  const [filterRange, setFilterRange] = useState<string>("30d"); 
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  // 💡 ランキング小島用のソートキー（全6値完全網羅）
  const [mediaSortKey, setMediaSortKey] = useState<string>("issued_count");

  // 💡 ASPレポートテーブル用のソート状態（キーと昇順・降順フラグ）
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

  // 🔍 期間フィルタリング・演算ロジック
  const filteredData = useMemo(() => {
    const now = new Date();
    const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfToday = getStartOfDay(now);

    return performanceData.map(row => {
      // 💡 行ごとの個別のCTR・CVRをここで精密に動的算出
      const imp = row.impressions || 0;
      const clk = row.clicks || 0;
      const cv = row.issued_count || 0;
      return {
        ...row,
        ctr: imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0.0,
        cvr: clk > 0 ? parseFloat(((cv / clk) * 100).toFixed(2)) : 0.0
      };
    }).filter(row => {
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
  }, [performanceData, filterRange, customRange]);

  // 💡 集計コア
  const summary = useMemo(() => {
    const totalImp = filteredData.reduce((acc, row) => acc + (row.impressions || 0), 0);
    const totalClicks = filteredData.reduce((acc, row) => acc + (row.clicks || 0), 0);
    const totalIssued = filteredData.reduce((acc, row) => acc + (row.issued_count || 0), 0);
    const totalReward = filteredData.reduce((acc, row) => acc + (row.issued_reward || 0), 0);

    return {
      impressions: totalImp,
      clicks: totalClicks,
      ctr: totalImp > 0 ? parseFloat(((totalClicks / totalImp) * 100).toFixed(2)) : 0.0,
      issued_count: totalIssued,
      cvr: totalClicks > 0 ? parseFloat(((totalIssued / totalClicks) * 100).toFixed(2)) : 0.0,
      issued_reward: totalReward
    };
  }, [filteredData]);

  // 💡 ASPレポート集計エンジン ＋ 動的マトリクスソート
  const aspPerformance = useMemo(() => {
    const asps: any = {};
    filteredData.forEach(row => {
      if (!asps[row.asp]) asps[row.asp] = { impressions: 0, clicks: 0, issued: 0, reward: 0 };
      asps[row.asp].impressions += (row.impressions || 0);
      asps[row.asp].clicks += (row.clicks || 0);
      asps[row.asp].issued += (row.issued_count || 0);
      asps[row.asp].reward += (row.issued_reward || 0);
    });

    const list = Object.keys(asps).map(name => ({
      name, ...asps[name],
      ctr: asps[name].impressions > 0 ? parseFloat(((asps[name].clicks / asps[name].impressions) * 100).toFixed(2)) : 0.0,
      cvr: asps[name].clicks > 0 ? parseFloat(((asps[name].issued / asps[name].clicks) * 100).toFixed(2)) : 0.0
    }));

    // テーブルソート実行
    return list.sort((a: any, b: any) => {
      let valA = a[aspSortKey];
      let valB = b[aspSortKey];
      if (typeof valA === "string") return aspSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return aspSortAsc ? valA - valB : valB - valA;
    });
  }, [filteredData, aspSortKey, aspSortAsc]);

  // 💡 メディア別成果ランキング（出し惜しみ皆無の全6値完全対応ソート）
  const sortedMedias = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => {
        const valA = a[mediaSortKey] || 0;
        const valB = b[mediaSortKey] || 0;
        return valB - valA;
      })
      .slice(0, 5);
  }, [filteredData, mediaSortKey]);

  // テーブルのヘッダークリック用ハンドラー
  const handleAspSort = (key: string) => {
    if (aspSortKey === key) {
      setAspSortAsc(!aspSortAsc);
    } else {
      setAspSortKey(key);
      setAspSortAsc(false);
    }
  };

  // ソート用インジケーターアイコンレンダラー
  const renderSortIcon = (key: string) => {
    if (aspSortKey !== key) return null;
    return aspSortAsc ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse">VLH: UNLEASHING FULL CAPABILITIES...</div>;

  return (
    <div className="min-h-screen w-full font-sans p-4 sm:p-8 bg-[#0f172a] text-slate-100 transition-all duration-500">
      
      {/* 👑 ヘッダーの小島 */}
      <header className={`px-8 py-5 mb-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 overflow-hidden border ${isLight ? "bg-white border-transparent text-slate-800 shadow-xl" : "bg-[#1e293b] border-slate-800 text-white shadow-xl"}`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-xs tracking-wider">VLH</div>
          <h1 className="text-base font-black tracking-tight">メディア パフォーマンス</h1>
        </div>
        <div className={`flex p-1 rounded-xl ${isLight ? "bg-slate-100" : "bg-[#0f172a]"}`}>
          {[ {m:"light", i:Sun}, {m:"dark", i:Moon}, {m:"auto", i:Clock} ].map(t => (
            <button key={t.m} onClick={() => setThemeMode(t.m as any)} className={`p-2 rounded-lg transition-all ${themeMode === t.m ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-400"}`}>
              <t.i size={14} />
            </button>
          ))}
        </div>
      </header>

      {/* 🔍 期間フィルターの小島 */}
      <div className="mb-6">
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-800 shadow-xl" : "bg-[#1e293b] border-slate-800 text-white shadow-lg"}`}>
          <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest border-r pr-4 border-slate-700">
            <Filter size={12} /> Range
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              {l:"前日", v:"yesterday"}, {l:"直近7日間", v:"7d"}, {l:"直近14日間", v:"14d"},
              {l:"直近30日間", v:"30d"}, {l:"直近1年間", v:"1y"}, {l:"当月", v:"thisMonth"},
              {l:"先月", v:"lastMonth"}, {l:"カスタム", v:"custom"}
            ].map(range => (
              <button
                key={range.v}
                onClick={() => setFilterRange(range.v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterRange === range.v ? "bg-indigo-600 text-white shadow-sm" : (isLight ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-[#0f172a] text-slate-400 hover:text-white")}`}
              >
                {range.l}
              </button>
            ))}
          </div>
          {filterRange === "custom" && (
            <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-left-2">
              <input type="date" value={customRange.start} onChange={(e)=>setCustomRange({...customRange, start: e.target.value})} className={`px-2 py-1 rounded bg-transparent border text-[10px] ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
              <span className="text-slate-500 text-xs">~</span>
              <input type="date" value={customRange.end} onChange={(e)=>setCustomRange({...customRange, end: e.target.value})} className={`px-2 py-1 rounded bg-transparent border text-[10px] ${isLight ? "border-slate-300 text-slate-800" : "border-slate-700 text-white"}`} />
            </div>
          )}
        </div>
      </div>

      {/* 🚀 メインコンテンツ */}
      <div className="space-y-6">
        
        {/* KPI 6連小島群 */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
          <VLHKPICard title="インプレッション" value={summary.impressions.toLocaleString()} unit="IMP" icon={Eye} colorClass="text-blue-500 bg-blue-500" isLight={isLight} />
          <VLHKPICard title="総クリック数" value={summary.clicks.toLocaleString()} unit="CLICKS" icon={MousePointer} colorClass="text-orange-500 bg-orange-500" isLight={isLight} />
          <VLHKPICard title="平均誘導率" value={`${summary.ctr}%`} unit="CTR" icon={Percent} colorClass="text-purple-500 bg-purple-500" isLight={isLight} />
          <VLHKPICard title="発生成果数" value={summary.issued_count.toLocaleString()} unit="CV" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" isLight={isLight} />
          <VLHKPICard title="平均成約率" value={`${summary.cvr}%`} unit="CVR" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" isLight={isLight} />
          <VLHKPICard title="総発生報酬" value={`¥${summary.issued_reward.toLocaleString()}`} unit="JPY" icon={DollarSign} colorClass="text-amber-500 bg-amber-500" isLight={isLight} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* 📊 ASP別パフォーマンス・レポート（インタラクティブ全列ソート対応） */}
          <div className={`xl:col-span-2 border rounded-2xl p-6 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-700 shadow-xl" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <h3 className={`text-[11px] font-black mb-5 flex items-center gap-2 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
              <BarChart3 size={14} className="text-indigo-500" /> ASP別パフォーマンス・レポート <span className="text-[9px] text-slate-500 font-normal normal-case">(列ヘッダークリックで昇降ソート可能)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${isLight ? "border-slate-100 text-slate-400" : "border-slate-800 text-slate-500"} font-bold uppercase select-none`}>
                    <th className="pb-3 cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("name")}>ASPチャンネル {renderSortIcon("name")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("impressions")}>インプ {renderSortIcon("impressions")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("clicks")}>クリック {renderSortIcon("clicks")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("ctr")}>誘導率 {renderSortIcon("ctr")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("issued")}>発生成果 {renderSortIcon("issued")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("cvr")}>成約率 {renderSortIcon("cvr")}</th>
                    <th className="pb-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => handleAspSort("reward")}>発生報酬 {renderSortIcon("reward")}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? "divide-slate-100 text-slate-600" : "divide-slate-800/50 text-slate-300"} font-semibold`}>
                  {aspPerformance.map((asp:any, idx:number) => (
                    <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                      <td className={`py-3.5 font-bold ${isLight ? "text-slate-800" : "text-white"} flex items-center gap-2.5`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{asp.name}
                      </td>
                      <td className="py-3.5 text-right opacity-80">{asp.impressions.toLocaleString()}</td>
                      <td className="py-3.5 text-right">{asp.clicks.toLocaleString()}</td>
                      <td className="py-3.5 text-right text-purple-500">{asp.ctr}%</td>
                      <td className="py-3.5 text-right text-green-500 font-bold">{asp.issued}</td>
                      <td className="py-3.5 text-right text-teal-500 font-bold">{asp.cvr}%</td>
                      <td className="py-3.5 text-right text-amber-500 font-bold">¥{asp.reward.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🏔️ メディア別成果ランキング（全6値フルスペックス・ソート搭載） */}
          <div className={`border rounded-2xl p-6 overflow-hidden ${isLight ? "bg-white border-transparent text-slate-700 shadow-xl" : "bg-[#1e293b] border-slate-800 text-slate-300 shadow-xl"}`}>
            <div className="flex flex-col gap-3 mb-5">
              <h3 className={`text-[11px] font-black flex items-center gap-2 uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
                <Layers size={14} className="text-amber-500" /> メディア別成果ランキング
              </h3>
              
              {/* 💡 出し惜しみ皆無の6連マトリクススイッチ */}
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border text-[9px] font-bold ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a] border-slate-800"}`}>
                {[
                  { k: "impressions", l: "IMP" },
                  { k: "clicks", l: "クリック" },
                  { k: "ctr", l: "CTR" },
                  { k: "issued_count", l: "CV" },
                  { k: "cvr", l: "CVR" },
                  { k: "issued_reward", l: "報酬" }
                ].map(btn => (
                  <button
                    key={btn.k}
                    onClick={() => setMediaSortKey(btn.k)}
                    className={`py-1.5 rounded text-center transition-all ${mediaSortKey === btn.k ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    {btn.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3.5">
              {sortedMedias.length > 0 ? (
                sortedMedias.map((media: any, idx: number) => (
                  <div key={idx} className={`p-4.5 rounded-xl flex justify-between items-center transition-all border ${isLight ? "bg-slate-50 border-slate-100" : "bg-[#0f172a]/40 border-slate-800"}`}>
                    <div className="min-w-0">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-500 border border-indigo-500/20">RANK {idx+1}</span>
                      <p className={`text-[11px] font-bold truncate mt-2 ${isLight ? "text-slate-800" : "text-white"}`}>{media.media_name}</p>
                      <p className="text-[9px] text-slate-500 mt-1">{media.asp}</p> {/* 💡 クリックをここからパージし、右側へ移送！ */}
                    </div>
                    <div className="text-right flex-shrink-0 text-[10px] font-bold space-y-0.5">
                      <p className={mediaSortKey === "impressions" ? "text-blue-400 font-extrabold" : "text-slate-500"}>{media.impressions.toLocaleString()} IMP</p>
                      {/* 💡 クリックを右側の指標リストへ完全統合！ */}
                      <p className={mediaSortKey === "clicks" ? "text-orange-400 font-extrabold" : "text-slate-500"}>{media.clicks.toLocaleString()} CLK</p>
                      <p className={mediaSortKey === "ctr" ? "text-purple-400 font-extrabold" : "text-slate-500"}>CTR {media.ctr}%</p>
                      <p className={mediaSortKey === "issued_count" ? "text-green-500 font-extrabold" : "text-slate-400"}>{media.issued_count} CV</p>
                      <p className={mediaSortKey === "cvr" ? "text-teal-400 font-extrabold" : "text-slate-500"}>CVR {media.cvr}%</p>
                      <p className={mediaSortKey === "issued_reward" ? "text-amber-500 font-extrabold" : "text-slate-400"}>¥{media.issued_reward.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-500 text-[10px]">該当データはありません。</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}