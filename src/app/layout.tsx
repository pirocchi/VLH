import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VLH",
  description: "Performance Intelligence Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 💡 規律：外枠の余白(p-4)や余計な背景色を全パージし、100%フラットな宇宙を構築
    <html lang="ja" className="h-full m-0 p-0 overflow-x-hidden bg-[#0f172a]">
      <body className={`${inter.className} h-full m-0 p-0 antialiased bg-[#0f172a]`}>
        {children}
      </body>
    </html>
  );
}