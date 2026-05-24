"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Crown, ArrowUp, ArrowRight, ShieldAlert, Award, 
  Search, Filter, Percent, Flame, Target, DollarSign, MessageSquare
} from "lucide-react";

const TokutanKPICard = ({ title, value, prefix, suffix, icon: Icon, colorClass }: any) => (
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

const TOKUTAN_MASTER_TABLE = [
  { level: 1, name: "レベル1（通常）", minCV: 0,   maxCV: 10,   gross: 16500, net: 13200 },
  { level: 2, name: "レベル2",        minCV: 11,  maxCV: 20,   gross: 17600, net: 14300 },
  { level: 3, name: "レベル3",        minCV: 21,  maxCV: 30,   gross: 19250, net: 15400 },
  { level: 4, name: "レベル4",        minCV: 31,  maxCV: 50,   gross: 20900, net: 16500 },
  { level: 5, name: "レベル5",        minCV: 51,  maxCV: 100, gross: 22550, net: 17600 },
  { level: 6, name: "レベル6",        minCV: 101, maxCV: 200, gross: 24200, net: 19800 },
  { level: 7, name: "レベル7",        minCV: 201, maxCV: 300, gross: 25850, net: 22000 },
  { level: 8, name: "レベル8（上限）", minCV: 301, maxCV: 9999,gross: 29150, net: 24200 },
];

const getLevelBadgeClass = (level: number, isSpecial: boolean) => {
  if (isSpecial) return "bg-purple-600 text-white font-black shadow-sm shadow-purple-500/10";
  switch (level) {
    case 1: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/40";
    case 2: return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case 3: return "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300";
    case 4: return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case 5: return "bg-yellow-50 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400";
    case 6: return "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    case 7: return "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400";
    case 8: return "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10";
    default: return "bg-slate-100 text-slate-700";
  }
};

export default function VLHTokutanPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchWord, setSearchWord] = useState<string>("");
  const [selectedAsp, setSelectedAsp] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
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
        console.error("特単自動判定システムの同期に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  const partnersWithEvaluations = useMemo(() => {
    const map: any = {};
    
    // 💡 核心：実行時の「当月（現在の年・月）」の境界線を冷徹に定義
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth(); // 0-11

    performanceData.forEach(row => {
      const rawName = row.media_name || "不明なパートナー";
      const rawId = row.media_id || "N/A";
      const asp = row.asp || "不明";
      if (!rawName || rawName === "日別レポート") return;

      let finalName = rawName;
      const match = dictData.master_partners?.find((entry: any) => 
        entry.aliases?.includes(rawName) || entry.aliases?.includes(rawId)
      );
      if (match) {
        finalName = match.real_name;
      }

      if (!map[finalName]) {
        map[finalName] = { name: finalName, cv: 0, rawReward: 0, ids: new Set<string>(), aspUnitCosts: [], asps: {} };
      }

      map[finalName].ids.add(rawId);
      map[finalName].asps[asp] = true;

      const count = row.issued_count || 0;
      const reward = row.issued_reward || 0;

      // 💡 規律1：単価（レベル）の判定用履歴は、過去の動きを見失わないよう「全期間」から正しく抽出
      if (count > 0) {
        const unitCost = reward / count; 
        map[finalName].aspUnitCosts.push({ asp, unitCost });
      }

      // 💡 規律2：【大修正】財務マトリクスとアドバイスに使う成果数は「当月」のみに厳格完全制限！！！
      if (row.date) {
        const dateStr = String(row.date);
        const d = (dateStr.length === 8 && /^\d+$/.test(dateStr)) 
          ? new Date(parseInt(dateStr.slice(0, 4)), parseInt(dateStr.slice(4, 6)) - 1, parseInt(dateStr.slice(6, 8)))
          : new Date(dateStr);
        
        if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
          map[finalName].cv += count;
          map[finalName].rawReward += reward;
        }
      }
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv; // ➔ ここが「当月成果数」に純化！
      const totalRevenue = cv * 79800; // ➔ 当月のケノン総売上

      let detectedLevel = 1; 
      let isSpecial = false;

      if (p.aspUnitCosts.length > 0) {
        const target = p.aspUnitCosts[p.aspUnitCosts.length - 1];
        const cost = target.unitCost;
        let targetGrossOrNet = 0;

        if (target.asp === "QUORIZa") {
          isSpecial = true;
        } else if (target.asp === "A8.net") {
          targetGrossOrNet = cost * 1.1;
        } else if (target.asp === "もしもアフィリエイト") {
          targetGrossOrNet = cost * 1.3 * 1.1;
        } else {
          targetGrossOrNet = cost * 1.1;
        }

        if (!isSpecial) {
          const found = TOKUTAN_MASTER_TABLE.find(t => {
            if (target.asp === "A8.net") {
              return Math.abs(t.net - targetGrossOrNet) <= 50;
            } else {
              return Math.abs(t.gross - targetGrossOrNet) <= 50;
            }
          });

          if (found) {
            detectedLevel = found.level;
          } else {
            isSpecial = true; 
          }
        }
      }

      const currentTier = isSpecial 
        ? { level: 99, name: "特殊（個別契約）", gross: 0, net: 0, minCV: 0, maxCV: 0 }
        : TOKUTAN_MASTER_TABLE.find(t => t.level === detectedLevel) || TOKUTAN_MASTER_TABLE[0];

      let partnerProfit = 0;
      let aspProfit = 0;
      let 自社残し = 0;

      if (isSpecial) {
        partnerProfit = p.rawReward * 0.8; 
        aspProfit = p.rawReward * 0.2;
        自社残し = totalRevenue - p.rawReward;
      } else {
        partnerProfit = cv * currentTier.net;
        aspProfit = cv * (currentTier.gross - currentTier.net);
        自社残し = totalRevenue - (cv * currentTier.gross);
      }

      // 💡 改善：当月成果（cv）に基づいた、現場の即戦力となる真実のアドバイスを動的生成
      let adviceMessage = "現在のレベルで安定推移しています。もうしばらくこの設定でがんばらせよう。";
      if (isSpecial) {
        adviceMessage = "個別契約（特殊単価）が適用されています。担当営業の個別交渉ログを確認してください。";
      } else if (cv > currentTier.maxCV || (cv >= currentTier.minCV && cv > 50)) {
        adviceMessage = "当月は成果（件数）が急増、または高い影響力を維持しています。そろそろ上のレベルへの特別単価付与を検討してもいいんじゃないか？";
      } else if (cv === 0) {
        adviceMessage = "当月の成果はまだありません。今後の動きを注視しましょう。";
      }

      return { ...p, idList: Array.from(p.ids).join(", "), currentTier, isSpecial, totalRevenue, partnerProfit, aspProfit, 自社残し, adviceMessage };
    }).sort((a: any, b: any) => b.cv - a.cv);
  }, [performanceData, dictData]);

  const filteredPartners = useMemo(() => {
    return partnersWithEvaluations.filter(p => {
      const matchesWord = p.name.toLowerCase().includes(searchWord.toLowerCase()) || p.idList.toLowerCase().includes(searchWord.toLowerCase());
      const matchesAsp = selectedAsp === "all" || Object.keys(p.asps || {}).includes(selectedAsp);
      
      let matchesLevel = true;
      if (selectedLevel !== "all") {
        if (selectedLevel === "special") {
          matchesLevel = p.isSpecial;
        } else {
          matchesLevel = !p.isSpecial && p.currentTier.level === parseInt(selectedLevel);
        }
      }
      return matchesWord && matchesAsp && matchesLevel;
    });
  }, [partnersWithEvaluations, searchWord, selectedAsp, selectedLevel]);

  const currentPartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    const found = filteredPartners.find(p => p.name === selectedPartnerName);
    return found || filteredPartners[0];
  }, [filteredPartners, selectedPartnerName]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest dark:text-indigo-400">特別単価判定マトリクス起動中...</div>;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">特別単価管理・分析</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">パートナー選抜</span>
          </div>

          <div className="space-y-2 mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <select 
                value={selectedAsp} 
                onChange={(e) => setSelectedAsp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-black border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="all">すべてのASP</option>
                <option value="A8.net">A8.net</option>
                <option value="afb">afb</option>
                <option value="AccessTrade">AccessTrade</option>
                <option value="felmat">felmat</option>
                <option value="もしもアフィリエイト">もしもアフィリエイト</option>
                <option value="QUORIZa">QUORIZa</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Crown size={12} className="text-indigo-500 flex-shrink-0" />
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-black border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="all">すべての設定レベル</option>
                {TOKUTAN_MASTER_TABLE.map(t => (
                  <option key={t.level} value={t.level.toString()}>レベル {t.level}</option>
                ))}
                <option value="special">特殊（個別契約）</option>
              </select>
            </div>
          </div>
          
          <input 
            type="text"
            placeholder="メディア名・IDで抽出..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-xs w-full border focus:outline-none focus:border-indigo-500 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-600 " />

          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 h-80 xl:h-[480px] overflow-y-auto space-y-1.5 pr-1">
            {filteredPartners.map((partner, idx) => {
              const isSelected = currentPartner && currentPartner.name === partner.name;
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedPartnerName(partner.name)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
                    isSelected 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-black" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/50 text-slate-700 dark:bg-slate-950/40 dark:border-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs md:text-sm truncate font-black flex-1">{partner.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black flex-shrink-0 transition-all ${getLevelBadgeClass(partner.currentTier.level, partner.isSpecial)}`}>
                      {partner.isSpecial ? "特殊" : `Lv.${partner.currentTier.level}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold opacity-80">
                    <span className="truncate text-slate-400 dark:text-slate-500">当月成果: {partner.cv} 件</span>
                    <span className={isSelected ? "text-white/90" : "text-indigo-600 dark:text-indigo-400 ml-2 flex-shrink-0"}><span className="text-[9px] text-slate-400 mr-0.5">￥</span>{Math.round(partner.totalRevenue).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredPartners.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-bold">該当パートナー不在</div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          {currentPartner ? (
            <>
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center transition-all">
                <div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 tracking-wider">リアルタイム単価判定</span>
                  <h2 className="text-xl font-black mt-2 text-slate-900 dark:text-slate-50">{currentPartner.name}</h2>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md transition-all ${getLevelBadgeClass(currentPartner.currentTier.level, currentPartner.isSpecial)}`}>
                      {currentPartner.isSpecial ? "特殊" : `Lv.${currentPartner.currentTier.level}`}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">自動判定された現在のステータス</p>
                      <p className="text-base font-black text-slate-900 dark:text-slate-100">{currentPartner.currentTier.name}</p>
                      {!currentPartner.isSpecial && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 font-bold">
                          (目安グロス: ￥{currentPartner.currentTier.gross.toLocaleString()} / ネット: ￥{currentPartner.currentTier.net.toLocaleString()})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center h-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                      <MessageSquare size={14} /> 運用担当者への示唆・アドバイス
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-black leading-relaxed text-slate-800 dark:text-slate-200">
                        「 {currentPartner.adviceMessage} 」
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase border-l-4 border-indigo-500 pl-2">■ 当月成果と財務内訳（税込）</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <TokutanKPICard title="当月合算成果数" value={currentPartner.cv.toLocaleString()} suffix="件" icon={Crown} colorClass="text-indigo-500 bg-indigo-500" />
                  <TokutanKPICard title="アフィリエイターの総儲け" prefix="￥" value={Math.round(currentPartner.partnerProfit).toLocaleString()} icon={Target} colorClass="text-green-500 bg-green-500" />
                  <TokutanKPICard title="ASPの総儲け（マージン）" prefix="￥" value={Math.round(currentPartner.aspProfit).toLocaleString()} icon={Percent} colorClass="text-orange-400 bg-orange-400" />
                  <TokutanKPICard title="自社の売上残高（手残り）" prefix="￥" value={Math.round(currentPartner.自社残し).toLocaleString()} icon={DollarSign} colorClass="text-emerald-500 bg-emerald-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-hidden shadow-sm transition-all">
                <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  <Filter size={14} className="text-indigo-500" /> ケノン特別単価・ガバナンス基準表（グロス・ネット完全版）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase select-none">
                        <th className="pb-3 text-center">レベル設定</th>
                        <th className="pb-3 text-left">レベル名称</th>
                        <th className="pb-3 text-center">月間成果目安範囲</th>
                        <th className="pb-3 text-right">グロス単価（自社コスト）</th>
                        <th className="pb-3 text-right">ネット単価（メディア報酬）</th>
                        <th className="pb-3 text-right">ASP仲介マージン</th>
                        <th className="pb-3 text-center">現在の判定位置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                      {TOKUTAN_MASTER_TABLE.map((tier) => {
                        const isMatch = !currentPartner.isSpecial && currentPartner.currentTier.level === tier.level;
                        return (
                          <tr key={tier.level} className={`transition-colors ${isMatch ? "bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20" : "hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10"}`}>
                            <td className="py-4 text-center">
                              <span className={`px-2 py-0.5 rounded font-black transition-all ${getLevelBadgeClass(tier.level, false)}`}>
                                Lv.{tier.level}
                              </span>
                            </td>
                            <td className={`py-4 text-left ${isMatch ? "text-amber-600 dark:text-amber-400 font-black" : "text-slate-900 dark:text-slate-50"}`}>{tier.name}</td>
                            <td className="py-4 text-center opacity-70 text-slate-500 dark:text-slate-400">{tier.minCV} 〜 {tier.maxCV === 9999 ? "無制限" : `${tier.maxCV} 件`}</td>
                            <td className="py-4 text-right text-red-500 dark:text-red-400">￥{tier.gross.toLocaleString()}</td>
                            <td className="py-4 text-right text-green-500 dark:text-green-400">￥{tier.net.toLocaleString()}</td>
                            <td className="py-4 text-right text-orange-500 dark:text-orange-400">￥{(tier.gross - tier.net).toLocaleString()}</td>
                            <td className="py-4 text-center">
                              {isMatch ? (
                                <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-emerald-400 font-black animate-pulse">
                                  <ArrowRight size={12}/> 適合中
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
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <ShieldAlert size={24} className="text-slate-300 dark:text-slate-600"/>
              指定のクロスフィルターに合致するパートナー情報が存在しません。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}