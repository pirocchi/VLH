import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 🚀 核心：クラウド要塞『vlh-memory』の目録から最新の名寄せJSONの直URLを特定
    const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const targetBlob = blobList.blobs.find(b => b.pathname === "vlh_normalized_performance.json");

    if (targetBlob) {
      // 秘密のURLから中身の純化データを直接ダウンロード（キャッシュを殺して常に最新化）
      const res = await fetch(targetBlob.url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }

    // 💡 安全弁：万が一クラウド側にまだデータが無い場合は、ローカルのバックアップJSONを読みに行くフォールバック規律
    const CONSOLE_ROOT = process.cwd();
    const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
    
    if (fs.existsSync(MEMORY_JSON_PATH)) {
      const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
      return NextResponse.json(JSON.parse(localData));
    }

    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}