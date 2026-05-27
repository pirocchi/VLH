import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob"; // 👑 危険な del はインポートすら完全大粛清！！！

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BLOB_FILENAME = "mimir_dictionary.json";

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID; 
    const localDictPath = process.env.LOCAL_MEMORY_PATH; 
    
    const isLocalEnv = !!localDictPath && fs.existsSync(localDictPath);
    const isCloudEnv = !isLocalEnv;

    let cloudData = null;
    let cloudDate = new Date(0);

    // 🌐 1. トークンとストアIDのダブルキーでクラウド（Blob）の最新状況をチェック
    if (token && storeId) {
      const { blobs } = await list({ token, storeId });
      // 👑 固定URL運用のため、サフィックス前方一致ではなく完全一致で狙い撃ち
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      
      if (targetBlob) {
        cloudDate = new Date(targetBlob.uploadedAt);
        const res = await fetch(targetBlob.url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) cloudData = await res.json();
      }
    }

    if (isCloudEnv) {
      return NextResponse.json(cloudData || { master_partners: [] });
    }

    // 🏠 2. ローカルPC環境からのアクセス処理
    let localData = { master_partners: [] };
    let localDate = new Date(0);
    
    if (localDictPath && fs.existsSync(localDictPath)) {
      localData = JSON.parse(fs.readFileSync(localDictPath, "utf-8"));
      localDate = fs.statSync(localDictPath).mtime;
    }

    // 【双方向シンク】クラウド側が最新かつ空データでない場合のみ、ローカルへ書き戻し
    if (cloudData && cloudData.master_partners && cloudData.master_partners.length > 0) {
      if (cloudDate > localDate && localDictPath) {
        const dir = path.dirname(localDictPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localDictPath, JSON.stringify(cloudData, null, 2), "utf-8");
        return NextResponse.json(cloudData);
      }
    }

    return NextResponse.json(localData);
  } catch (error) {
    console.error("🚨 Dictionary GET Error:", error);
    if (process.env.LOCAL_MEMORY_PATH && fs.existsSync(process.env.LOCAL_MEMORY_PATH)) {
        return NextResponse.json(JSON.parse(fs.readFileSync(process.env.LOCAL_MEMORY_PATH, "utf-8")));
    }
    return NextResponse.json({ master_partners: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jsonString = JSON.stringify(body, null, 2);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID; 
    const localDictPath = process.env.LOCAL_MEMORY_PATH;
    const isLocalEnv = !!localDictPath;
    const isCloudEnv = !isLocalEnv;

    if (isCloudEnv) {
      // 🌐 クラウド（モバイル等）からの保存
      if (token && storeId) {
        // 👑 【絶対安全】addRandomSuffixをfalseにし、同一URLへの確実な「単一上書き」へと仕様変更！！！
        const blob = await put(BLOB_FILENAME, jsonString, { 
          access: "private", 
          addRandomSuffix: false, // 乱数サフィックスを完全パージ
          token, 
          storeId 
        });
        return NextResponse.json({ success: true, url: blob.url });
      }
    } else {
      // 🏠 ローカルPCからの保存：環境変数の絶対座標ディスクへ書き込み ＋ クラウドへ上書きミラーリング！
      if (localDictPath) {
        const dir = path.dirname(localDictPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localDictPath, jsonString, "utf-8");
      }

      if (token && storeId) {
        // 👑 ローカル側からのミラーリング時も、サフィックスなしの上書き保存で完全安全化！
        await put(BLOB_FILENAME, jsonString, { 
          access: "private", 
          addRandomSuffix: false, 
          token, 
          storeId 
        });
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: "No environment matched" }, { status: 400 });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}