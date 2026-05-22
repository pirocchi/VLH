import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

// 💡 宇宙絶対規律：APIが静的ファイルにコンパイルされるのを100%永久パージ
export const dynamic = "force-dynamic";

// 💡 規律：Python側のMIMIR（03_Memory）と100%同じファイルを完全共有する絶対座標（ローカルバックアップ用）
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// 💡 規律：Vercel Blobで管理する永続辞書の固定オブジェクト名
const BLOB_FILENAME = "mimir_dictionary.json";

// ディレクトリ自動生成の安全弁
const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    // 🌐 規律：ローカル・クラウド問わず、全宇宙から Vercel Blob の中央データバンクをリストアップ！
    const { blobs } = await list();
    const dictBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary"));

    if (dictBlobs.length > 0) {
      // 💡 核心：アップロード日時が最も新しい「純度100%の最新データ」をソート
      dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      // 最新のBlobからキャッシュを完全バイパス（no-store）して強制フェッチ！
      const res = await fetch(dictBlobs[0].url, { cache: "no-store" });
      if (!res.ok) return NextResponse.json({ master_partners: [] });
      const data = await res.json();

      // 🏠 ローカルPC環境への優しさ：Blobから引いた最新データを、ローカルの物理ファイルへ自動的にバックアップ同期ダウンロード！
      // これにより裏側のPython（ブリュンヒルド）も常に最新の紐付けをファイル経由で100%捕捉可能になります！
      if (process.env.VERCEL !== "1") {
        ensureDirectoryExists(dictPath);
        fs.writeFileSync(dictPath, JSON.stringify(data, null, 2), "utf-8");
      }

      return NextResponse.json(data);
    } else {
      // 🌋 【初回自動打ち上げマイグレーション回路】
      // もしBlob側が空っぽで、ローカルPC内に既存のJSONが存在する場合、自動でBlobへアップロード！
      if (process.env.VERCEL !== "1" && fs.existsSync(dictPath)) {
        console.log("🚀 [MIGRATION] ローカルの紐付け資産を検知。Vercel Blobへ自動打ち上げを開始します...");
        const localData = fs.readFileSync(dictPath, "utf-8");
        const parsed = JSON.parse(localData);

        await put(BLOB_FILENAME, localData, {
          access: "public",
          addRandomSuffix: true,
          contentType: "application/json",
        });

        return NextResponse.json(parsed);
      }

      // Blobにもローカルにも何も無い完全初期状態の救済
      return NextResponse.json({ master_partners: [] });
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

    // 🌐 1. ローカルだろうがクラウドだろうが、新しい保存データは「中央データバンク（Vercel Blob）」へ直接put！！！
    const blob = await put(BLOB_FILENAME, jsonString, {
      access: "public",
      addRandomSuffix: true, // CDNキャッシュを破壊するためURLを毎回変動させる
      contentType: "application/json",
    });

    // 🏠 2. ローカルPC環境であれば、社内PCの物理ディスク（03_Memory）へも同時にミラーリング書き込み！
    if (process.env.VERCEL !== "1") {
      ensureDirectoryExists(dictPath);
      fs.writeFileSync(dictPath, jsonString, "utf-8");
    }

    // 🧹 3. 過去の古いゴミURLの残骸をストレージから非同期で一斉掃討
    try {
      const { blobs } = await list();
      const oldBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary") && b.url !== blob.url);
      if (oldBlobs.length > 0) {
        await del(oldBlobs.map(b => b.url));
      }
    } catch (purgeError) {
      console.error("🚨 Old blobs purge error:", purgeError);
    }

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}