"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Crown, ArrowUp, ArrowRight, ShieldAlert, Award, 
  Search, Filter, Percent, Flame, Target, DollarSign
} from "lucide-react";

// --- サブコンポーネント: モバイル見切れ防止・特単専用KPIカード ---
const TokutanKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass, isLight }: any) => (
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

// 💡 規律：ヒロム様より配備された「本物のケノン専用グロス／ネット価格テーブル」
const TOKUTAN_TIERS = [
  { level: 1, name: "通常（レベル1）", minCV: 0,   maxCV: 10,  gross: 16500, net: 13200 },
  { level: 2, name: "レベル2",        minCV: 11,  maxCV: 20,  gross: 17600, net: 14300 },
  { level: 3, name: "レベル3",        minCV: 21,  maxCV: 30,  gross: 19250, net: 15400 },
  { level: 4, name: "レベル4",        minCV: 31,  maxCV: 50,  gross: 20900, net: 16500 },
  { level: 5, name: "レベル5",        minCV: 51,  maxCV: 100, gross: 22550, net: 17600 },
  { level: 6, name: "レベル6",        minCV: 101, maxCV: 200, gross: 24200, net: 19800 },
  { level: 7, name: "レベル7",        minCV: 201, maxCV: 300, gross: 25850, net: 22000 },
  { level: 8, name: "最高レベル8",    minCV: 301, maxCV: 9999,gross: 29150, net: 24200 },
];

export default function VLHTokutanPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchWord, setSearchWord] = useState<string>("",);
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const perfRes = await fetch("/api/performance", { cache: "no-store" });
        const perfData = perfRes.ok ? await perfRes.json() : [];
        
        const dictRes = await fetch("/api/dictionary", { cache: "no-store" });
        const dictionary = dictRes.ok ? await dictRes.json() : { master_partners: [] };

        setPerformanceData(perfData);
        setDictData(dictionary);
      } catch (err: any) {
        console.error("特単判定エンジンの初期化に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // 🔍 核心ロジック：当月合算CV数に基づき、本物のグロス＆ネット内訳を動的シミュレーション
  const partnersWithTiers = useMemo(() => {
    const map: any = {};

    performanceData.forEach(row => {
      const rawName = row.media_name || "不明なパートナー";
      const rawId = row.media_id || "N/A";
      if (!rawName || rawName === "日別レポート") return;

      let finalName = rawName;
      const match = dictData.master_partners?.find((entry: any) => 
        entry.aliases?.includes(rawName) || entry.aliases?.includes(rawId)
      );
      if (match) {
        finalName = match.real_name;
      }

      if (!map[finalName]) {
        map[finalName] = { name: finalName, cv: 0, ids: new Set<string>() };
      }
      map[finalName].cv += (row.issued_count || 0);
      map[finalName].ids.add(rawId);
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv;
      const totalRevenue = cv * 79800; // 国内実績130万台ケノン価格（税込￥79,800）

      // 8段階本物マトリクスを走査し、現在の適正ティアを自動判定
      let currentTier = TOKUTAN_TIERS[0];
      let nextTier = null;

      for (let i = 0; i < TOKUTAN_TIERS.length; i++) {
        if (cv >= TOKUTAN_TIERS[i].minCV && cv <= TOKUTAN_TIERS[i].maxCV) {
          currentTier = TOKUTAN_TIERS[i];
          nextTier = TOKUTAN_TIERS[i + 1] || null;
          break;
        }
      }

      const nextThreshold = nextTier ? nextTier.minCV - cv : 0;

      // 💡 財務パラメータの冷徹な算出
      const partnerProfit = cv * currentTier.net;                    // アフィリエイターの総儲け（ネット合計）
      const aspProfit = cv * (currentTier.gross - currentTier.net);   // ASPの総儲け（マージン合計）
      const自社残し = totalRevenue - (cv * currentTier.gross);        // 自社の売上残高（本体価格 - グロス支払）

      return {
        ...p,
        idList: Array.from(p.ids).join(", "),
        currentTier,
        nextTier,
        nextThreshold,
        totalRevenue,
        partnerProfit,
        aspProfit,
        自社残し,
      };
    }).sort((a: any, b: any) => b.cv - a.cv);
  }, [performanceData, dictData]);

  const filteredPartners = useMemo(() => {
    return partnersWithTiers.filter(p => 
      p.name.toLowerCase().includes(searchWord.toLowerCase()) ||
      p.idList.toLowerCase().includes(searchWord.toLowerCase())
    );
  }, [partnersWithTiers, searchWord]);

  const currentPartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    const found = filteredPartners.find(p => p.name === selectedPartnerName);
    return found || filteredPartners[0];
  }, [filteredPartners, selectedPartnerName]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest">特単判定マトリクス起動中...</div>;

  return (
    <div className="w-full">
      {/* 👑 ヘッダー（PC専用隔離、横ハス完全パージ） */}
      <header className="hidden md:flex px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <h1 className="text-xl font-black tracking-tight">特単ティア管理</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 左翼：パートナー選抜小窓リスト */}
        <div className={`p-5 rounded-2xl border shadow-md h-fit ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">パートナー選抜</span>
          </div>

          <input 
            type="text"
            placeholder="メディア名・IDで抽出..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-xs w-full border bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 dark:bg-[#0f172a] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 font-bold mb-4"
          />

          <div className="border-t border-slate-200 dark:border-slate-700/30 pt-3 h-80 xl:h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {filteredPartners.map((partner, idx) => {
              const isSelected = currentPartner && currentPartner.name === partner.name;
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedPartnerName(partner.name)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border border-transparent ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black" : "bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-[#0f172a]/40 dark:text-slate-300 dark:hover:bg-[#0f172a]/90"}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs md:text-sm truncate font-black flex-1">{partner.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black flex-shrink-0 ${partner.currentTier.level >= 5 ? "bg-amber-500 text-slate-950" : "bg-indigo-500/10 text-indigo-500"}`}>
                      Lv.{partner.currentTier.level}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] opacity-60 font-bold">
                    <span className="truncate">当月: {partner.cv} 件</span>
                    <span className="text-indigo-400 dark:text-emerald-400 ml-2">￥{Math.round(partner.totalRevenue).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredPartners.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">該当パートナー不在</div>
            )}
          </div>
        </div>

        {/* 右翼：8段階特単監査コックピット */}
        <div className="xl:col-span-3 space-y-6">
          {currentPartner ? (
            <>
              {/* ティア自動判定ウォール */}
              <div className={`p-6 rounded-2xl border shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-slate-800"}`}>
                <div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 tracking-wider">自動判定システム</span>
                  <h2 className="text-xl font-black mt-2">{currentPartner.name}</h2>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/10">
                      {currentPartner.currentTier.level}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold">現在の特単ティア</p>
                      <p className="text-base font-black text-amber-500">{currentPartner.currentTier.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        (グロス: ￥{currentPartner.currentTier.gross.toLocaleString()} / ネット: ￥{currentPartner.currentTier.net.toLocaleString()})
                      </p>
                    </div>
                  </div>
                </div>

                {/* レベルアップの残弾数判定 */}
                <div className="border-t md:border-t-0 md:border-l border-slate-700/20 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center h-full">
                  {currentPartner.nextTier ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-500 dark:text-emerald-400 uppercase tracking-wider">
                        <ArrowUp size={14} className="animate-bounce" /> 次のティアへの昇格条件
                      </div>
                      <p className="text-base font-black">
                        次階層 【{currentPartner.nextTier.name}】 まで
                      </p>
                      <div className="text-3xl font-black text-slate-900 dark:text-white leading-none mt-2">
                        あと <span className="text-indigo-600 dark:text-emerald-400 font-mono text-4xl">{currentPartner.nextThreshold}</span> 件
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">（次レベル目標: 月間 {currentPartner.nextTier.minCV} 件以上の成果）</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-amber-500 font-black">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider"><Award size={16}/> 最高ランク</div>
                      <p className="text-lg">最高峰ティアに到達済み</p>
                      <p className="text-xs text-slate-400 font-bold">アローエイト最高栄誉のパートナー資産です。</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 💡 改善：グロスとネットの本物データに基づき、アフィリエイターとASP双方の儲けを完全分離露出！！！ */}
              <div className="space-y-2">
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase border-l-4 border-indigo-500 pl-2">■ 当月成果・三位一体の財務内訳監査</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <TokutanKPICard title="当月合算成果数" value={currentPartner.cv.toLocaleString()} suffix="件" icon={Crown} colorClass="text-indigo-500 bg-indigo-500" isLight={isLight} />
                  <TokutanKPICard title="アフィリエイターの総儲け" prefix="￥" value={Math.round(currentPartner.partnerProfit).toLocaleString()} icon={Target} colorClass="text-green-500 bg-green-500" isLight={isLight} />
                  <TokutanKPICard title="ASPの総儲け（マージン）" prefix="￥" value={Math.round(currentPartner.aspProfit).toLocaleString()} icon={Percent} colorClass="text-orange-400 bg-orange-400" isLight={isLight} />
                  <TokutanKPICard title="自社の売上残高（手残り）" prefix="￥" value={Math.round(currentPartner.自社残し).toLocaleString()} icon={DollarSign} colorClass="text-emerald-500 bg-emerald-500" isLight={isLight} />
                </div>
              </div>

              {/* 8段階ティア全体の早見監査マトリクス */}
              <div className={`border rounded-2xl p-6 overflow-hidden shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#1e293b] border-slate-800 text-slate-300"}`}>
                <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800 dark:text-white">
                  <Filter size={14} className="text-indigo-500" /> ケノン特単ティア・ガバナンス基準表（グロス・ネット完全版）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 font-black uppercase select-none">
                        <th className="pb-3 text-center">階層レベル</th>
                        <th className="pb-3 text-left">ティア名称</th>
                        <th className="pb-3 text-center">月間成果ノルマ範囲</th>
                        <th className="pb-3 text-right">グロス単価（自社コスト）</th>
                        <th className="pb-3 text-right">ネット単価（メディア報酬）</th>
                        <th className="pb-3 text-right">ASP仲介マージン</th>
                        <th className="pb-3 text-center">現在の位置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800/60 dark:text-slate-200 font-bold">
                      {TOKUTAN_TIERS.map((tier) => {
                        const isMatch = currentPartner.currentTier.level === tier.level;
                        return (
                          <tr key={tier.level} className={`transition-colors ${isMatch ? "bg-amber-500/10 hover:bg-amber-500/20" : "hover:bg-indigo-500/5"}`}>
                            <td className="py-4 text-center">
                              <span className={`px-2 py-0.5 rounded font-black ${isMatch ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}>
                                Lv.{tier.level}
                              </span>
                            </td>
                            <td className={`py-4 text-left ${isMatch ? "text-amber-500 font-black" : ""}`}>{tier.name}</td>
                            <td className="py-4 text-center opacity-80">{tier.minCV} 〜 {tier.maxCV === 9999 ? "無制限" : `${tier.maxCV} 件`}</td>
                            <td className="py-4 text-right text-red-500">￥{tier.gross.toLocaleString()}</td>
                            <td className="py-4 text-right text-green-500">￥{tier.net.toLocaleString()}</td>
                            <td className="py-4 text-right text-orange-400">￥{(tier.gross - tier.net).toLocaleString()}</td>
                            <td className="py-4 text-center">
                              {isMatch ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-black animate-pulse">
                                  <ArrowRight size={12}/> 判定中
                                </span>
                              ) : "-"}
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
            <div className="text-center py-20 text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-3xl">
              <ShieldAlert size={24} className="text-slate-600"/>
              パートナーデータが存在しないため、ティア自動監査を停止しています。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}