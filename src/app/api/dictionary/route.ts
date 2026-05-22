import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

// 💡 宇宙絶対規律：Next.jsの全キャッシュ機構を根底から物理的に全パージ
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// 💡 規律：社内PC（ローカル環境）での物理パス
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// 💡 規律：前方一致で手動ファイルも乱数付きファイルも確実に巻き取るための検索プレフィックス
const BLOB_SEARCH_PREFIX = "mimir_dictionary";
const BLOB_FILENAME = "mimir_dictionary.json";

// 📡 Vercelのインフラ上で動いている時だけ確実にtrueになる一撃判定
const isCloud = process.env.VERCEL === "1";

const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    // 🌐 クラウド環境、かつVercel Blobのトークンが生存している場合のみストレージをスキャン
    if (isCloud && process.env.BLOB_READ_WRITE_TOKEN) {
      const { blobs } = await list();
      
      // 💡 改善：".json" を除外したプレフィックスで判定し、手動アップロードファイルも乱数付きも100%全捕捉！！！
      const dictBlobs = blobs.filter(b => b.pathname.startsWith(BLOB_SEARCH_PREFIX));

      if (dictBlobs.length > 0) {
        // アップロード日時が最も新しいデータを最優先ソート
        dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        const res = await fetch(dictBlobs[0].url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      }
    }
    
    // 🏠 ローカル環境、またはクラウド側でTokenがまだ未設定の時の安全なフォールバック
    // 外部通信に依存せず、常に手元の物理ファイルを最速スキャンするため絶対に画面がフリーズしません
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

    // 🌐 クラウド環境、かつトークン生存時のみBlobへ直接保存
    if (isCloud && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(BLOB_FILENAME, jsonString, {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
      });

      // 古い残骸の掃討
      try {
        const { blobs } = await list();
        const oldBlobs = blobs.filter(b => b.pathname.startsWith(BLOB_SEARCH_PREFIX) && b.url !== blob.url);
        if (oldBlobs.length > 0) {
          await del(oldBlobs.map(b => b.url));
        }
      } catch (e) { /* 残骸パージエラーは安全にスルー */ }

      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // 🏠 ローカルPC環境：確実に03_Memoryの物理ディスクへ即時永続書き込み
      ensureDirectoryExists(dictPath);
      fs.writeFileSync(dictPath, jsonString, "utf-8");
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}