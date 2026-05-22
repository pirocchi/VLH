import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

// 💡 宇宙絶対規律：APIが静的ファイルにコンパイルされるのを100%永久パージ
export const dynamic = "force-dynamic";

// 💡 規律：社内PC（ローカル環境）でのPython側のMIMIR（03_Memory）の絶対座標
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// 💡 規律：Vercel Blob（クラウド環境）で管理する永続辞書の固定オブジェクト名
const BLOB_FILENAME = "mimir_dictionary.json";

// 📡 核心：Vercelのインフラ上で動いている時だけ確実にtrueになる一撃判定！
const isCloud = process.env.VERCEL === "1";

// ディレクトリ自動生成の安全弁（ローカル用）
const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    if (isCloud) {
      // 🌐 クラウド環境（Vercel）：ディレクトリが違うため、Blobストレージからのみクリーンにフェッチ！
      const { blobs } = await list();
      const dictBlobs = blobs.filter(b => b.pathname.startsWith(BLOB_FILENAME));

      if (dictBlobs.length === 0) {
        return NextResponse.json({ master_partners: [] });
      }

      // アップロード日時が最も新しいデータをソートしてフェッチ
      dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const res = await fetch(dictBlobs[0].url, { cache: "no-store" });
      if (!res.ok) return NextResponse.json({ master_partners: [] });
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      // 🏠 ローカル環境（社内PC）：外部通信を一切遮断！！！100%安全に物理ディスクのみを読み込み！！！
      // これにより、環境変数の有無や通信ラグによるローカル無効化バグが宇宙から完全消滅します！
      if (!fs.existsSync(dictPath)) {
        return NextResponse.json({ master_partners: [] });
      }
      const data = fs.readFileSync(dictPath, "utf-8");
      return NextResponse.json(JSON.parse(data));
    }
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

    if (isCloud) {
      // 🌐 クラウド環境（Vercel）：Blobへ直接上書き保存を執行！
      const blob = await put(BLOB_FILENAME, jsonString, {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
      });

      // 過去の古い残骸を非同期で掃討
      try {
        const { blobs } = await list();
        const oldBlobs = blobs.filter(b => b.pathname.startsWith(BLOB_FILENAME) && b.url !== blob.url);
        if (oldBlobs.length > 0) {
          await del(oldBlobs.map(b => b.url));
        }
      } catch (e) { /* ログ省略 */ }

      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // 🏠 ローカル環境（社内PC）：確実に03_Memoryの物理ディスクへ即時永続書き込み！！！
      // これにより、福本様たちの社内PCでの運用とPython（ブリュンヒルド）の互換性を絶対死守します！
      ensureDirectoryExists(dictPath);
      fs.writeFileSync(dictPath, jsonString, "utf-8");

      // 💡 ミラーリングパルス：もしローカルの.env等にBlobトークンがある場合のみ、バックグラウンドでクラウド側にも同期を試みる（無ければ安全にスルー）
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          await put(BLOB_FILENAME, jsonString, { access: "public", addRandomSuffix: true, contentType: "application/json" });
        } catch (e) { console.error("🚨 Cloud mirroring skipped"); }
      }

      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}