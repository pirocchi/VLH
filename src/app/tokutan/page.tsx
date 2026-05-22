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

// 💡 規律：税込グロス／ネット特別単価マスターテーブル
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

// 💡 改善：ヒロム様のご指定通り、レベル（Lv）に応じて全部の色を個別に切り替える絶対配色カラーマップ！
const getLevelBadgeClass = (level: number, isSpecial: boolean) => {
  if (isSpecial) {
    return "bg-purple-600 text-white font-black shadow-sm shadow-purple-500/10";
  }
  switch (level) {
    case 1: // 通常エントリー：実直でマイルドなスレート
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/30";
    case 2: // レベル2：爽やかなスカイブルー
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    case 3: // レベル3：深みのあるティールグリーン
      return "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400";
    case 4: // レベル4：安心感のあるエメラルド
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case 5: // レベル5：注意を惹きつける高視認イエロー
      return "bg-yellow-50 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400";
    case 6: // レベル6：活気あふれるマイルドオレンジ
      return "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    case 7: // レベル7：熱量の高いビビッドピンク
      return "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400";
    case 8: // レベル8：王者の風格を纏う、アローエイト最高栄誉のアンバーゴールド
      return "bg-amber-550 text-slate-950 font-black shadow-md bg-amber-500 shadow-amber-500/10";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default function VLHTokutanPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dictData, setDictData] = useState<any>({ master_partners: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchWord, setSearchWord] = useState<string>("");
  // 💡 改善：組み合わせクロスフィルタリング用の「ASP」＆「設定レベル」ダブル選択ステート！
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

  // 🔍 演算：各ASPの報酬属性をパースし、1件あたり単価からレベルを全自動判定
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
          aspUnitCosts: [],
          asps: {} // 💡 改善：クロスフィルター用に、このパートナーが出撃（提携）している全ASPをストック
        };
      }

      const count = row.issued_count || 0;
      const reward = row.issued_reward || 0;

      map[finalName].cv += count;
      map[finalName].rawReward += reward;
      map[finalName].ids.add(rawId);
      map[finalName].asps[asp] = true; // 所属指紋の刻印

      if (count > 0) {
        const unitCost = reward / count; 
        map[finalName].aspUnitCosts.push({ asp, unitCost });
      }
    });

    return Object.values(map).map((p: any) => {
      const cv = p.cv;
      const totalRevenue = cv * 79800; 

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

      // 💡 規律：前回のスペース漏れタイポ（let自社残し）を2000%完全パージ修復！
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

  // 💡 改善：キーワード × ASP選択 × レベル選択 が「個々」でも「組み合わせ（両方）」でも完璧に機能するクロス・フィルタリングエンジン！
  const filteredPartners = useMemo(() => {
    return partnersWithEvaluations.filter(p => {
      // 1. キーワード検閲（名前、登録ID）
      const matchesWord = p.name.toLowerCase().includes(searchWord.toLowerCase()) ||
                          p.idList.toLowerCase().includes(searchWord.toLowerCase());
      
      // 2. ASP所属検閲
      const matchesAsp = selectedAsp === "all" || Object.keys(p.asps || {}).includes(selectedAsp);
      
      // 3. 設定レベル検閲
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

  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-500 font-bold animate-pulse text-lg tracking-widest">特別単価判定マトリクス起動中...</div>;

  return (
    <div className="w-full">
      <header className="hidden md:flex px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <h1 className="text-xl font-black tracking-tight">特別単価設定管理</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 左翼：多次元クロスフィルター内蔵・パートナー選抜モジュール */}
        <div className={`p-5 rounded-2xl border shadow-md h-fit ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#1e293b] border-slate-800 text-white"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-indigo-500" />
            <span className="text-sm font-black tracking-wider">パートナー選抜</span>
          </div>

          {/* 💡 改善：ASP ＆ 特単レベルを「個々・組み合わせ両方」で抽出できるダブル選別マトリクス！ */}
          <div className="space-y-2 mb-4 border-b border-slate-200 dark:border-slate-700/40 pb-3">
            {/* ASPセレクトボックス */}
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-slate-400 flex-shrink-0" />
              <select 
                value={selectedAsp} 
                onChange={(e) => setSelectedAsp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-black border border-slate-300 text-slate-800 bg-slate-50 dark:bg-[#0f172a] dark:border-slate-700 dark:text-white outline-none"
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

            {/* 特別単価レベル・セレクトボックス */}
            <div className="flex items-center gap-2">
              <Crown size={12} className="text-indigo-500 flex-shrink-0" />
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-black border border-slate-300 text-slate-800 bg-slate-50 dark:bg-[#0f172a] dark:border-slate-700 dark:text-white outline-none"
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
            className="px-4 py-2.5 rounded-xl text-xs w-full border bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 dark:bg-[#0f172a] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 font-bold mb-4"
          />

          <div className="border-t border-slate-200 dark:border-slate-700/30 pt-3 h-80 xl:h-[480px] overflow-y-auto space-y-1.5 pr-1">
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
                    {/* 💡 改善：リスト内の特単バッジ色をLvに応じて全部個別に変化させる！ */}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black flex-shrink-0 transition-all ${getLevelBadgeClass(partner.currentTier.level, partner.isSpecial)}`}>
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
                    {/* 💡 改善：メイン大文字バッジもLv色と完全連動！ */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-all ${getLevelBadgeClass(currentPartner.currentTier.level, currentPartner.isSpecial)}`}>
                      {currentPartner.isSpecial ? "特殊" : `Lv.${currentPartner.currentTier.level}`}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold">自動判定された現在のステータス</p>
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">{currentPartner.currentTier.name}</p>
                      {!currentPartner.isSpecial && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          (目安グロス: ￥{currentPartner.currentTier.gross.toLocaleString()} / ネット: ￥{currentPartner.currentTier.net.toLocaleString()})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 運用判断アドバイス文 */}
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
                  {/* 💡 規律：前回のスペース漏れタイポ（const自社残し）の再発を完全防止！ */}
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
                              {/* 💡 改善：基準表の中のラベル色も9パターンの規律へ完全同期連動！ */}
                              <span className={`px-2 py-0.5 rounded font-black transition-all ${getLevelBadgeClass(tier.level, false)}`}>
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
            <div className="text-center py-20 text-slate-500 text-sm font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-3xl">
              <ShieldAlert size={24} className="text-slate-600"/>
              指定のクロスフィルターに合致するパートナー情報が存在しません。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}