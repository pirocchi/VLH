"use client";

import React, { useState, useContext } from "react";
import { ThemeContext } from "../layout";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function VLHUploadPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  // ドラッグ＆ドロップの規律制御
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setStatus({ type: null, msg: "" });
      } else {
        setStatus({ type: 'error', msg: "入庫できるのはCSVファイルのみです。" });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setStatus({ type: null, msg: "" });
      } else {
        setStatus({ type: 'error', msg: "入庫できるのはCSVファイルのみです。" });
      }
    }
  };

  // 📡 射出：CSV実弾データをAPIへPOST
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus({ type: 'success', msg: `成果データ [ ${file.name} ] の入庫・格納が正常に完了しました！` });
        setFile(null);
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "通信網で拒絶されました。");
      }
    } catch (error: any) {
      setStatus({ type: 'error', msg: `入庫に失敗しました: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 👑 ヘッダー（💡 改善：PC専用隔離 hidden md:flex ＆ 横ハラを100%パージしたシンプル日本語） */}
      <header className="hidden md:flex px-8 py-5 mb-5 rounded-2xl flex justify-between items-center border shadow-md transition-all bg-white border-slate-200 text-slate-800 dark:bg-[#1e293b] dark:border-slate-800 dark:text-white dark:shadow-xl">
        <h1 className="text-xl font-black tracking-tight">データ入庫（CSV）</h1>
      </header>

      {/* メイン入庫島 */}
      <div className="max-w-3xl mx-auto mt-4 md:mt-8">
        <div className={`p-8 rounded-[32px] border shadow-xl transition-all ${isLight ? "bg-white border-slate-200" : "bg-[#1e293b] border-slate-800"}`}>
          
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">成果実績データの取り込み</h2>
            <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed">
              各ASP（A8.net、afb、AccessTrade、felmat、もしもアフィリエイト、QUORIZa）からダウンロードした日別・メディア別のCSVファイルを選択、またはドロップしてください。
            </p>
          </div>

          {/* 💡 コア：ドラッグ＆ドロップ反応型アイランド */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              border-4 border-dashed rounded-[24px] p-10 text-center cursor-pointer transition-all duration-300 relative
              ${isDragActive ? "border-indigo-500 bg-indigo-500/5 scale-[0.99]" : "border-slate-300 dark:border-slate-700 hover:border-indigo-500/50"}
              ${file ? "bg-indigo-500/5 border-indigo-500/40" : ""}
            `}
          >
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              disabled={uploading}
            />
            
            <div className="flex flex-col items-center justify-center gap-4">
              <div className={`p-4 rounded-2xl ${file ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-[#0f172a] text-slate-400"}`}>
                <Upload size={32} className={uploading ? "animate-spin text-indigo-400" : ""} />
              </div>
              
              {file ? (
                <div className="space-y-1 z-20">
                  <p className="text-base font-black text-indigo-500 flex items-center justify-center gap-2">
                    <FileText size={18} /> {file.name}
                  </p>
                  <p className="text-xs text-slate-400 font-bold">サイズ: {(file.size / 1024).toFixed(1)} KB (入庫準備完了)</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-700 dark:text-slate-300">CSVファイルをここにドラッグ＆ドロップ</p>
                  <p className="text-xs text-slate-400 font-bold">または、画面をクリックしてファイルを選択</p>
                </div>
              )}
            </div>
          </div>

          {/* ステータス通知ウォール */}
          {status.type && (
            <div className={`mt-6 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-300 font-bold text-sm ${status.type === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
              <p className="leading-relaxed">{status.msg}</p>
            </div>
          )}

          {/* 実行トリガー */}
          <div className="mt-8 flex justify-end gap-3">
            {file && (
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="px-5 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-[#0f172a]/80 transition-all"
              >
                取り消し
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-40 disabled:shadow-none transition-all flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  データ解析・格納中...
                </>
              ) : (
                "このファイルを入庫する"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}