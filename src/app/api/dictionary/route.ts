import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

// 💡 宇宙絶対規律：APIが静的コンパイルの檻に閉じ込められるのを100%永久パージ
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// 💡 規律：社内PC（ローカル環境）でのPython側のMIMIR（03_Memory）の絶対座標
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");
const BLOB_FILENAME = "mimir_dictionary.json";

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    // 👑 【物理絶対判定】気まぐれな環境変数を完全パージ！
    // 隣に「03_Memory」フォルダが物理実在する場合のみローカルと見なし、それ以外は100%クラウドと判定する超自動防壁！！！
    const isLocalEnv = fs.existsSync(path.join(process.cwd(), "..", "03_Memory"));
    const isCloudEnv = !isLocalEnv;

    if (isCloudEnv && token) {
      // 🌐 クラウドランタイム：トークンを使ってPrivateストア内のファイル一覧をフェッチ
      const { blobs } = await list({ token });
      const dictBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary"));

      if (dictBlobs.length > 0) {
        // アップロード日時が最も新しいデータを最優先ソート
        dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        // 💡 核心：Privateファイルへのアクセス権を得るため、fetch時のヘッダーにBlobトークンを直接装填して強行突破！！！
        const res = await fetch(dictBlobs[0].url, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      }
    }

    // 🏠 ローカルランタイム：社内PC内の物理ディスクを安全スキャン
    if (fs.existsSync(dictPath)) {
      const data = fs.readFileSync(dictPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }

    return NextResponse.json({ master_partners: [] });
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    return NextResponse.json({ master_partners: [] });
  }
}

// 辞書データの書き込み・永続保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jsonString = JSON.stringify(body, null, 2);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    // 👑 【物理絶対判定】POST側もフォルダの実在ファクトのみで100%安全に仕分ける！！！
    const isLocalEnv = fs.existsSync(path.join(process.cwd(), "..", "03_Memory"));
    const isCloudEnv = !isLocalEnv;

    if (isCloudEnv && token) {
      // 🌐 クラウドランタイム：💡 accessを "private" へ絶対変更し、Privateストアの規律に完全適合！！！
      const blob = await put(BLOB_FILENAME, jsonString, {
        access: "private", 
        addRandomSuffix: true,
        contentType: "application/json",
        token
      });

      // 過去の乱数付き残骸ファイルをバックグラウンドで一斉掃討
      try {
        const { blobs } = await list({ token });
        const oldBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary") && b.url !== blob.url);
        if (oldBlobs.length > 0) {
          await del(oldBlobs.map(b => b.url), { token });
        }
      } catch (e) { /* スルー */ }

      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // 🏠 ローカルランタイム：確実に社内PCの物理ディスク（03_Memory）へ即時永続書き込み
      const dirname = path.dirname(dictPath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(dictPath, jsonString, "utf-8");
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}