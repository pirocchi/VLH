"use client";

import React, { useState, useContext } from "react";
import { ThemeContext } from "../layout";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers, Trash2 } from "lucide-react";

export default function VLHUploadPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  // 💡 最終調停：単一ファイル管理を完全爆破し、複数ファイルを同時にストックする「配列規律」へ昇格！
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  // 🔍 共通処理：流れ込んできた複数のファイルから「.csv」だけを厳格にサルベージしてスタック
  const processFiles = (fileList: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.name.endsWith(".csv")) {
        validFiles.push(f);
      }
    }

    if (validFiles.length > 0) {
      // 既存の選択リストに、新しくドロップされた実弾を綺麗に合流マージ
      setFiles(prev => [...prev, ...validFiles]);
      setStatus({ type: null, msg: "" });
    } else {
      setStatus({ type: 'error', msg: "入庫できるのはCSVファイルのみです。" });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // 🚀 射出：溜まった120個などのCSV実弾群を一網打尽にして一撃POST！
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
    // 💡 核心：裏側の route.ts が待つ「files」キーへ向けて、全実弾を全自動でマルチインジェクション！
    files.forEach(f => {
      formData.append("files", f);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus({ type: 'success', msg: `合計 ${files.length} 件の成果CSVデータの一括入庫・名寄せ解析、およびクラウドへの同期打ち上げが2000%完全成功しました！` });
        setFiles([]); // 兵舎をクリーンにリセット
      } else {
        const errData = await res.json();
        throw new Error(errData.error || errData.message || "通信網で拒絶されました。");
      }
    } catch (error: any) {
      setStatus({ type: 'error', msg: `入庫に失敗しました: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 👑 ヘッダー（PC専用隔離、横ハスパージ日本語） */}
      <header className="hidden md:flex px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <h1 className="text-xl font-black tracking-tight">データ入庫（CSV一括投入）</h1>
      </header>

      {/* メイン入庫島 */}
      <div className="max-w-3xl mx-auto mt-4 md:mt-8">
        <div className={`p-8 rounded-[32px] border shadow-xl transition-all ${isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-slate-800"}`}>
          
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={20} className="text-indigo-500" /> 成果実績データの一括取り込み
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed">
              各ASPからダウンロードした複数日・複数チャンネルのCSVファイルを、**一括で何個でも同時に放り込めます。** 120ファイルまとめてドロップしても、システム側が自動で日付をサルベージし、各ASPフォルダへ全自動仕分け保存を行います。
            </p>
          </div>

          {/* 📡 ドラッグ＆ドロップ反応型マルチアイランド */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              border-4 border-dashed rounded-[24px] p-10 text-center cursor-pointer transition-all duration-300 relative
              ${isDragActive ? "border-indigo-500 bg-indigo-500/5 scale-[0.99]" : "border-slate-300 dark:border-slate-700 hover:border-indigo-500/50"}
              ${files.length > 0 ? "bg-indigo-500/5 border-indigo-500/40" : ""}
            `}
          >
            {/* 💡 改善：multiple 属性を完全解放！！！ */}
            <input 
              type="file" 
              accept=".csv" 
              multiple 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              disabled={uploading}
            />
            
            <div className="flex flex-col items-center justify-center gap-4">
              <div className={`p-4 rounded-2xl ${files.length > 0 ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-[#0f172a] text-slate-400"}`}>
                <Upload size={32} className={uploading ? "animate-spin text-indigo-400" : ""} />
              </div>
              
              <div className="space-y-1">
                <p className="text-base font-black text-slate-700 dark:text-slate-300">
                  {files.length > 0 ? `現在 ${files.length} 個のCSVファイルが装填されています` : "CSVファイルをまとめてここにドラッグ＆ドロップ"}
                </p>
                <p className="text-xs text-slate-400 font-bold">または、画面をクリックして複数ファイルを同時に選択</p>
              </div>
            </div>
          </div>

          {/* 🏛️ 視認性（Scannable）：120個ドロップされても画面が崩壊しない、美しきスクロール付ファイル格納檻 */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">■ 入庫予定の実弾ファイル一覧</span>
                <button 
                  onClick={() => setFiles([])} 
                  disabled={uploading}
                  className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-all"
                >
                  <Trash2 size={12} /> リストを全クリア
                </button>
              </div>
              <div className={`max-h-48 overflow-y-auto rounded-2xl p-4 border space-y-1.5 scrollbar-thin ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f172a]/60 border-slate-800"}`}>
                {files.map((f, index) => (
                  <div key={index} className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1e293b] px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
                    <span className="flex items-center gap-2 truncate pr-4">
                      <FileText size={14} className="text-indigo-500 flex-shrink-0" />
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ステータス通知ウォール */}
          {status.type && (
            <div className={`mt-6 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-300 font-bold text-sm ${status.type === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
              <p className="leading-relaxed">{status.msg}</p>
            </div>
          )}

          {/* 実行トリガー */}
          <div className="mt-8 flex justify-end gap-3">
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-5 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-[#0f172a]/80 transition-all"
              >
                取り消し
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-40 disabled:shadow-none transition-all flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {files.length} 件のファイルを一括解析・クラウド射出中...
                </>
              ) : (
                `これら ${files.length} 件のファイルを受け入れる`
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}