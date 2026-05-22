import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic"; // 💡 規律：Vercel上でのキャッシュの檻をパージし、常に最新のBlobを強制ロード！

export async function GET() {
  console.log("=== 📡 VLH DATA RETRIEVAL PULSE STARTED ===");
  try {
    // 1. クラウド（Vercel Blob）の Private 独立倉庫へアクセス
    const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    
    const sortedBlobs = blobList.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const targetBlob = sortedBlobs.find(b => b.pathname === "vlh_normalized_performance.json");

    if (targetBlob) {
      console.log(`🌐 最新のクラウド大統一JSONを検知: ${targetBlob.url}`);
      
      // 💡 核心：Private倉庫から中身を安全に引き出すため、ヘッダーに BLOB_READ_WRITE_TOKEN 通行証を完全装填！！！
      const res = await fetch(targetBlob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        },
        cache: "no-store"
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✓ クラウドBlobから成果データ（${Array.isArray(data) ? data.length : 0}件）の抽出に完全成功しました！`);
        return NextResponse.json(data);
      } else {
        console.error(`❌ Blobフェッチエラー: ステータス ${res.status}`);
      }
    }

    // 2. 安全フォールバック：ローカルの物理バックアップJSON
    console.log("🏠 クラウドBlobが不在、または取得失敗のためローカル物理JSONのサルベージを開始します。");
    const CONSOLE_ROOT = process.cwd();
    const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
    
    if (fs.existsSync(MEMORY_JSON_PATH)) {
      const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
      const data = JSON.parse(localData);
      console.log(`✓ ローカル物理メモリから成果データ（${Array.isArray(data) ? data.length : 0}件）のサルベージに成功。`);
      return NextResponse.json(data);
    }

    console.warn("⚠ 警告：クラウド・ローカルともに有効な成果JSONメモリが0件です。");
    return NextResponse.json([]);
  } catch (error: any) {
    console.error("❌ データ取得 API 致命的大破:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}