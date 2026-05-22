"use client";

import React, { useState, useEffect, createContext } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { 
  Users, Layers, Crown, Upload, 
  Sun, Moon, Clock, LayoutDashboard, ChevronRight,
  Menu, X
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
  
  const [mounted, setMounted] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");
  
  // 💡 規律：モバイル環境でのサイドメニュー開閉ステート
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("vlh-theme-mode") as "light" | "dark" | "auto";
    if (savedMode) {
      setThemeMode(savedMode);
    }
  }, []);

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

  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);
  }, [activeTheme, mounted]);

  // 💡 改善：ページを切り替えたらモバイルメニューを自動で閉じる
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
          
          {/* 全体コンテナ */}
          <div className={`flex h-screen w-full transition-colors duration-500 bg-slate-100 text-slate-800 dark:bg-[#0f172a] dark:text-slate-100`}>
            
            {/* 🛡️ モバイル専用：メニューが開いている時の背景半透明レイヤー */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 animate-in fade-in"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* 🏰 サイドメニュー・アイランド：PCでは常時表示、スマホではスライドイン */}
            <aside className={`
              fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r transition-transform duration-300 ease-in-out
              md:static md:translate-x-0
              ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
              ${isLight ? "bg-white border-slate-200 shadow-xl" : "bg-[#1e293b] border-slate-800 shadow-2xl"}
            `}>
              
              {/* ロゴエリア ＆ モバイル用閉じるボタン */}
              <div className="p-8 flex items-center justify-between border-b border-slate-700/10">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-sm tracking-tighter shadow-lg shadow-indigo-500/20">VLH</div>
                  <span className={`text-base font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>VLH v2.5 Console</span>
                </div>
                {/* スマホ用 [×] ボタン */}
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
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

            {/* 🚀 メインコンテンツエリア */}
            <main className="flex-1 h-full overflow-y-auto scroll-smooth relative">
              
              {/* 💡 モバイル専用：左上に浮かぶハンバーガーメニュー開閉ボタン */}
              <div className="md:hidden p-4 sticky top-0 z-30 flex items-center bg-slate-100/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-3 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-md text-indigo-500 hover:text-indigo-600 flex items-center justify-center"
                >
                  <Menu size={24} />
                </button>
                <span className="ml-4 text-sm font-black tracking-tight">アフィリエイト広告 比較・分析</span>
              </div>

              {/* 各ページのコンテンツ本体 */}
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