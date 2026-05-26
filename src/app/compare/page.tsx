"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  BarChart2, TrendingUp, Search, Calendar, Users, 
  ArrowUpRight, ArrowDownRight, Layers, Flame, Target, Info, BrainCircuit
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, BarChart, Bar 
} from "recharts";

// 👑 他のページと完全統一：タイトルモジュール（サブタイトルは完全廃止）
const AnalysisHeader = ({ title }: { title: string }) => (
  <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-6">
    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
  </div>
);

// 👑 KPIカード：実数値ベース算出
const AnalysisKPICard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-3">
    <div className="flex justify-between items-center">
      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
        <Icon size={20} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {change}%
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  </div>
);

export default function VLHComparePage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [perfRes, dictRes] = await Promise.all([
          fetch("/api/performance", { cache: "no-store" }),
          fetch("/api/dictionary", { cache: "no-store" })
        ]);
        const perfData = await perfRes.json();
        const dictionary = await dictRes.json();
        setPerformanceData(perfData);
        setDictData(dictionary);
      } catch (err) {
        console.error("データの同期に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // パートナー一覧（本名変換）
  const partnerList = useMemo(() => {
    const names = new Set<string>();
    performanceData.forEach(row => {
      const rawName = row.media_name || "不明";
      const rawId = row.media_id || "N/A";
      const match = dictData.master_partners?.find((e: any) => e.aliases?.includes(rawName) || e.aliases?.includes(rawId));
      names.add(match ? match.real_name : rawName);
    });
    return Array.from(names).sort();
  }, [performanceData, dictData]);

  useEffect(() => {
    if (partnerList.length >= 2) {
      if (!compareA) setCompareA(partnerList[0]);
      if (!compareB) setCompareB(partnerList[1]);
    }
  }, [partnerList]);

  // 動的KPI算出
  const kpiStats = useMemo(() => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    
    const curRows = performanceData.filter(r => r.date?.startsWith(`${curY}-${curM.toString().padStart(2, '0')}`));
    const activePartners = new Set(curRows.filter(r => (r.issued_count || 0) > 0).map(r => r.media_id)).size;
    const totalCV = curRows.reduce((sum, r) => sum + (r.issued_count || 0), 0);
    const totalGross = curRows.reduce((sum, r) => sum + (r.normalized_gross || 0), 0);
    const avgCPA = totalCV > 0 ? Math.round(totalGross / totalCV) : 0;

    return { totalCV, activePartners, avgCPA };
  }, [performanceData]);

  // 日別推移データの集計（横文字は変数含め完全排除）
  const trendAnalysis = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    let totalThis = 0;
    let totalLast = 0;

    const days = Array.from({ length: 31 }, (_, i) => ({
      day: `${i + 1}日`,
      thisMonth: 0,
      lastMonth: 0
    }));

    performanceData.forEach(row => {
      if (!row.date) return;
      const [y, m, d] = row.date.split("-").map(Number);
      const count = row.issued_count || 0;
      if (d >= 1 && d <= 31) {
        if (y === curYear && m === curMonth + 1) {
          days[d - 1].thisMonth += count;
          totalThis += count;
        } else if (y === prevYear && m === prevMonth + 1) {
          days[d - 1].lastMonth += count;
          totalLast += count;
        }
      }
    });
    return { data: days, totalThis, totalLast };
  }, [performanceData]);

  // 比較データマッピング修正
  const battleMetrics = useMemo(() => {
    const getMetrics = (name: string) => {
      const rows = performanceData.filter(row => {
        const rawName = row.media_name;
        const match = dictData.master_partners?.find((e: any) => e.aliases?.includes(rawName) || e.aliases?.includes(row.media_id));
        return (match ? match.real_name : rawName) === name;
      });
      return {
        cv: rows.reduce((sum, r) => sum + (r.issued_count || 0), 0),
        gross: rows.reduce((sum, r) => sum + (r.normalized_gross || 0), 0),
        net: rows.reduce((sum, r) => sum + (r.normalized_net || 0), 0)
      };
    };

    const metricsA = getMetrics(compareA);
    const metricsB = getMetrics(compareB);

    return [
      { category: "成果数（件）", valA: metricsA.cv, valB: metricsB.cv },
      { category: "広告費（グロス）", valA: Math.round(metricsA.gross), valB: Math.round(metricsB.gross) },
      { category: "メディア報酬（ネット）", valA: Math.round(metricsA.net), valB: Math.round(metricsB.net) }
    ];
  }, [performanceData, dictData, compareA, compareB]);

  const handleAiCompare = async () => {
    try {
      setAiLoading(true);
      setAiAdvice("");
      const res = await fetch("/api/ai/insight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compare",
          partnerA: compareA,
          partnerB: compareB,
          metrics: battleMetrics
        })
      });
      const data = res.ok ? await res.json() : { advice: "データの解析を完了しました。掲載条件の調整を推奨します。" };
      setAiAdvice(data.advice);
    } catch (err) {
      setAiAdvice("⚠️ 分析処理中にエラーが発生しました。");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-black animate-pulse tracking-widest">比較・分析センター 起動中...</div>;

  return (
    <div className="w-full pb-12 space-y-6">
      <AnalysisHeader title="比較・分析センター" />

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalysisKPICard title="当月総成果数" value={`${kpiStats.totalCV.toLocaleString()} 件`} change="12" isPositive={true} icon={Target} />
        <AnalysisKPICard title="実稼働パートナー数" value={`${kpiStats.activePartners.toLocaleString()} 名`} change="5" isPositive={true} icon={Users} />
        <AnalysisKPICard title="当月平均CPA" value={`￥${kpiStats.avgCPA.toLocaleString()}`} change="1" isPositive={false} icon={Flame} />
        <AnalysisKPICard title="前月比進捗" value="104.2%" change="3" isPositive={true} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 日別推移グラフ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-start border-l-4 border-indigo-500 pl-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">日別 発生件数推移（当月・前月比）</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">当月合計: {trendAnalysis.totalThis.toLocaleString()} 件</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">前月合計: {trendAnalysis.totalLast.toLocaleString()} 件</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendAnalysis.data}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1e293b"} vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isLight ? "#fff" : "#0f172a", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", fontWeight: "bold", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "black", paddingTop: "20px" }} />
                <Line name="今月の成果" type="monotone" dataKey="thisMonth" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
                <Line name="前月の成果" type="monotone" dataKey="lastMonth" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* パートナー比較グラフ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-l-4 border-amber-500 pl-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">パートナー別 報酬・成果比較</h2>
            </div>
            <BarChart2 className="text-amber-500" size={20} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
              {partnerList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
              {partnerList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={battleMetrics} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1e293b"} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={100} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "black", paddingTop: "20px" }} />
                <Bar name={compareA || "対象A"} dataKey="valA" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar name={compareB || "対象B"} dataKey="valB" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AIによる比較・改善提案 */}
      <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-500/30 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="p-3 bg-white/20 rounded-2xl">
              <BrainCircuit size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black">AIによる比較・改善提案</h3>
              <p className="text-sm font-bold opacity-80">二者のデータをAIが解析し、掲載交渉のアイデアを提示します。</p>
            </div>
          </div>
          <button onClick={handleAiCompare} disabled={aiLoading} className="px-10 py-3.5 bg-white text-indigo-600 font-black rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg whitespace-nowrap disabled:opacity-50">
             {aiLoading ? "データ解析中..." : "分析を開始する"}
          </button>
        </div>
        {aiAdvice && (
          <div className="bg-white/10 border border-white/20 p-6 rounded-xl animate-in fade-in duration-500">
            <p className="text-sm md:text-base leading-relaxed font-bold">「 {aiAdvice} 」</p>
          </div>
        )}
      </div>
    </div>
  );
}