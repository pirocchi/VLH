"use client";

import React, { useState, useEffect, createContext } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { 
  Users, Layers, Crown, Upload, 
  Sun, Moon, Clock, LayoutDashboard, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const ThemeContext = createContext({ activeTheme: "dark" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 💡 規律：ハイドレーション（画面のチラつきや初期化バグ）を防ぐための安全弁
  const [mounted, setMounted] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  // 1. 【初回マウント時】ブラウザの記憶倉庫から前回の設定をサルベージ
  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("vlh-theme-mode") as "light" | "dark" | "auto";
    if (savedMode) {
      setThemeMode(savedMode);
    }
  }, []);

  // 2. 【モード変更時】記憶を即座に上書き保存 ＆ 時間軸の冷徹なパース
  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem("vlh-theme-mode", themeMode);

    const evaluateTheme = () => {
      if (themeMode === "auto") {
        const hour = new Date().getHours();
        setActiveTheme(hour >= 6 && hour < 18 ? "light" : "dark");
      } else {
        setActiveTheme(themeMode);
      }
    };

    evaluateTheme();
    const interval = setInterval(evaluateTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode, mounted]);

  // 3. メイン背景色へのクラス適用
  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);
  }, [activeTheme, mounted]);

  const isLight = activeTheme === "light";

  const menuItems = [
    { name: "全体ダッシュボード", path: "/dashboard", icon: LayoutDashboard },
    { name: "パートナー別詳細", path: "/partners", icon: Users },
    { name: "ASP別詳細分析", path: "/asp", icon: Layers },
    { name: "特単管理", path: "/tokutan", icon: Crown },
    { name: "データ入庫（CSV）", path: "/upload", icon: Upload },
  ];

  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} h-full m-0 p-0 antialiased overflow-hidden`}>
        <ThemeContext.Provider value={{ activeTheme }}>
          <div className={`flex h-screen w-full transition-colors duration-500 ${isLight ? "bg-slate-100 text-slate-800" : "bg-[#0f172a] text-slate-100"}`}>
            
            {/* 🏰 左側の司令塔：共通サイドメニュー・アイランド */}
            <aside className={`w-72 flex-shrink-0 flex flex-col border-r transition-all duration-500 ${isLight ? "bg-white border-slate-200 shadow-xl" : "bg-[#1e293b] border-slate-800 shadow-2xl"}`}>
              
              {/* ロゴエリア */}
              <div className="p-8 flex items-center gap-3 border-b border-slate-700/10">
                <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-sm tracking-tighter shadow-lg shadow-indigo-500/20">VLH</div>
                <div className="flex flex-col">
                  <span className={`text-base font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>VLH v2.5 Console</span>
                </div>
              </div>

              {/* ナビゲーションメニュー */}
              <nav className="flex-1 p-4 space-y-2 mt-4">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={`
                        group flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-all duration-300
                        ${isActive 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                          : isLight ? "hover:bg-slate-50 text-slate-600" : "hover:bg-[#0f172a]/50 text-slate-400"}
                      `}>
                        <div className="flex items-center gap-4">
                          <item.icon size={22} className={isActive ? "text-white" : "text-indigo-500"} />
                          <span className="text-base font-black tracking-tighter">{item.name}</span>
                        </div>
                        {isActive && <ChevronRight size={16} className="text-indigo-200" />}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* 下段：テーマ切替・フッター */}
              <div className={`p-6 border-t ${isLight ? "border-slate-100" : "border-slate-800"}`}>
                <div className={`flex p-1.5 rounded-2xl ${isLight ? "bg-slate-200" : "bg-[#0f172a]"}`}>
                  {[ {m:"light", i:Sun}, {m:"dark", i:Moon}, {m:"auto", i:Clock} ].map(t => (
                    <button 
                      key={t.m} 
                      onClick={() => setThemeMode(t.m as any)} 
                      className={`flex-1 flex justify-center py-2.5 rounded-xl transition-all ${themeMode === t.m ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-400"}`}
                    >
                      <t.i size={16} />
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] font-bold text-slate-500 mt-6 tracking-widest uppercase">
                  © Arrow8 inc.
                </p>
              </div>
            </aside>

            {/* 🚀 メインコンテンツ・アイランド */}
            <main className="flex-1 h-full overflow-y-auto scroll-smooth">
              <div className="p-4 sm:p-8">
                {children}
              </div>
            </main>

          </div>
        </ThemeContext.Provider>
      </body>
    </html>
  );
}