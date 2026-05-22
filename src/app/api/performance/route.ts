import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    
    // 💡 最終調停：Vercel Blobの履歴の中から、最新のアップロード順（降順）にソートして「最も新しい本物のデータ」を正確に掴む！
    const sortedBlobs = blobList.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const targetBlob = sortedBlobs.find(b => b.pathname === "vlh_normalized_performance.json");

    if (targetBlob) {
      const res = await fetch(targetBlob.url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    }

    // 安全フォールバック：ローカルのバックアップJSON
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