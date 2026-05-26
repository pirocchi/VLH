"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  BarChart2, TrendingUp, Search, Calendar, Users, 
  ArrowUpRight, ArrowDownRight, Layers, Flame, Target, Info
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, BarChart, Bar, Cell, AreaChart, Area 
} from "recharts";

// 👑 McKinsey級のモダンKPIカードコンポーネント
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
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
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
  
  // 👑 パートナー比較用のマルチ選択状態
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

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
        console.error("分析データの同期に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 👑 パートナー一覧の正規化（重複排除・本名変換）
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

  // 👑 【時系列オーバーレイ】当月 vs 前月の集計
  const trendData = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    const days = Array.from({ length: 31 }, (_, i) => ({
      day: `${i + 1}日`,
      thisMonth: 0,
      lastMonth: 0
    }));

    performanceData.forEach(row => {
      if (!row.date) return;
      const [y, m, d] = row.date.split("-").map(Number);
      if (d >= 1 && d <= 31) {
        if (y === curYear && m === curMonth + 1) days[d - 1].thisMonth += row.issued_count || 0;
        else if (y === prevYear && m === prevMonth + 1) days[d - 1].lastMonth += row.issued_count || 0;
      }
    });
    return days;
  }, [performanceData]);

  // 👑 【パートナー比較】A vs B のメトリクス抽出
  const comparisonData = useMemo(() => {
    const getMetrics = (name: string) => {
      const rows = performanceData.filter(row => {
        const rawName = row.media_name;
        const match = dictData.master_partners?.find((e: any) => e.aliases?.includes(rawName) || e.aliases?.includes(row.media_id));
        return (match ? match.real_name : rawName) === name;
      });
      return {
        cv: rows.reduce((sum, r) => sum + (row.issued_count || 0), 0),
        gross: rows.reduce((sum, r) => sum + (row.normalized_gross || 0), 0),
        net: rows.reduce((sum, r) => sum + (row.normalized_net || 0), 0)
      };
    };

    const metricsA = getMetrics(compareA);
    const metricsB = getMetrics(compareB);

    return [
      { category: "成果数 (CV)", [compareA]: metricsA.cv, [compareB]: metricsB.cv },
      { category: "自社コスト (Gross)", [compareA]: Math.round(metricsA.gross), [compareB]: Math.round(metricsB.gross) },
      { category: "パートナー利益 (Net)", [compareA]: Math.round(metricsA.net), [compareB]: Math.round(metricsB.net) }
    ];
  }, [performanceData, dictData, compareA, compareB]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-black animate-pulse tracking-widest">戦略司令室 起動中...</div>;

  return (
    <div className="w-full space-y-8 pb-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">比較・分析センター</h1>
          <p className="text-sm font-bold text-slate-400">Time-Series Overlay & Partner Battle Analysis</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 flex items-center gap-2">
             <Layers size={14} /> 戦略的俯瞰モード
           </div>
        </div>
      </header>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AnalysisKPICard title="当月総成果数" value="1,284" change="12.5" isPositive={true} icon={Target} />
        <AnalysisKPICard title="前月比進捗" value="104.2%" change="3.1" isPositive={true} icon={TrendingUp} />
        <AnalysisKPICard title="平均CPA" value="￥17,420" change="0.8" isPositive={false} icon={Flame} />
        <AnalysisKPICard title="アクティブ会員" value="48名" change="5.4" isPositive={true} icon={Users} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* 日別トレンドオーバーレイ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4">
            <TrendingUp className="text-indigo-500" size={24} />
            <div>
              <h2 className="text-lg font-black">日別トレンド・オーバーレイ</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current vs Previous Month Performance</p>
            </div>
          </div>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1e293b"} vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isLight ? "#fff" : "#0f172a", borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "bold" }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontWeight: "bold", fontSize: "12px" }} />
                <Line name="当月成果" type="monotone" dataKey="thisMonth" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
                <Line name="前月成果" type="monotone" dataKey="lastMonth" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* パートナー対抗アナライザー */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-amber-500 pl-4">
            <div className="flex items-center gap-3">
              <BarChart2 className="text-amber-500" size={24} />
              <div>
                <h2 className="text-lg font-black">パートナー対抗アナライザー</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Direct Combat KPI Comparison</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 ml-1">対抗 A</span>
              <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:outline-none focus:border-indigo-500">
                {partnerList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 ml-1">対抗 B</span>
              <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:outline-none focus:border-indigo-500">
                {partnerList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1e293b"} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} fontWeight="black" axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold" }} />
                <Legend wrapperStyle={{ paddingTop: "20px", fontWeight: "bold" }} />
                <Bar dataKey={compareA} fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey={compareB} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insight Trigger */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-indigo-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full animate-pulse">
            <Flame size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black">AI比較インサイトを生成</h3>
            <p className="text-sm font-bold opacity-80">現在の戦況に基づき、Geminiが掲載交渉の優先順位を提案します。</p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white text-indigo-600 font-black rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg whitespace-nowrap">
           分析を開始する
        </button>
      </div>
    </div>
  );
}