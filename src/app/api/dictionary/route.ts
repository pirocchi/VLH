import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

// 💡 宇宙絶対規律：Next.jsの「全キャッシュ機構」を根底から物理的に全パージする3連絶対命令！！！
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// 💡 規律：社内PC（ローカル環境）でのPython側のMIMIR（03_Memory）の絶対座標
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// 💡 規律：Vercel Blob（クラウド環境）で管理する永続辞書の固定オブジェクト名
const BLOB_FILENAME = "mimir_dictionary.json";

// 📡 核心：Vercelのインフラ上で動いている時だけ確実にtrueになる一撃判定！
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
    if (isCloud) {
      // 🌐 クラウド環境（Vercel）：3連絶対命令により、毎回100%リアルタイムにBlobの最新リストをスキャン！
      const { blobs } = await list();
      const dictBlobs = blobs.filter(b => b.pathname.startsWith(BLOB_FILENAME));

      if (dictBlobs.length === 0) {
        return NextResponse.json({ master_partners: [] });
      }

      // アップロード日時が最も新しいデータをソートしてフェッチ（cache: "no-store" を徹底装填）
      dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const res = await fetch(dictBlobs[0].url, { cache: "no-store" });
      if (!res.ok) return NextResponse.json({ master_partners: [] });
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      // 🏠 ローカル環境（社内PC）：外部通信を一切遮断し、100%安全に物理ディスクのみを読み込み！
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
      } catch (e) { /* 省略 */ }

      return NextResponse.json({ success: true, url: blob.url });
    } else {
      // 🏠 ローカル環境（社内PC）：確実に03_Memoryの物理ディスクへ即時永続書き込み！
      ensureDirectoryExists(dictPath);
      fs.writeFileSync(dictPath, jsonString, "utf-8");
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}