import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CONSOLE_ROOT = process.cwd();
const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
const CONSOLE_JSON_PATH = path.join(CONSOLE_ROOT, "vlh_normalized_performance.json");

/**
 * 📊 GET: 宇宙ストレージから10万行のデータをトークン付きでフェッチし、ローカル物理へ逆ミラーリング
 */
export async function GET() {
  try {
    const blobList = await list({ 
      prefix: "vlh_normalized_performance.json",
      token: process.env.BLOB_READ_WRITE_TOKEN 
    });
    
    const targetBlob = blobList.blobs[0];
    
    if (targetBlob) {
      const blobRes = await fetch(targetBlob.url, { 
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
      });

      if (blobRes.ok) {
        const data = await blobRes.json();

        // 💡 核心：ローカル環境下であれば、クラウドの最新データを物理JSON2拠点へ自動で逆ミラーリング上書き保存！
        try {
          if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
            fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
          }
          if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) {
            fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
          }
        } catch (fsErr) {}

        return NextResponse.json(data);
      } else {
        console.error(`⚠️ Vercel Blobからの取得エラー。ステータスコード: ${blobRes.status}`);
      }
    }
  } catch (e: any) {
    console.error("❌ Vercel Blobからのデータ取得に失敗:", e.message);
  }

  // クラウド通信遮断時、またはローカル開発時の物理フォールバック
  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
    return NextResponse.json(JSON.parse(localData));
  }

  return NextResponse.json([]);
}

/**
 * 🚀 POST: 撃ち込まれたデータをVercel Blobおよびローカル物理双方へ絶対上書き射出
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
    
    // POST時も物理ディスク2拠点をミラーリング
    try {
      if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
        fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
      }
      if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) {
        fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch (fsErr) {}

    return NextResponse.json({ success: true, synced_rows: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}