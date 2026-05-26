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

// 辞書データのサルベージ（読み込み・兼ローカルへの逆方向自動同期）
export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const isLocalEnv = fs.existsSync(path.join(process.cwd(), "..", "03_Memory"));

    // 🌐 トークンが存在する場合、実行環境を問わず、常にクラウド（Blob）上の最新マスタデータを最優先スキャン！！！
    if (token) {
      const { blobs } = await list({ token });
      const dictBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary"));

      if (dictBlobs.length > 0) {
        // アップロード日時が最も新しいデータを最優先ソート
        dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        // Privateファイルへのアクセス権を得て強行突破
        const res = await fetch(dictBlobs[0].url, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (res.ok) {
          const cloudData = await res.json();
          
          // 👑 【第3戦区・逆方向自動同期の覚醒】
          // ローカルPC環境での実行であれば、クラウドから吸い上げた最新の神データを、
          // その場で社内PCの物理ディスク（03_Memory）へ100%完全自動で上書き保存（ミラーバック）を執行！！！
          if (isLocalEnv) {
            const dirname = path.dirname(dictPath);
            if (!fs.existsSync(dirname)) {
              fs.mkdirSync(dirname, { recursive: true });
            }
            fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
          }
          
          return NextResponse.json(cloudData);
        }
      }
    }

    // 🏠 フォールバック：Blobストアが空、またはオフライン通信障害時のみ、ローカルの物理ディスクデータをスキャン
    if (fs.existsSync(dictPath)) {
      const data = fs.readFileSync(dictPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }

    return NextResponse.json({ master_partners: [] });
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    // 🛡️ 最深部防衛：万が一通信が一時遮断されても、ローカルPC内の既存ファイルを最終防衛ラインとして返却
    if (fs.existsSync(dictPath)) {
      const data = fs.readFileSync(dictPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }
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

    // 🌐 2. トークンが実在する場合、実行環境を問わず本番Blobストレージへ常時二重ミラーリング保存
    if (token) {
      const blob = await put(BLOB_FILENAME, jsonString, {
        access: "private", 
        addRandomSuffix: true,
        contentType: "application/json",
        token
      });

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