import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BLOB_FILENAME = "mimir_dictionary.json";

// 👑 ソフトウェア工学の規律：見苦しい直書きをパージし、OS標準変数からローカル絶対座標をクリーンに割り出す！
const getDictPath = () => {
  if (process.env.LOCAL_MEMORY_PATH) return process.env.LOCAL_MEMORY_PATH;
  
  // フォールバック：Windowsの標準ユーザーフォルダー（C:\Users\Watanabe_2025）を動的取得
  const homeDir = process.env.USERPROFILE || "C:\\Users\\Watanabe_2025";
  return path.join(homeDir, "Desktop", "script", "py", "VLH", "03_Memory", "mimir_dictionary.json");
};

// 辞書データのサルベージ（読み込み・兼空っぽクラウドへの自動データ救済充填）
export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID; 
    
    const dictPath = getDictPath();
    // 物理的にWindowsのユーザーフォルダーまたは対象ディレクトリが実在するかでローカル環境を100%確定判定
    const isLocalEnv = fs.existsSync(path.dirname(dictPath)) || fs.existsSync(dictPath);
    const isCloudEnv = !isLocalEnv;

    let cloudData = null;
    let cloudBlobExists = false;

    // 🌐 1. クラウド（Blob）上の最新状況をダブルキーでチェック
    if (token && storeId) {
      const { blobs } = await list({ token, storeId });
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      
      if (targetBlob) {
        cloudBlobExists = true;
        const res = await fetch(targetBlob.url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) cloudData = await res.json();
      }
    }

    // ☁️ Vercel本番環境からのアクセスの場合は、そのままクラウドデータを返す
    if (isCloudEnv) {
      return NextResponse.json(cloudData || { master_partners: [] });
    }

    // 🏠 2. ローカルPC環境（PM2）からのアクセス処理
    let localData = { master_partners: [] };
    if (fs.existsSync(dictPath)) {
      localData = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    }

    // 🛡️ 【最高司令官専用：絶対データ救済回路の駆動】
    // ローカルに5件の正規データが存在し、かつクラウド側（Blob）が空っぽ、または未存在の場合：
    const hasLocalContent = localData && localData.master_partners && localData.master_partners.length > 0;
    const isCloudEmpty = !cloudData || !cloudData.master_partners || cloudData.master_partners.length === 0;

    if (hasLocalContent && isCloudEmpty) {
      if (token && storeId) {
        // 👑 GETのタイミングであっても、手元の5件の正義データを本番Blobストレージへ緊急自動チャージ（ミラー射出）！！！
        await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { 
          access: "private", 
          addRandomSuffix: false, 
          token, 
          storeId 
        });
      }
      return NextResponse.json(localData); // 画面には手元の5件を即座に表示
    }

    // 🔄 通常の双方向同期：クラウド側に正当なデータが実在する場合のみローカルへ安全に書き戻す
    if (!isCloudEmpty && cloudData) {
      const dir = path.dirname(dictPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
      return NextResponse.json(cloudData);
    }

    return NextResponse.json(localData);
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    const dictPath = getDictPath();
    if (fs.existsSync(dictPath)) {
        return NextResponse.json(JSON.parse(fs.readFileSync(dictPath, "utf-8")));
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
    const storeId = process.env.BLOB_STORE_ID; 
    const dictPath = getDictPath();
    
    const isLocalEnv = fs.existsSync(path.dirname(dictPath)) || fs.existsSync(dictPath);
    const isCloudEnv = !isLocalEnv;

    if (isCloudEnv) {
      // 🌐 クラウドからの保存
      if (token && storeId) {
        const blob = await put(BLOB_FILENAME, jsonString, { access: "private", addRandomSuffix: false, token, storeId });
        return NextResponse.json({ success: true, url: blob.url });
      }
    } else {
      // 🏠 ローカルPCからの保存：クリーン絶対座標ディスクへ書き込み ＋ クラウドへ上書きミラーリング！
      const dir = path.dirname(dictPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dictPath, jsonString, "utf-8");

      if (token && storeId) {
        await put(BLOB_FILENAME, jsonString, { access: "private", addRandomSuffix: false, token, storeId });
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: "No environment matched" }, { status: 400 });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}