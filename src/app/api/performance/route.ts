import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CONSOLE_ROOT = process.cwd();
const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");

/**
 * 📊 GET: 宇宙ストレージから10万行のデータをピンポイントで最速フェッチ
 */
export async function GET() {
  try {
    // 💡 改善：全件ループ検索を完全廃止！prefix指定でターゲットを一撃で狙い撃ち奪取する
    const blobList = await list({ 
      prefix: "vlh_normalized_performance.json",
      token: process.env.BLOB_READ_WRITE_TOKEN 
    });
    
    const targetBlob = blobList.blobs[0];
    
    if (targetBlob) {
      const blobRes = await fetch(targetBlob.url, { cache: "no-store" });
      if (blobRes.ok) {
        const data = await blobRes.json();
        return NextResponse.json(data);
      }
    } else {
      console.warn("⚠️ Vercel Blob上に vlh_normalized_performance.json が見つかりません。");
    }
  } catch (e: any) {
    console.error("❌ Vercel Blobからのデータ取得に致命的失敗:", e.message);
  }

  // クラウドが万が一死んでいた場合のローカル物理フォールバック
  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
    return NextResponse.json(JSON.parse(localData));
  }

  return NextResponse.json([]);
}

/**
 * 🚀 POST: ローカルのPythonから撃ち込まれたデータをVercel Blobへ強制上書き射出
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format. Array expected." }, { status: 400 });
    }

    await put("vlh_normalized_performance.json", JSON.stringify(data, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    
    return NextResponse.json({ success: true, synced_rows: data.length });
  } catch (err: any) {
    console.error("❌ 同期受入APIエラー:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}