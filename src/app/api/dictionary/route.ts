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
    
    // 隣に「03_Memory」フォルダが物理実在する場合のみローカル環境と判定
    const isLocalEnv = fs.existsSync(path.join(process.cwd(), "..", "03_Memory"));
    const isCloudEnv = !isLocalEnv;

    // 🌐 クラウド環境、またはローカルPCに物理ファイルが存在しない場合はBlobから最新データをフェッチ
    if ((isCloudEnv || !fs.existsSync(dictPath)) && token) {
      const { blobs } = await list({ token });
      const dictBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary"));

      if (dictBlobs.length > 0) {
        dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
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

    // 🏠 ローカル環境：社内PC内の物理ディスクを安全スキャン
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
    const isLocalEnv = fs.existsSync(path.join(process.cwd(), "..", "03_Memory"));

    // 🏠 1. ローカルPC環境での実行なら、確実に物理ディスク（03_Memory）へ即時永続書き込み
    if (isLocalEnv) {
      const dirname = path.dirname(dictPath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      fs.writeFileSync(dictPath, jsonString, "utf-8");
    }

    // 🌐 2. トークンが実在する場合、実行環境（ローカル/クラウド）を問わず本番Blobストレージへ常時二重ミラーリング保存！！！
    if (token) {
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
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}