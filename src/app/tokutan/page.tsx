"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { ThemeContext } from "../layout";
import { 
  Crown, ArrowUp, ArrowRight, ShieldAlert, Award, 
  Search, Filter, Percent, Flame, Target, DollarSign, MessageSquare
} from "lucide-react";

// --- サブコンポーネント: 特別単価専用KPIカード ---
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

// 💡 規律：ヒロム様より配備された「税込グロス／ネット特別単価テーブル」
const TOKUTAN_MASTER_TABLE = [
  { level: 1, name: "レベル1（通常）", minCV: 0,   maxCV: 10,  gross: 16500, net: 13200 },
  { level: 2, name: "レベル2",        minCV: 11,  maxCV: 20,  gross: 17600, net: 14300 },
  { level: 3, name: "レベル3",        minCV: 21,  maxCV: 30,  gross: 19250, net: 15400 },
  { level: 4, name: "レベル4",        minCV: 31,  maxCV: 50,  gross: 20900, net: 16500 },
  { level: 5, name: "レベル5",        minCV: 51,  maxCV: 100, gross: 22550, net: 17600 },
  { level: 6, name: "レベル6",        minCV: 101, maxCV: 200, gross: 24200, net: 19800 },
  { level: 7, name: "レベル7",        minCV: 201, maxCV: 300, gross: 25850, net: 22000 },
  { level: 8, name: "レベル8（上限）", minCV: 301, maxCV: 9999,gross: 29150, net: 24200 },
];

export default function VLHTokutanPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchWord, setSearchWord] = useState<string>("");
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
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // 🔍 核心：各ASPの報酬属性をパースし、1件あたり単価からレベルを全自動判定
  const partnersWithEvaluations = useMemo(() => {
    const map: any = {};

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
        map[finalName] = { 
          name: finalName, 
          cv: 0, 
          rawReward: 0, 
          ids: new Set<string>(),
          aspUnitCosts: [] // 各行の単価データをストック
        };
      }

      const count = row.issued_count || 0;
      const reward = row.issued_reward || 0;

      map[finalName].cv += count;
      map[finalName].rawReward += reward;
      map[finalName].ids.add(rawId);

      if (count > 0) {
        const unitCost = reward / count; // 1件あたりのレポート単価
        map[finalName].aspUnitCosts.push({ asp, unitCost });
      }
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv;
      const totalRevenue = cv * 79800; // 本体価格 ￥79,800

      // 💡 巡回：アフィリエイターに現在適用されているレベルを単価から自動検出（誤差50円を許容）
      let detectedLevel = 1; 
      let isSpecial = false;

      if (p.aspUnitCosts.length > 0) {
        // データの性質が最も強い最新のレコードから単価の正体を暴く
        const target = p.aspUnitCosts[p.aspUnitCosts.length - 1];
        const cost = target.unitCost;
        let targetGrossOrNet = 0;

        // ASPごとの規律の適用
        if (target.asp === "QUORIZa") {
          isSpecial = true;
        } else if (target.asp === "A8.net") {
          // A8は税抜ネット単価 ➔ 税込ネットへ
          targetGrossOrNet = cost * 1.1;
        } else if (target.asp === "もしもアフィリエイト") {
          // もしもは税抜ネット（グロスからの逆算値） ➔ 税込グロスへ戻す
          targetGrossOrNet = cost * 1.3 * 1.1;
        } else {
          // afb, AccessTrade, felmat は税抜グロス単価 ➔ 税込グロスへ
          targetGrossOrNet = cost * 1.1;
        }

        if (!isSpecial) {
          // マスターテーブルと照合（50円の誤差を許容）
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
            isSpecial = true; // どのレベルの規律にも合致しない場合は個別契約（特殊）
          }
        }
      }

      // 現在のレベル設定オブジェクトを確定
      const currentTier = isSpecial 
        ? { level: 99, name: "特殊（個別契約）", gross: 0, net: 0, minCV: 0, maxCV: 0 }
        : TOKUTAN_MASTER_TABLE.find(t => t.level === detectedLevel) || TOKUTAN_MASTER_TABLE[0];

      // 💡 財務マージンの逆算（特殊の場合は生データをベースに概算）
      let partnerProfit = 0;
      let aspProfit = 0;
      let 自社残し = 0;

      if (isSpecial) {
        partnerProfit = p.rawReward * 0.8; // 特殊時は支払額の8割をメディア分と仮定
        aspProfit = p.rawReward * 0.2;
        自社残し = totalRevenue - p.rawReward;
      } else {
        partnerProfit = cv * currentTier.net;
        aspProfit = cv * (currentTier.gross - currentTier.net);
        自社残し = totalRevenue - (cv * currentTier.gross);
      }

      // 💡 改善：ハッキリとした昇格条件が無いため、活躍度合いに応じた運用アドバイス文言を動的生成！
      let adviceMessage = "現在のレベルで安定推移しています。もうしばらくこの設定でがんばらせよう。";
      if (isSpecial) {
        adviceMessage = "個別契約（特殊単価）が適用されています。担当営業の個別交渉ログを確認してください。";
      } else if (cv > currentTier.maxCV || (cv >= currentTier.minCV && cv > 50)) {
        adviceMessage = "当月は成果（件数）が急増、または高い影響力を維持しています。そろそろ上のレベルへの特別単価付与を検討してもいいんじゃないか？";
      } else if (cv === 0) {
        adviceMessage = "当月の成果はまだありません。今後の動きを注視しましょう。";
      }

      return {
        ...p,
        idList: Array.from(p.ids).join(", "),
        currentTier,
        isSpecial,
        totalRevenue,
        partnerProfit,
        aspProfit,
        自社残し,
        adviceMessage
      };
    }).sort((a: any, b: any) => b.cv - a.cv);
  }, [performanceData, dictData]);

  const filteredPartners = useMemo(() => {
    return partnersWithEvaluations.filter(p => 
      p.name.toLowerCase().includes(searchWord.toLowerCase()) ||
      p.idList.toLowerCase().includes(searchWord.toLowerCase())
    );
  }, [partnersWithEvaluations, searchWord]);

  const currentPartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    const found = filteredPartners.find(p => p.name === selectedPartnerName);
    return found || filteredPartners[0];
  }, [filteredPartners, selectedPartnerName]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest">特別単価判定マトリクス起動中...</div>;

  return (
    <div className="w-full">
      <header className="hidden md:flex px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <h1 className="text-xl font-black tracking-tight">特別単価設定管理</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 左翼：パートナーリスト */}
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
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black flex-shrink-0 ${partner.isSpecial ? "bg-purple-500 text-white" : "bg-amber-500 text-slate-950"}`}>
                      {partner.isSpecial ? "特殊" : `Lv.${partner.currentTier.level}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] opacity-60 font-bold">
                    <span className="truncate">当月成果: {partner.cv} 件</span>
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

        {/* 右翼：特別単価判定コックピット */}
        <div className="xl:col-span-3 space-y-6">
          {currentPartner ? (
            <>
              {/* 自動単価判定ウォール */}
              <div className={`p-6 rounded-2xl border shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-slate-800"}`}>
                <div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 tracking-wider">リアルタイム単価判定</span>
                  <h2 className="text-xl font-black mt-2">{currentPartner.name}</h2>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${currentPartner.isSpecial ? "bg-purple-500 text-white shadow-purple-500/10" : "bg-amber-500 text-slate-950 shadow-amber-500/10"}`}>
                      {currentPartner.isSpecial ? "特殊" : `Lv.${currentPartner.currentTier.level}`}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold">自動判定された現在のステータス</p>
                      <p className={`text-base font-black ${currentPartner.isSpecial ? "text-purple-400" : "text-amber-500"}`}>{currentPartner.currentTier.name}</p>
                      {!currentPartner.isSpecial && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          (目安グロス: ￥{currentPartner.currentTier.gross.toLocaleString()} / ネット: ￥{currentPartner.currentTier.net.toLocaleString()})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 💡 改善：機械的な件数カウントをパージし、ヒロム様指定の「運用判断アドバイス文」を大文字露出！！！ */}
                <div className="border-t md:border-t-0 md:border-l border-slate-700/20 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center h-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-500 dark:text-emerald-400 uppercase tracking-wider">
                      <MessageSquare size={14} /> 運用担当者への示唆・アドバイス
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-black leading-relaxed text-slate-800 dark:text-slate-200">
                        「 {currentPartner.adviceMessage} 」
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 三位一体の財務内訳 */}
              <div className="space-y-2">
                <div className="text-xs font-black tracking-widest text-slate-400 uppercase border-l-4 border-indigo-500 pl-2">■ 当月成果・三位一体の財務内訳（税込）</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <TokutanKPICard title="当月合算成果数" value={currentPartner.cv.toLocaleString()} suffix="件" icon={Crown} colorClass="text-indigo-500 bg-indigo-500" isLight={isLight} />
                  <TokutanKPICard title="アフィリエイターの総儲け" prefix="￥" value={Math.round(currentPartner.partnerProfit).toLocaleString()} icon={Target} colorClass="text-green-500 bg-green-500" isLight={isLight} />
                  <TokutanKPICard title="ASPの総儲け（マージン）" prefix="￥" value={Math.round(currentPartner.aspProfit).toLocaleString()} icon={Percent} colorClass="text-orange-400 bg-orange-400" isLight={isLight} />
                  <TokutanKPICard title="自社の売上残高（手残り）" prefix="￥" value={Math.round(currentPartner.自社残し).toLocaleString()} icon={DollarSign} colorClass="text-emerald-500 bg-emerald-500" isLight={isLight} />
                </div>
              </div>

              {/* 基準表 */}
              <div className={`border rounded-2xl p-6 overflow-hidden shadow-md transition-all ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#1e293b] border-slate-800 text-slate-300"}`}>
                <h3 className="text-xs font-black mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800 dark:text-white">
                  <Filter size={14} className="text-indigo-500" /> ケノン特別単価・ガバナンス基準表（グロス・ネット完全版）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 font-black uppercase select-none">
                        <th className="pb-3 text-center">レベル設定</th>
                        <th className="pb-3 text-left">レベル名称</th>
                        <th className="pb-3 text-center">月間成果目安範囲</th>
                        <th className="pb-3 text-right">グロス単価（自社コスト）</th>
                        <th className="pb-3 text-right">ネット単価（メディア報酬）</th>
                        <th className="pb-3 text-right">ASP仲介マージン</th>
                        <th className="pb-3 text-center">現在の判定位置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800/60 dark:text-slate-200 font-bold">
                      {TOKUTAN_MASTER_TABLE.map((tier) => {
                        const isMatch = !currentPartner.isSpecial && currentPartner.currentTier.level === tier.level;
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
            <div className="text-center py-20 text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-3xl">
              <ShieldAlert size={24} className="text-slate-600"/>
              パートナーデータが存在しないため、自動判定システムを停止しています。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}