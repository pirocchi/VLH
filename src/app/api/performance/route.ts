import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

// 💡 宇宙規律：Next.jsの凶悪なしつこいキャッシュ機構を木っ端微塵にパージするトリプル全破壊命令！
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CONSOLE_ROOT = process.cwd();
const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");

/**
 * 📊 GET: 全6ページ（画面UI）が読み込む、クラウド本番データの超高速フェッチ
 */
export async function GET() {
  try {
    const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const targetBlob = blobList.blobs.find(b => b.pathname === "vlh_normalized_performance.json");
    
    if (targetBlob) {
      const blobRes = await fetch(targetBlob.url, { cache: "no-store" });
      if (blobRes.ok) {
        const data = await blobRes.json();
        return NextResponse.json(data);
      }
    }
  } catch (e) {
    console.error("❌ Vercel Blobからのデータ取得失敗。ローカル物理ファイルへフォールバックします:", e);
  }

  // クラウドが万が一死んでいた場合の、ローカル物理JSONへの最終防衛線フォールバック
  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
    return NextResponse.json(JSON.parse(localData));
  }

  return NextResponse.json([]);
}

/**
 * 🚀 POST: 【新設】ローカルのPython（戦乙女）から撃ち込まれた大統一データをVercel Blobへ強制上書き射出
 */
export async function POST(req: NextRequest) {
  console.log("=== 📡 LOCAL TO CLOUD REPLICATION PULSE RECEIVED ===");
  try {
    const data = await req.json();
    if (!Array.isArray(data)) {
      console.error("❌ エラー: 同期データのフォーマットが配列ではありません。");
      return NextResponse.json({ error: "Invalid data format. Array expected." }, { status: 400 });
    }

    console.log(`🧹 重複パージ済み一意データ [${data.length} 行] のクラウド射出を執行します。`);

    // 1. Vercel Blob（Privateストア）へ絶対上書き直撃ショット！
    await put("vlh_normalized_performance.json", JSON.stringify(data, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true, // 同名ファイル強制絶対上書き許可
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    
    console.log("✓ Vercel Blob への自動リアルタイム同期打ち上げに完全勝利しました！");
    return NextResponse.json({ success: true, synced_rows: data.length });

  } catch (err: any) {
    console.error("❌ 同期受入APIの内部防衛線でエラー大破:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}