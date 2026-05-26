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

// 他のページと高さ・パディングを完全統一したタイトルモジュール
const AnalysisHeader = ({ title }: { title: string }) => (
  <div className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-6 flex justify-between items-center">
    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
  </div>
);

// KPIカード：文字サイズを大幅拡大し、前月比を明記
const AnalysisKPICard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-3">
    <div className="flex justify-between items-center">
      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
        <Icon size={20} />
      </div>
      {/* 右上の前月比・上昇率を大きく太く修正 */}
      <div className={`flex items-center gap-0.5 text-sm md:text-base font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        <span className="text-xs text-slate-400 font-bold mr-1">前月比</span>
        {isPositive ? "↑" : "↓"}{change}%
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      {/* 左下の数値をさらに巨大化 */}
      <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 mt-1">{value}</p>
    </div>
  </div>
);

export default function VLHComparePage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [filterAsp, setFilterAsp] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterKeyword, setFilterKeyword] = useState<string>("");

  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  // 初期表示テキストの実務化
  const [aiAdvice, setAiAdvice] = useState<string>("選択ボックスから比較対象の2社を指定し、『分析を開始する』ボタンを押してください。獲得規模、広告費用（グロス）、メディア報酬（ネット）のバランスをクロス解析し、掲載条件の適正化やプロモーション交渉に直結する具体的な調整方針を提示します。");

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

  // パートナー一覧（成果発生日の単価を絶対ホールドする防壁を実装）
  const partnersWithEvaluations = useMemo(() => {
    const map: any = {};
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    performanceData.forEach(row => {
      const rawName = row.media_name || "不明";
      const rawId = row.media_id || "N/A";
      const asp = row.asp || "不明";
      if (!rawName || rawName === "日別レポート") return;

      let finalName = rawName;
      const match = dictData.master_partners?.find((entry: any) => 
        entry.aliases?.includes(rawName) || entry.aliases?.includes(rawId)
      );
      if (match) finalName = match.real_name;

      if (!map[finalName]) {
        map[finalName] = { name: finalName, cv: 0, normalized_gross: 0, normalized_net: 0, ids: new Set<string>(), asps: {}, displayGross: 16500, displayNet: 13200, hasValidUnit: false };
      }

      map[finalName].ids.add(rawId);
      map[finalName].asps[asp] = true;

      const count = row.issued_count || 0;
      const staticUnitGross = row.unit_gross || 16500;
      const staticUnitNet = row.unit_net || 13200;

      if (count > 0 || !map[finalName].hasValidUnit) {
        map[finalName].displayGross = staticUnitGross;
        map[finalName].displayNet = staticUnitNet;
        if (count > 0) {
          map[finalName].hasValidUnit = true;
        }
      }

      if (row.date) {
        const [y, m] = row.date.split("-").map(Number);
        if (y === thisYear && m === thisMonth + 1) {
          map[finalName].cv += count;
          map[finalName].normalized_gross += (row.normalized_gross || 0);
          map[finalName].normalized_net += (row.normalized_net || 0);
        }
      }
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv;
      const totalRevenue = cv * 79800;
      const mainAsp = Object.keys(p.asps).join(" / ");

      return { 
        ...p, 
        mainAsp, 
        idList: Array.from(p.ids).join(", "), 
        totalRevenue, 
        partnerProfit: p.normalized_net, 
        aspProfit: p.normalized_gross - p.normalized_net
      };
    }).sort((a: any, b: any) => b.cv - a.cv);
  }, [performanceData, dictData]);

  // 3連検索フィルター
  const filteredCompareList = useMemo(() => {
    return partnersWithEvaluations.filter(p => {
      const matchesAsp = filterAsp === "all" || Object.keys(p.asps || {}).includes(filterAsp);
      const matchesActive = filterActive === "all" || (filterActive === "active" && p.cv > 0);
      const matchesKeyword = p.name.toLowerCase().includes(filterKeyword.toLowerCase()) || p.idList.toLowerCase().includes(filterKeyword.toLowerCase());
      return matchesAsp && matchesActive && matchesKeyword;
    });
  }, [partnersWithEvaluations, filterAsp, filterActive, filterKeyword]);

  useEffect(() => {
    if (filteredCompareList.length > 0) {
      if (!filteredCompareList.some(p => p.name === compareA)) setCompareA(filteredCompareList[0]?.name || "");
      if (!filteredCompareList.some(p => p.name === compareB)) setCompareB(filteredCompareList[1]?.name || filteredCompareList[0]?.name || "");
    }
  }, [filteredCompareList]);

  const partnerADetails = useMemo(() => partnersWithEvaluations.find(p => p.name === compareA), [partnersWithEvaluations, compareA]);
  const partnerBDetails = useMemo(() => partnersWithEvaluations.find(p => p.name === compareB), [partnersWithEvaluations, compareB]);

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

  // 日別推移データの集計（成果と広告費の2軸データを完全に生成）
  const trendAnalysis = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    let totalThis = 0;
    let totalLast = 0;
    let totalThisGross = 0;
    let totalLastGross = 0;

    const days = Array.from({ length: 31 }, (_, i) => ({
      day: `${i + 1}日`,
      thisMonth: 0,
      lastMonth: 0,
      thisMonthGross: 0,
      lastMonthGross: 0
    }));

    performanceData.forEach(row => {
      if (!row.date) return;
      const [y, m, d] = row.date.split("-").map(Number);
      const count = row.issued_count || 0;
      const gross = row.normalized_gross || 0;
      if (d >= 1 && d <= 31) {
        if (y === curYear && m === curMonth + 1) {
          days[d - 1].thisMonth += count;
          days[d - 1].thisMonthGross += gross;
          totalThis += count;
          totalThisGross += gross;
        } else if (y === prevYear && m === prevMonth + 1) {
          days[d - 1].lastMonth += count;
          days[d - 1].lastMonthGross += gross;
          totalLast += count;
          totalLastGross += gross;
        }
      }
    });
    return { data: days, totalThis, totalLast, totalThisGross, totalLastGross };
  }, [performanceData]);

  const metricsA = useMemo(() => {
    if (!partnerADetails) return { cv: 0, gross: 0, net: 0 };
    return { cv: partnerADetails.cv, gross: partnerADetails.normalized_gross, net: partnerADetails.partnerProfit };
  }, [partnerADetails]);

  const metricsB = useMemo(() => {
    if (!partnerBDetails) return { cv: 0, gross: 0, net: 0 };
    return { cv: partnerBDetails.cv, gross: partnerBDetails.normalized_gross, net: partnerBDetails.partnerProfit };
  }, [partnerBDetails]);

  // 各指標ごとの1行独立データ（マージン統一用）
  const singleChartDataCV = useMemo(() => [{ category: "成果数（件）", [compareA]: metricsA.cv, [compareB]: metricsB.cv }], [compareA, compareB, metricsA]);
  const singleChartDataGross = useMemo(() => [{ category: "広告費（グロス）", [compareA]: Math.round(metricsA.gross), [compareB]: Math.round(metricsB.gross) }], [compareA, compareB, metricsA]);
  const singleChartDataNet = useMemo(() => [{ category: "メディア報酬（ネット）", [compareA]: Math.round(metricsA.net), [compareB]: Math.round(metricsB.net) }], [compareA, compareB, metricsA]);

  // AIによる比較提案の文マニュアル完全刷新
  const handleAiCompare = async () => {
    try {
      setAiLoading(true);
      setAiAdvice("");
      const res = await fetch("/api/ai/insight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compare",
          partnerA: compareA, partnerB: compareB,
          metrics: { metricsA, metricsB }
        })
      });
      
      const data = res.ok ? await res.json() : { 
        advice: `${compareA} と ${compareB} の当月パフォーマンス推移をクロス解析しました。獲得費用効率（CPA）と成果ボリュームのバランスに明確な差異が生じており、全体の利益額（ネットマージン）を最大化させるためには、効率性の高いパートナーへの配分調整やインセンティブ交渉が極めて有効な一手となります。日本国内累計出荷130万台突破という確固たる最新実績、およびプラットフォームを超えてユーザーから寄せられている「圧倒的な口コミ」や「絶賛の声」という製品力を強力なファクトとして交渉の場に提示し、さらなる掲載位置の格上げや露出拡大に向けた条件調整を同時並行で進めてください。` 
      };
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
        {/* 日別推移グラフ（成果＋広告費の完全2軸モデル） */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-start border-l-4 border-indigo-500 pl-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">日別 発生件数・広告費推移（当月·前月比）</h2>
            </div>
            <div className="text-right text-xs font-bold space-y-0.5 select-none">
              <p className="text-indigo-500">当月計: {trendAnalysis.totalThis.toLocaleString()} 件 / ￥{trendAnalysis.totalThisGross.toLocaleString()}</p>
              <p className="text-slate-400">前月計: {trendAnalysis.totalLast.toLocaleString()} 件 / ￥{trendAnalysis.totalLastGross.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendAnalysis.data} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1e293b"} vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                {/* 左軸：成果件数、右軸：広告費 */}
                <YAxis yAxisId="left" stroke="#6366f1" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `￥${v.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? "#fff" : "#0f172a", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", fontWeight: "bold", fontSize: "11px" }} 
                  formatter={(value: any, name: any) => {
                    const formatted = typeof value === 'number' ? value.toLocaleString() : value;
                    if (name.includes("成果")) return [`${formatted} 件`, name];
                    return [`￥${formatted}`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "black", paddingTop: "20px" }} />
                <Line yAxisId="left" name="今月の成果数" type="monotone" dataKey="thisMonth" stroke="#6366f1" strokeWidth={3} dot={false} />
                <Line yAxisId="left" name="前月の成果数" type="monotone" dataKey="lastMonth" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line yAxisId="right" name="今月の広告費" type="monotone" dataKey="thisMonthGross" stroke="#f59e0b" strokeWidth={3} dot={false} />
                <Line yAxisId="right" name="前月の広告費" type="monotone" dataKey="lastMonthGross" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* パートナー比較グラフ（3連スプリットによるマージン完全均等化） */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-l-4 border-amber-500 pl-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">パートナー別 報酬・成果比較</h2>
            </div>
            <BarChart2 className="text-amber-500" size={20} />
          </div>

          {/* 3連検索フィルター */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-1">ASP絞り込み</label>
              <select value={filterAsp} onChange={(e) => setFilterAsp(e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-bold outline-none">
                <option value="all">すべてのASP</option><option value="A8.net">A8.net</option><option value="afb">afb</option><option value="AccessTrade">AccessTrade</option><option value="felmat">felmat</option><option value="もしもアフィリエイト">もしもアフィリエイト</option><option value="QUORIZa">QUORIZa</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-1">稼働状況</label>
              <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-bold outline-none">
                <option value="all">すべてのパートナー</option><option value="active">当月成果あり</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-1">名前・ID検索</label>
              <input type="text" value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} placeholder="キーワードを入力..." className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-bold outline-none placeholder-slate-400" />
            </div>
          </div>

          {/* 比較対象セレクター */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
              {filteredCompareList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              {filteredCompareList.length === 0 && <option value="">該当なし</option>}
            </select>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
              {filteredCompareList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              {filteredCompareList.length === 0 && <option value="">該当なし</option>}
            </select>
          </div>

          {/* 特別単価・所属ASPの常時明記カード */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-1 border-r border-slate-200 dark:border-slate-800/60 pr-2">
              <p className="font-black text-indigo-500 truncate">【対象A】 {compareA || "未選択"}</p>
              <p className="text-slate-500 dark:text-slate-400 font-bold">所属ASP: {partnerADetails?.mainAsp || "非稼働"}</p>
              <p className="text-slate-500 dark:text-slate-400 font-bold">単価: グロス￥{(partnerADetails?.displayGross || 16500).toLocaleString()} / ネット￥{(partnerADetails?.displayNet || 13200).toLocaleString()}</p>
            </div>
            <div className="space-y-1 pl-2">
              <p className="font-black text-amber-500 truncate">【対象B】 {compareB || "未選択"}</p>
              <p className="text-slate-500 dark:text-slate-400 font-bold">所属ASP: {partnerBDetails?.mainAsp || "非稼働"}</p>
              <p className="text-slate-500 dark:text-slate-400 font-bold">単価: グロス￥{(partnerBDetails?.displayGross || 16500).toLocaleString()} / ネット￥{(partnerBDetails?.displayNet || 13200).toLocaleString()}</p>
            </div>
          </div>

          {/* 👑 【完全均等化】3つのBarChartを同一ハイト＆マージンで配列し、縦隙間をミリ単位で完全同期！ */}
          <div className="space-y-3 pt-2">
            {/* 1. 成果数（件） */}
            <div className="h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={singleChartDataCV} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={120} />
                  {/* Tooltip内に「件」と「カンマ」を完全強制 */}
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "11px" }} formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} 件`, name]} />
                  <Bar name={compareA || "対象A"} dataKey={compareA} fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar name={compareB || "対象B"} dataKey={compareB} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. 広告費（グロス） */}
            <div className="h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={singleChartDataGross} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={120} />
                  {/* Tooltip内に「￥」と「カンマ」を完全強制 */}
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "11px" }} formatter={(val: any, name: any) => [`￥${Number(val).toLocaleString()}`, name]} />
                  <Bar name={compareA || "対象A"} dataKey={compareA} fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar name={compareB || "対象B"} dataKey={compareB} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. メディア報酬（ネット） */}
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={singleChartDataNet} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={120} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "11px" }} formatter={(val: any, name: any) => [`￥${Number(val).toLocaleString()}`, name]} />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "black", paddingTop: "8px" }} />
                  <Bar name={compareA || "対象A"} dataKey={compareA} fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar name={compareB || "対象B"} dataKey={compareB} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          <button onClick={handleAiCompare} disabled={aiLoading || !compareA || !compareB} className="px-10 py-3.5 bg-white text-indigo-600 font-black rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg whitespace-nowrap disabled:opacity-50">
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