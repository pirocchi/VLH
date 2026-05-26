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
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      });

      if (blobRes.ok) {
        const data = await blobRes.json();
        
        // 👑 【絶対修正】再計算ロジック（getNormalizedCosts）を全撤廃！
        // ブリュンヒルドが送ってきたデータを一切弄らず、そのまま返す！
        return NextResponse.json(data);
      }
    }
  } catch (e: any) {
    console.error("❌ Vercel Blobからのデータ取得に失敗:", e.message);
  }

  // ローカルファイルの読み込み
  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = JSON.parse(fs.readFileSync(MEMORY_JSON_PATH, "utf-8"));
    return NextResponse.json(localData);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: "Invalid data format." }, { status: 400 });

    // 👑 保存時も、一切の加工を禁止！
    await put("vlh_normalized_performance.json", JSON.stringify(data, null, 2), {
      access: "private", addRandomSuffix: false, allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    
    try {
      if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
      if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (fsErr) {}

    return NextResponse.json({ success: true, synced_rows: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}