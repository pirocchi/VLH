import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob'; // 👑 クラウド（Vercel Blob）兵器を装填！
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CONSOLE_ROOT = process.cwd();
const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, '..', '03_Memory', 'pricing.json');

// 🛡️ クラウド＆ローカルの双方から単価データを引き出すGET
export async function GET() {
  try {
    // 👑 クラウド（Vercel Blob）上の pricing.json を探索
    const blobList = await list({ 
      prefix: "pricing.json",
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
        
        // 👑 クラウドの最新データをローカル（03_Memory）にも上書き同期！
        try {
          if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
            fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
          }
        } catch (fsErr) {}

        return NextResponse.json(data);
      }
    }
  } catch (e: any) {
    console.error("❌ Vercel Blobからの単価データ取得に失敗:", e.message);
  }

  // クラウドがダメならローカルからフォールバック
  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = JSON.parse(fs.readFileSync(MEMORY_JSON_PATH, "utf-8"));
    return NextResponse.json(localData);
  }

  return NextResponse.json({ special_prices: [] });
}

// 🛡️ クラウドとローカルへ同時に一撃必殺でセーブするPOST
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 👑 【絶対規律】 Vercel Blob（クラウド）へ「pricing.json」を一撃超光速打ち上げ！！！
    await put("pricing.json", JSON.stringify(data, null, 2), {
      access: "private", 
      addRandomSuffix: false, 
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    // 同時にローカル環境（03_Memory）のファイルにも確実に保存！
    try {
      if (!fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
        fs.mkdirSync(path.dirname(MEMORY_JSON_PATH), { recursive: true });
      }
      fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fsErr) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}