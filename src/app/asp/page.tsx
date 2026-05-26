"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Layers, MousePointer, Percent, ShoppingBag, TrendingUp,
  DollarSign, ArrowUpRight, Flame, Target, Coins, BarChart3,
  Clock, CheckCircle, Eye, Filter
} from "lucide-react";

const AspKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass }: any) => (
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

const ASP_METADATA: Record<string, { rate: string, lag: string, statusColor: string, desc: string }> = {
  "A8.net": { rate: "88%", lag: "平均 30 日", statusColor: "text-emerald-500 bg-emerald-500/10", desc: "国内最大手。承認処理は比較的安定推移するが、月を跨ぐ確定ラグに注意。" },
  "afb": { rate: "92%", lag: "平均 25 日", statusColor: "text-blue-500 bg-blue-500/10", desc: "美容・健康系に強み。確定から振込までの支払スピードが最も速い傾向。" },
  "AccessTrade": { rate: "85%", lag: "平均 40 日", statusColor: "text-amber-500 bg-amber-500/10", desc: "金融・Eコマースに実績。媒体審査と承認判定にやや時間を要する場合あり。" },
  "felmat": { rate: "95%", lag: "平均 20 日", statusColor: "text-teal-500 bg-teal-500/10", desc: "クローズドASP。密な担当連携により、高承認率・高速確定が最大の特徴。" },
  "もしもアフィリエイト": { rate: "90%", lag: "平均 45 日", statusColor: "text-orange-500 bg-orange-500/10", desc: "W報酬制度（12%ボーナス）が自動適用。システム仕様上、確定ラグが長め。" },
  "QUORIZa": { rate: "100%", lag: "即時 〜 15 日", statusColor: "text-purple-500 bg-purple-500/10", desc: "特定パートナー専用。個別契約に基づくクローズド運用のための超高速確定ルート。" }
};

export default function VLHAspPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAspName, setActiveAspName] = useState<string>("A8.net");

  const [filterRange, setFilterRange] = useState<string>("all"); 
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

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

  const baseFilteredData = useMemo(() => {
    const now = new Date();
    const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfToday = getStartOfDay(now);

    return performanceData.filter(row => {
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
          // 👑 修正：終了日を「その日の23時59分59秒999ミリ秒」に強制拡張！！！（最終殲滅）
          const endLimit = getStartOfDay(new Date(customRange.end)).getTime() + (24 * 60 * 60 * 1000) - 1;
          return rowTime >= startLimit && rowTime <= endLimit;
        case "all":
        default: return true;
      }
    });
  }, [performanceData, filterRange, customRange]);

  const aspAggregatedMap = useMemo(() => {
    const map: any = {};

    baseFilteredData.forEach(row => {
      const asp = row.asp || "その他";
      if (asp === "日別レポート") return;

      if (!map[asp]) {
        map[asp] = { name: asp, impressions: 0, clicks: 0, issued_count: 0, normalized_gross: 0, partnerCount: new Set() };
      }

      map[asp].impressions += (row.impressions || 0);
      map[asp].clicks += (row.clicks || 0);
      map[asp].issued_count += (row.issued_count || 0);
      map[asp].normalized_gross += (row.normalized_gross || 0); // 👑 修正
      if (row.media_name) map[asp].partnerCount.add(row.media_name);
    });

    return Object.values(map).map((a: any) => {
      const cv = a.issued_count;
      const cost = a.normalized_gross;
      const revenue = cv * 79800;

      return {
        name: a.name, impressions: a.impressions, clicks: a.clicks, issued_count: cv,
        normalized_gross: cost, revenue, partnerCount: a.partnerCount.size,
        ctr: a.impressions > 0 ? parseFloat(((a.clicks / a.impressions) * 100).toFixed(2)) : 0.0,
        cvr: a.clicks > 0 ? parseFloat(((cv / a.clicks) * 100).toFixed(2)) : 0.0,
        roas: cost > 0 ? parseFloat(((revenue / cost) * 100).toFixed(2)) : 0.0,
        cpa: cv > 0 ? Math.round(cost / cv) : 0,
        cpc: a.clicks > 0 ? parseFloat((cost / a.clicks).toFixed(2)) : 0.0,
        cpm: a.impressions > 0 ? parseFloat(((cost / a.impressions) * 1000).toFixed(2)) : 0.0
      };
    });
  }, [baseFilteredData]);

  const currentAspData = useMemo(() => {
    const found = aspAggregatedMap.find(a => a.name === activeAspName);
    if (found) return found;
    return {
      name: activeAspName, impressions: 0, clicks: 0, issued_count: 0, normalized_gross: 0,
      revenue: 0, partnerCount: 0, ctr: 0, cvr: 0, roas: 0, cpa: 0, cpc: 0, cpm: 0
    };
  }, [aspAggregatedMap, activeAspName]);

  const currentMeta = useMemo(() => {
    return ASP_METADATA[activeAspName] || { rate: "不明", lag: "要確認", statusColor: "text-slate-400 bg-slate-50", desc: "個別契約または新規ASPチャンネルです。運用の傾向値を手動監査してください。" };
  }, [activeAspName]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">ASP別承認特性パース中...</div>;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">プロバイダ詳細分析</h1>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest min-w-[80px]">
            <Filter size={14} /> 期間切替
          </div>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">ASPチャンネル選択</span>
          </div>

          <div className="space-y-2 h-auto max-h-none overflow-visible">
            {["A8.net", "afb", "AccessTrade", "felmat", "もしもアフィリエイト", "QUORIZa"].map((aspName, idx) => {
              const isSelected = activeAspName === aspName;
              const liveData = aspAggregatedMap.find(a => a.name === aspName);
              const totalCv = liveData ? liveData.issued_count : 0;

              return (
                <div key={idx} onClick={() => setActiveAspName(aspName)} className={`p-4 rounded-xl cursor-pointer transition-all flex justify-between items-center border ${isSelected ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-black" : "bg-slate-50 hover:bg-slate-100 border-slate-200/50 text-slate-700 dark:bg-slate-950/40 dark:border-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100"}`}>
                  <div>
                    <p className="text-xs md:text-sm font-black">{aspName}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 text-slate-400 dark:text-slate-500 font-bold">提携パートナー数: {liveData ? liveData.partnerCount : 0} 媒体</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${isSelected ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                    {totalCv} 件
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center transition-all">
            <div className="md:col-span-1">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 tracking-wider">承認特性パラメータ</span>
              <h2 className="text-2xl font-black mt-2 text-slate-900 dark:text-slate-50">{currentAspData.name}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">※動的解析済みデータ</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 md:pl-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500"><CheckCircle size={12}/> 平均承認率</div>
                <p className="text-xl font-black text-emerald-500 dark:text-emerald-400 mt-1">{currentMeta.rate}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500"><Clock size={12}/> 確定承認ラグ</div>
                <p className="text-xl font-black text-amber-500 dark:text-amber-400 mt-1">{currentMeta.lag}</p>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 dark:bg-indigo-950/20 dark:border-indigo-500/20 text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {currentMeta.desc}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase border-l-4 border-blue-500 pl-2">■ チャンネル基礎成果</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <AspKPICard title="インプレッション数" value={currentAspData.impressions.toLocaleString()} suffix="回" icon={Eye} colorClass="text-blue-500 bg-blue-500" />
              <AspKPICard title="クリック数" value={currentAspData.clicks.toLocaleString()} suffix="回" icon={MousePointer} colorClass="text-orange-400 bg-orange-400" />
              <AspKPICard title="クリック率" value={currentAspData.ctr.toString()} suffix="％" icon={Percent} colorClass="text-purple-500 bg-purple-500" />
              <AspKPICard title="コンバージョン数" value={currentAspData.issued_count.toLocaleString()} suffix="件" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" />
              <AspKPICard title="コンバージョン率" value={currentAspData.cvr.toString()} suffix="％" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" />
            </div>

            <div className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase border-l-4 border-emerald-500 pl-2 pt-2">■ チャンネル広告運用財務効率</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <AspKPICard title="広告費" prefix="￥" value={Math.round(currentAspData.normalized_gross).toLocaleString()} icon={DollarSign} colorClass="text-red-500 bg-red-500" />
              <AspKPICard title="発生累積売上高" prefix="￥" value={Math.round(currentAspData.revenue).toLocaleString()} icon={ArrowUpRight} colorClass="text-emerald-500 bg-emerald-500" />
              <AspKPICard title="費用対効果（ROAS）" value={currentAspData.roas.toString()} suffix="％" icon={Flame} colorClass="text-yellow-500 bg-yellow-500" />
              <AspKPICard title="CPM" prefix="￥" value={Math.round(currentAspData.cpm).toLocaleString()} icon={BarChart3} colorClass="text-indigo-400 bg-indigo-400" />
              <AspKPICard title="CPC" prefix="￥" value={Math.round(currentAspData.cpc).toLocaleString()} icon={Coins} colorClass="text-cyan-500 bg-cyan-500" />
              <AspKPICard title="CPA" prefix="￥" value={Math.round(currentAspData.cpa).toLocaleString()} icon={Target} colorClass="text-pink-500 bg-pink-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-hidden shadow-sm transition-all">
            <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-slate-50"><BarChart3 size={14} className="text-indigo-500" /> ASPチャンネル別・財務効率クロス一覧表</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase select-none">
                    <th className="pb-3 text-left">ASP名</th>
                    <th className="pb-3 text-right">提携パートナー</th>
                    <th className="pb-3 text-right">クリック数</th>
                    <th className="pb-3 text-right">コンバージョン数</th>
                    <th className="pb-3 text-right">広告費</th>
                    <th className="pb-3 text-right">ROAS</th>
                    <th className="pb-3 text-right">平均CPA</th>
                    <th className="pb-3 text-center">平均承認率</th>
                    <th className="pb-3 text-center">承認ラグ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                  {aspAggregatedMap.map((asp: any, idx: number) => {
                    const meta = ASP_METADATA[asp.name] || { rate: "不明", lag: "要確認", statusColor: "" };
                    const isCurrent = asp.name === activeAspName;
                    return (
                      <tr key={idx} className={`transition-colors ${isCurrent ? "bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20" : "hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10"}`}>
                        <td className="py-4 font-black text-slate-900 dark:text-slate-50 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{asp.name}</td>
                        <td className="py-4 text-right opacity-70 text-slate-500 dark:text-slate-400">{asp.partnerCount} 媒体</td>
                        <td className="py-4 text-right text-slate-700 dark:text-slate-300">{asp.clicks.toLocaleString()} 回</td>
                        <td className="py-4 text-right text-green-500 dark:text-green-400">{asp.issued_count} 件</td>
                        <td className="py-4 text-right text-red-500 dark:text-red-400">￥{Math.round(asp.normalized_gross).toLocaleString()}</td>
                        <td className="py-4 text-right text-yellow-600 dark:text-yellow-400 font-black">{asp.roas}％</td>
                        <td className="py-4 text-right text-pink-500 dark:text-pink-400">￥{Math.round(asp.cpa).toLocaleString()}</td>
                        <td className="py-4 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">{meta.rate}</span></td>
                        <td className="py-4 text-center text-slate-400 dark:text-slate-500 font-mono">{meta.lag}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}