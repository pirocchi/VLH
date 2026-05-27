import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BLOB_FILENAME = "mimir_dictionary.json";

const getDictPath = () => {
  if (process.env.LOCAL_MEMORY_PATH) return process.env.LOCAL_MEMORY_PATH;
  const homeDir = process.env.USERPROFILE || "C:\\Users\\Watanabe_2025";
  return path.join(homeDir, "Desktop", "script", "py", "VLH", "03_Memory", "mimir_dictionary.json");
};

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;
    const dictPath = getDictPath();
    const canWriteLocal = fs.existsSync(path.dirname(dictPath));

    // 🏠 1. ローカル物理データのサルベージ
    let localData = null;
    let localTime = 0;
    if (canWriteLocal && fs.existsSync(dictPath)) {
      localData = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
      localTime = fs.statSync(dictPath).mtimeMs; // ミリ秒単位の更新時刻
    }

    // 🌐 2. クラウド（Blob）データのサルベージ
    let cloudData = null;
    let cloudTime = 0;
    if (token && storeId) {
      const { blobs } = await list({ token, storeId });
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      if (targetBlob) {
        cloudTime = new Date(targetBlob.uploadedAt).getTime();
        
        // 👑 【キャッシュバスター弾】URLの末尾に時刻を付与し、古いCDNキャッシュを完全に粉砕・貫通！！！
        const res = await fetch(`${targetBlob.url}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          cloudData = await res.json();
        }
      }
    }

    // 🛡️ 3. 【最強のスマート照合シンク】中身を比較して正しい方向へ自動修復！
    let finalData = { master_partners: [] };

    if (localData && cloudData) {
      const localStr = JSON.stringify(localData);
      const cloudStr = JSON.stringify(cloudData);

      if (localStr !== cloudStr) {
        // 中身が違う場合のみ、新しい方から古い方へデータを同期・救済する
        if (cloudTime > localTime) {
          finalData = cloudData;
          if (canWriteLocal) fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
        } else {
          finalData = localData;
          if (token && storeId) await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { access: "private", addRandomSuffix: false, token, storeId });
        }
      } else {
        // 中身が全く同じ場合は何もしない（フェイク上書きの防止）
        finalData = localData;
      }
    } else if (localData && !cloudData) {
      // ローカルにあってクラウドに無い（クラウドが消滅した場合の自動復旧）
      finalData = localData;
      if (token && storeId) await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { access: "private", addRandomSuffix: false, token, storeId });
    } else if (!localData && cloudData) {
      // クラウドにあってローカルに無い（PC変更時の自動復旧）
      finalData = cloudData;
      if (canWriteLocal) fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
    }

    return NextResponse.json(finalData);
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    const dictPath = getDictPath();
    if (fs.existsSync(dictPath)) return NextResponse.json(JSON.parse(fs.readFileSync(dictPath, "utf-8")));
    return NextResponse.json({ master_partners: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jsonString = JSON.stringify(body, null, 2);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;
    const dictPath = getDictPath();
    const canWriteLocal = fs.existsSync(path.dirname(dictPath));

    // 🏠 ローカルが実在すれば確実に書き込み
    if (canWriteLocal) {
      fs.writeFileSync(dictPath, jsonString, "utf-8");
    }

    // 🌐 トークンがあれば確実に本番クラウドへ書き込み
    if (token && storeId) {
      await put(BLOB_FILENAME, jsonString, { access: "private", addRandomSuffix: false, token, storeId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}