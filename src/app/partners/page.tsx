"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Users, Eye, MousePointer, Percent, ShoppingBag, TrendingUp,
  DollarSign, ArrowUpRight, Flame, Target, Coins, BarChart3,
  Search, ShieldAlert, Layers
} from "lucide-react";

// --- サブコンポーネント: レスポンシブKPIカード ---
const PartnerKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass, isLight }: any) => (
  <div className={`
    ${isLight ? "bg-white border-slate-200 shadow-md text-slate-800" : "bg-[#1e293b] border-slate-800 shadow-xl text-slate-100"} 
    p-5 rounded-2xl flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden border min-h-[135px]
  `}>
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm font-black tracking-wider block">{title}</span>
      <div className={`p-2.5 rounded-xl bg-opacity-10 ${colorClass} flex-shrink-0`}><Icon size={16} /></div>
    </div>
    <div className="mt-4 flex items-end flex-wrap gap-0.5 leading-none">
      {prefix && <span className="text-xs md:text-sm font-black mr-0.5 mb-0.5 opacity-70">{prefix}</span>}
      <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">{value}</span>
      {suffix && <span className="text-xs md:text-sm font-black ml-0.5 mb-0.5 opacity-70">{suffix}</span>}
    </div>
  </div>
);

export default function VLHPartnersPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  // 💡 改善：手動紐付け辞書をストックする新ステート
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchWord, setSearchWord] = useState<string>("",);
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");

  // 📡 RAWデータ ＆ 手動紐付け辞書のダブル・サルベージ
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        // 1. パフォーマンス成果データの抽出
        const perfRes = await fetch("/api/performance", { cache: "no-store" });
        const perfData = perfRes.ok ? await perfRes.json() : [];
        
        // 2. 秘密倉庫（辞書）からの手動紐付けルールの抽出
        const dictRes = await fetch("/api/dictionary", { cache: "no-store" });
        const dictionary = dictRes.ok ? await dictRes.json() : { master_partners: [] };

        setPerformanceData(perfData);
        setDictData(dictionary);
      } catch (err: any) {
        console.error("データの結合タイムラインに障害が発生しました。");
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // 🔍 核心：手動紐付け辞書（MIMIRの意思）を噛ませた超名寄せ演算マトリクス
  const partnersAggregated = useMemo(() => {
    const map: any = {};

    performanceData.forEach(row => {
      const rawName = row.media_name || "不明なパートナー";
      const rawId = row.media_id || "N/A";
      if (!rawName || rawName === "日別レポート") return; 

      // 💡 改善：手動紐付け辞書に登録があるか、名前とIDで徹底検閲
      let finalName = rawName;
      const match = dictData.master_partners?.find((entry: any) => 
        entry.aliases?.includes(rawName) || entry.aliases?.includes(rawId)
      );
      
      // もし福本様の手動紐付けルールに合致したら、その指定グループ名（real_name）へ強制的に名寄せ収束！
      if (match) {
        finalName = match.real_name;
      }

      if (!map[finalName]) {
        map[finalName] = {
          name: finalName,
          ids: new Set<string>(),
          impressions: 0,
          clicks: 0,
          issued_count: 0,
          issued_reward: 0,
          asps: {}
        };
      }

      map[finalName].ids.add(rawId);
      map[finalName].impressions += (row.impressions || 0);
      map[finalName].clicks += (row.clicks || 0);
      map[finalName].issued_count += (row.issued_count || 0);
      map[finalName].issued_reward += (row.issued_reward || 0);

      const asp = row.asp;
      if (!map[finalName].asps[asp]) {
        map[finalName].asps[asp] = { impressions: 0, clicks: 0, issued_count: 0, issued_reward: 0 };
      }
      map[finalName].asps[asp].impressions += (row.impressions || 0);
      map[finalName].asps[asp].clicks += (row.clicks || 0);
      map[finalName].asps[asp].issued_count += (row.issued_count || 0);
      map[finalName].asps[asp].issued_reward += (row.issued_reward || 0);
    });

    return Object.values(map).map((p: any) => {
      const rev = p.issued_count * 79800; 
      const cost = p.issued_reward;
      return {
        ...p,
        idList: Array.from(p.ids).join(", "),
        revenue: rev,
        ctr: p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0.0,
        cvr: p.clicks > 0 ? parseFloat(((p.issued_count / p.clicks) * 100).toFixed(2)) : 0.0,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: p.issued_count > 0 ? Math.round(cost / p.issued_count) : 0,
        cpc: p.clicks > 0 ? parseFloat((cost / p.clicks).toFixed(2)) : 0.0,
        cpm: p.impressions > 0 ? parseFloat(((cost / p.impressions) * 1000).toFixed(2)) : 0.0
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [performanceData, dictData]);

  const searchedPartners = useMemo(() => {
    return partnersAggregated.filter(p => 
      p.name.toLowerCase().includes(searchWord.toLowerCase()) || 
      p.idList.toLowerCase().includes(searchWord.toLowerCase())
    );
  }, [partnersAggregated, searchWord]);

  const currentPartner = useMemo(() => {
    if (searchedPartners.length === 0) return null;
    const found = searchedPartners.find(p => p.name === selectedPartnerName);
    return found || searchedPartners[0];
  }, [searchedPartners, selectedPartnerName]);

  const currentPartnerAsps = useMemo(() => {
    if (!currentPartner) return [];
    return Object.keys(currentPartner.asps).map(aspName => {
      const src = currentPartner.asps[aspName];
      const rev = src.issued_count * 79800;
      const cost = src.issued_reward;
      return {
        name: aspName,
        impressions: src.impressions,
        clicks: src.clicks,
        ctr: src.impressions > 0 ? parseFloat(((src.clicks / src.impressions) * 100).toFixed(2)) : 0.0,
        issued_count: src.issued_count,
        cvr: src.clicks > 0 ? parseFloat(((src.issued_count / src.clicks) * 100).toFixed(2)) : 0.0,
        reward: cost,
        revenue: rev,
        roas: cost > 0 ? parseFloat(((rev / cost) * 100).toFixed(2)) : 0.0,
        cpa: src.issued_count > 0 ? Math.round(cost / src.issued_count) : 0,
        cpc: src.clicks > 0 ? parseFloat((cost / src.clicks).toFixed(2)) : 0.0,
        cpm: src.impressions > 0 ? parseFloat(((cost / src.impressions) * 1000).toFixed(2)) : 0.0
      };
    });
  }, [currentPartner]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest">手動紐付けデータ同期中...</div>;

  return (
    <div className="w-full">
      <header className={`px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white shadow-xl"}`}>
        <h1 className="text-xl font-black tracking-tight">パートナー別詳細</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 左翼：検索リスト */}
        <div className={`p-5 rounded-2xl border shadow-md h-fit ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">パートナー検索</span>
          </div>
          
          <input 
            type="text"
            placeholder="メディア名・IDを入力..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm w-full border bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 dark:bg-[#0f172a] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 font-bold mb-4"
          />

          <div className="border-t border-slate-700/10 pt-3 max-h-[550px] overflow-y-auto space-y-1.5 pr-1">
            {searchedPartners.map((partner, idx) => {
              const isSelected = currentPartner && currentPartner.name === partner.name;
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedPartnerName(partner.name)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border border-transparent ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black" : "bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-[#0f172a]/40 dark:text-slate-300 dark:hover:bg-[#0f172a]/90"}`}
                >
                  <p className="text-xs md:text-sm truncate font-black">{partner.name}</p>
                  <div className="flex justify-between items-center text-[10px] opacity-60 font-bold">
                    <span className="truncate">ID: {partner.idList}</span>
                    <span className="text-indigo-400 dark:text-emerald-400 ml-2 flex-shrink-0">￥{Math.round(partner.revenue).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右翼：11大指標 */}
        <div className="xl:col-span-3 space-y-6">
          {currentPartner ? (
            <>
              <div className={`p-6 rounded-2xl border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-slate-800"}`}>
                <div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-widest">ACTIVE PARTNER</span>
                  <h2 className="text-xl font-black tracking-tight mt-2">{currentPartner.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1 font-bold">紐付け登録ID群: {currentPartner.idList}</p>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-700/20 pt-3 sm:pt-0 sm:pl-6 flex-shrink-0">
                  <span className="text-xs font-black text-slate-400 block">総売上</span>
                  <span className="text-3xl font-black text-emerald-500 block mt-1">￥{Math.round(currentPartner.revenue).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase border-l-4 border-blue-500 pl-2">■ パートナー単体・基礎成果</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <PartnerKPICard title="インプレッション数" value={currentPartner.impressions.toLocaleString()} suffix="回" icon={Eye} colorClass="text-blue-500 bg-blue-500" isLight={isLight} />
                  <PartnerKPICard title="クリック数" value={currentPartner.clicks.toLocaleString()} suffix="回" icon={MousePointer} colorClass="text-orange-400 bg-orange-400" isLight={isLight} />
                  <PartnerKPICard title="クリック率" value={currentPartner.ctr.toString()} suffix="％" icon={Percent} colorClass="text-purple-500 bg-purple-500" isLight={isLight} />
                  <PartnerKPICard title="コンバージョン数" value={currentPartner.issued_count.toLocaleString()} suffix="件" icon={ShoppingBag} colorClass="text-green-500 bg-green-500" isLight={isLight} />
                  <PartnerKPICard title="コンバージョン率" value={currentPartner.cvr.toString()} suffix="％" icon={TrendingUp} colorClass="text-teal-500 bg-teal-500" isLight={isLight} />
                </div>

                <div className="text-xs font-black tracking-widest text-slate-400 uppercase border-l-4 border-emerald-500 pl-2 pt-2">■ パートナー単体・広告運用財務効率</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <PartnerKPICard title="報酬額" prefix="￥" value={Math.round(currentPartner.issued_reward).toLocaleString()} icon={DollarSign} colorClass="text-red-500 bg-red-500" isLight={isLight} />
                  <PartnerKPICard title="売上" prefix="￥" value={Math.round(currentPartner.revenue).toLocaleString()} icon={ArrowUpRight} colorClass="text-emerald-500 bg-emerald-500" isLight={isLight} />
                  <PartnerKPICard title="ROAS" value={currentPartner.roas.toString()} suffix="％" icon={Flame} colorClass="text-yellow-500 bg-yellow-500" isLight={isLight} />
                  <PartnerKPICard title="CPM" prefix="￥" value={Math.round(currentPartner.cpm).toLocaleString()} icon={BarChart3} colorClass="text-indigo-400 bg-indigo-400" isLight={isLight} />
                  <PartnerKPICard title="CPC" prefix="￥" value={Math.round(currentPartner.cpc).toLocaleString()} icon={Coins} colorClass="text-cyan-500 bg-cyan-500" isLight={isLight} />
                  <PartnerKPICard title="CPA" prefix="￥" value={Math.round(currentPartner.cpa).toLocaleString()} icon={Target} colorClass="text-pink-500 bg-pink-500" isLight={isLight} />
                </div>
              </div>

              {/* ASP内訳テーブル */}
              <div className={`border rounded-2xl p-6 overflow-hidden shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#1e293b] border-slate-800 text-slate-300"}`}>
                <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800 dark:text-white">
                  <Layers size={14} className="text-indigo-500" /> 出撃ASPチャンネル別・内訳レポート
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 font-black uppercase select-none">
                        <th className="pb-3 text-left">ASP名</th>
                        <th className="pb-3 text-right">インプレッション数</th>
                        <th className="pb-3 text-right">クリック数</th>
                        <th className="pb-3 text-right">クリック率</th>
                        <th className="pb-3 text-right">コンバージョン数</th>
                        <th className="pb-3 text-right">コンバージョン率</th>
                        <th className="pb-3 text-right">報酬額</th>
                        <th className="pb-3 text-right">売上</th>
                        <th className="pb-3 text-right">ROAS</th>
                        <th className="pb-3 text-right">CPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800/60 dark:text-slate-200 font-bold">
                      {currentPartnerAsps.map((asp: any, idx: number) => (
                        <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="py-4 font-black text-slate-900 dark:text-white flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{asp.name}</td>
                          <td className="py-4 text-right opacity-80">{asp.impressions.toLocaleString()}回</td>
                          <td className="py-4 text-right">{asp.clicks.toLocaleString()}回</td>
                          <td className="py-4 text-right text-purple-500">{asp.ctr}％</td>
                          <td className="py-4 text-right text-green-500">{asp.issued_count}件</td>
                          <td className="py-4 text-right text-teal-500">{asp.cvr}％</td>
                          <td className="py-4 text-right text-red-500">￥{Math.round(asp.reward).toLocaleString()}</td>
                          <td className="py-4 text-right text-emerald-500">￥{Math.round(asp.revenue).toLocaleString()}</td>
                          <td className="py-4 text-right text-yellow-500 font-black">{asp.roas}％</td>
                          <td className="py-4 text-right text-pink-500">￥{Math.round(asp.cpa).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-3xl">
              <ShieldAlert size={24} className="text-slate-600"/>
              検索条件に合致するパートナー情報が存在しません。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}