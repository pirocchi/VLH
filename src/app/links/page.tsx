"use client";

import React, { useState } from "react";
import { LogIn, Copy, CheckCircle, FileSignature, ExternalLink, Link2, Info } from "lucide-react";

// 👑 他のページと完全に高さを統一した、アイコン・説明文なしのシンプルヘッダー
const LinksHeader = ({ title }: { title: string }) => (
  <div className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-6 flex justify-between items-center">
    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
  </div>
);

const CopyableIdInput = ({ value, label }: { value: string, label: string }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("IDのコピーに失敗しました。");
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block ml-1">{label}</label>
      <div className="relative group/copy">
        <input 
          type="text" 
          value={value} 
          readOnly 
          className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-900 font-bold text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
        />
        <button 
          onClick={handleCopy}
          title={`${label}をコピーする`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500 dark:hover:text-indigo-400 hover:scale-105 transition-all shadow-sm"
        >
          {copied ? (
            <CheckCircle size={14} className="text-emerald-500 animate-in fade-in zoom-in-50 duration-200" />
          ) : (
            <Copy size={14} className="transition-all" />
          )}
        </button>
      </div>
    </div>
  );
};

const AspCard = ({ asp }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden min-h-[260px]">
    <div className="space-y-4 flex-1">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">{asp.name}</h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{asp.description}</p>
        </div>
        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex-shrink-0">
          <Link2 size={18} />
        </div>
      </div>
      
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5">
        <CopyableIdInput label="ログイン用ID（コピー）" value={asp.copyId} />
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
      <a 
        href={asp.loginUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2"
      >
        <LogIn size={16} /> 広告主ログイン画面を開く
      </a>
    </div>
  </div>
);

const InternalFormCard = ({ form }: any) => (
  <div className="p-6 bg-slate-950 text-slate-50 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-lg border border-emerald-500/20 dark:border-emerald-500/30">
    <div className="md:col-span-2 space-y-3">
      <div className="flex items-center gap-2.5 text-emerald-400">
        <FileSignature size={22} className="flex-shrink-0" />
        <h2 className="text-xl font-black">{form.name}</h2>
      </div>
      <p className="text-sm font-bold leading-relaxed text-slate-300">
        新規特別単価の適用、または既存単価の条件変更を行う際、社内台帳への反映を申請するためのフォーム導線です。<br />
        成果が承認基準に達したパートナーへの特単適用など、運用フローに則って申請を行ってください。
      </p>
    </div>
    <div className="flex flex-col gap-3 pt-3 md:pt-0 md:pl-6 md:border-l md:border-slate-800">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex gap-2 items-center text-slate-400">
                <Info size={14} className="flex-shrink-0" />
                <p className="text-xs font-bold leading-relaxed">
                    申請フォームでは、ASP名、メディアID、判定されたレベル、適用開始日を正確に入力してください。
                </p>
            </div>
        </div>
        <a href={form.url} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2">
            <ExternalLink size={16} /> 社内申請フォームを開く
        </a>
    </div>
  </div>
);

export default function VLHLinksPage() {
  // 👑 タイトル文字の適正化モデル（afb / felmat / QUORIZa へ完全修正）
  const aspLinks = [
    { name: "A8.net", description: "国内最大級。キャンペーン情報の確認やレポートの精査に。", copyId: "arrow8-a8", loginUrl: "#" },
    { name: "もしもアフィリエイト", description: "かんたんリンク等の管理、プロモーションの進捗確認に。", copyId: "moshimo-a8", loginUrl: "#" },
    { name: "afb", description: "報酬支払いサイクルや担当者との連携管理に。", copyId: "afb-arrow8", loginUrl: "#" },
    { name: "AccessTrade", description: "金融・Eコマース系に強い。安定した運用の確認に。", copyId: "at-arrow8", loginUrl: "#" },
    { name: "felmat", description: "クローズドASPならではの密な連携、特別単価の調整に。", copyId: "arrow8eight", loginUrl: "#" },
    { name: "QUORIZa", description: "最新のアフィリエイト機能、独自指標のモニタリングに。", copyId: "qz-arrow8", loginUrl: "#" },
  ];

  const internalForm = {
    name: "特別単価申請フォーム（社内用）",
    url: "#"
  };

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      {/* 👑 全角9文字規則に厳格準拠した共通ヘッダー */}
      <LinksHeader title="ＡＳＰ・申請リンク" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aspLinks.map((asp, idx) => (
          <AspCard key={idx} asp={asp} />
        ))}
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80">
        <InternalFormCard form={internalForm} />
      </div>
    </div>
  );
}