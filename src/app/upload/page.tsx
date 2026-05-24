"use client";

import React, { useState, useContext } from "react";
import { ThemeContext } from "../layout";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers, Trash2 } from "lucide-react";

export default function VLHUploadPage() {
  const { activeTheme } = useContext(ThemeContext);
  const isLight = activeTheme === "light";

  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  const processFiles = (fileList: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.name.endsWith(".csv")) {
        validFiles.push(f);
      }
    }

    if (validFiles.length > 0) {
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

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
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
        setFiles([]); 
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
    <div className="w-full space-y-5 text-slate-900 dark:text-slate-50">
      {/* 👑 メインヘッダーの大粛清・デフォルト回帰 */}
      <header className="hidden md:flex px-8 py-5 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h1 className="text-xl font-black tracking-tight">レポートインポート</h1>
      </header>

      {/* 🗺️ メイン入庫島の大粛清 */}
      <div className="max-w-3xl mx-auto mt-4 md:mt-8">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-sm transition-all space-y-6">
          
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Layers size={20} className="text-indigo-500" /> 成果実績データの一括取り込み
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 leading-relaxed">
              各ASPからダウンロードした複数日・複数チャンネルのCSVファイルを、一括で何個でも同時に放り込めます。120ファイルまとめてドロップしても、システム側が自動で日付をサルベージし、各ASPフォルダへ全自動仕分け保存を行います。
            </p>
          </div>

          {/* 📡 ドラッグ＆ドロップ反応型マルチアイランドの大粛清 */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              border-4 border-dashed rounded-[24px] p-10 text-center cursor-pointer transition-all duration-300 relative
              ${isDragActive ? "border-indigo-500 bg-indigo-500/5 scale-[0.99]" : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/50"}
              ${files.length > 0 ? "bg-indigo-500/5 border-indigo-500/40 dark:bg-indigo-500/5" : ""}
            `}
          >
            <input 
              type="file" 
              accept=".csv" 
              multiple 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              disabled={uploading}
            />
            
            <div className="flex flex-col items-center justify-center gap-4">
              <div className={`p-4 rounded-2xl ${files.length > 0 ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600"}`}>
                <Upload size={32} className={uploading ? "animate-spin text-indigo-400" : ""} />
              </div>
              
              <div className="space-y-1">
                <p className="text-base font-black text-slate-700 dark:text-slate-200">
                  {files.length > 0 ? `現在 ${files.length} 個のCSVファイルが装填されています` : "CSVファイルをまとめてここにドラッグ＆ドロップ"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">または、画面をクリックして複数ファイルを同時に選択</p>
              </div>
            </div>
          </div>

          {/* 🏛️ 実弾ファイル一覧格納檻の大粛清 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">■ 入庫予定の実弾ファイル一覧</span>
                <button 
                  onClick={() => setFiles([])} 
                  disabled={uploading}
                  className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-all"
                >
                  <Trash2 size={12} /> リストを全クリア
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl p-4 border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 space-y-1.5 scrollbar-thin">
                {files.map((f, index) => (
                  <div key={index} className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <span className="flex items-center gap-2 truncate pr-4">
                      <FileText size={14} className="text-indigo-500 flex-shrink-0" />
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ステータス通知ウォールの大粛清 */}
          {status.type && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-300 font-bold text-sm ${status.type === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" : "bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400"}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
              <p className="leading-relaxed">{status.msg}</p>
            </div>
          )}

          {/* 実行トリガーの大粛清 */}
          <div className="flex justify-end gap-3 pt-2">
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-5 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
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