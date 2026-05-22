import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";

// 💡 規律：Python側のMIMIR（03_Memory）と100%同じファイルを完全共有・ロックする絶対座標（ローカル用）
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// 💡 規律：Vercel Blob（クラウド環境）で管理する永続辞書の固定オブジェクト名
const BLOB_FILENAME = "mimir_dictionary.json";

// 📡 核心：NODE_ENVを完全パージ！Vercelのインフラ上で動いている時だけ確実にtrueになる一撃判定！
// これによりローカルPCでの「npm run build」運用時は100%falseになり、ローカルディスクへ無事帰還します！
const isCloud = process.env.VERCEL === "1";

// ディレクトリ自動生成の安全弁（ローカル用）
const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    if (isCloud) {
      // 🌐 クラウド環境：Vercel Blob（vlh-memory）から高速サルベージ！
      const { blobs } = await list();
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      
      if (!targetBlob) {
        return NextResponse.json({ master_partners: [] });
      }
      
      const res = await fetch(targetBlob.url, { cache: "no-store" });
      if (!res.ok) return NextResponse.json({ master_partners: [] });
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      // 🏠 ローカル環境：PC内のローカルファイルを確実に読み込み！
      if (!fs.existsSync(dictPath)) {
        return NextResponse.json({ master_partners: [] });
      }
      const data = fs.readFileSync(dictPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    return NextResponse.json({ master_partners: [] });
  }
}

// 辞書データの書き込み・永続保存
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (isCloud) {
      // 🌐 クラウド環境：Vercel Blobへ直接上書き保存！
      const blob = await put(BLOB_FILENAME, JSON.stringify(body, null, 2), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // 🏠 ローカル環境：社内PCの物理ディスク（03_Memory）へ永続書き込み！
      ensureDirectoryExists(dictPath);
      fs.writeFileSync(dictPath, JSON.stringify(body, null, 2), "utf-8");
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}