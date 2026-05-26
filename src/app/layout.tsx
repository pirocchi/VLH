"use client";

import React, { useState, useEffect, createContext } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { 
  Users, Layers, Crown, Upload, BookOpen, Coins,
  Sun, Moon, Clock, LayoutDashboard, ChevronRight,
  BarChart2, Link2
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

  const rawMenuItems = [
    { name: "全体ダッシュボード", path: "/dashboard", icon: LayoutDashboard },
    { name: "パートナー詳細分析", path: "/partners", icon: Users },
    { name: "比較・分析センター", path: "/compare", icon: BarChart2 },
    { name: "パートナー統合設定", path: "/dictionary", icon: BookOpen },
    { name: "プロバイダ詳細分析", path: "/asp", icon: Layers },
    { name: "特別単価管理・分析", path: "/tokutan", icon: Crown },
    { name: "手動・特殊単価設定", path: "/pricing", icon: Coins },
    { name: "ＡＳＰ・申請リンク", path: "/links", icon: Link2 }, // 👑 メニュー名も全角9文字へ強制大修正！！！
  ];

  const [menuItems] = useState<any[]>(rawMenuItems);

  useEffect(() => {
    const savedMode = localStorage.getItem("vlh-theme-mode") as "light" | "dark" | "auto";
    if (savedMode) {
      setThemeMode(savedMode);
    }
    setMounted(true);
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
    
    root.style.colorScheme = activeTheme;
  }, [activeTheme, mounted]);

  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} h-full m-0 p-0 antialiased overflow-hidden`}>
        <ThemeContext.Provider value={{ activeTheme }}>
          
          <div className="flex h-screen w-full flex-col md:flex-row transition-colors duration-500 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
            
            {/* PC用サイドバー */}
            <aside className="hidden md:flex w-72 flex-shrink-0 flex-col border-r bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="p-8 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-sm tracking-tighter shadow-md shadow-indigo-500/20">VLH</div>
                <div className="flex flex-col">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-50">VLH v2.8 Console</span>
                </div>
              </div>

              {/* メニューナビゲーション */}
              <nav className="flex-1 p-4 space-y-2 mt-4">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={`
                        group flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-all duration-300
                        ${isActive 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-50"}
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

              {/* モード切り替えユニット */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800">
                  {[ {m:"light", i:Sun}, {m:"dark", i:Moon}, {m:"auto", i:Clock} ].map(t => (
                    <button key={t.m} onClick={() => setThemeMode(t.m as any)} className={`flex-1 flex justify-center py-2.5 rounded-xl transition-all ${themeMode === t.m ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}><t.i size={16} /></button>
                  ))}
                </div>
                <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-6 tracking-widest uppercase">
                  © Arrow8 inc.
                </p>
              </div>
            </aside>

            {/* モバイル用ヘッダー・ナビゲーション */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              
              <header className="md:hidden flex-shrink-0 flex flex-col border-b bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black text-xs">VLH</div>
                    <span className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">アフィリエイト広告 比較・分析</span>
                  </div>
                  <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800">
                    {[ {m:"light", i:Sun}, {m:"dark", i:Moon}, {m:"auto", i:Clock} ].map(t => (
                      <button key={t.m} onClick={() => setThemeMode(t.m as any)} className={`p-1.5 rounded-lg transition-all ${themeMode === t.m ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 dark:text-slate-500"}`}><t.i size={12} /></button>
                    ))}
                  </div>
                </div>

                <nav className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link key={item.path} href={item.path} className="flex-shrink-0">
                        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black transition-all duration-200 ${isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                          <item.icon size={13} className={isActive ? "text-white" : "text-indigo-500"} />
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </header>

              {/* メメインコンテンツ表示領域 */}
              <main className="flex-1 overflow-y-auto scroll-smooth pb-32 md:pb-0">
                <div className="p-4 sm:p-8">
                  {children}
                </div>
              </main>

            </div>

          </div>
        </ThemeContext.Provider>
      </body>
    </html>
  );
}