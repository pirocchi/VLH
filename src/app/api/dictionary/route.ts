import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BLOB_FILENAME = "mimir_dictionary.json";

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID; // 👑 最高司令官の指摘通り、ストアIDを環境変数から召喚！！！
    const localDictPath = process.env.LOCAL_MEMORY_PATH; 
    
    const isLocalEnv = !!localDictPath && fs.existsSync(localDictPath);
    const isCloudEnv = !isLocalEnv;

    let cloudData = null;
    let cloudDate = new Date(0);

    // 🌐 1. トークンとストアIDのダブルキーでクラウド（Blob）の最新状況をチェック
    if (token && storeId) {
      // 💡 listメソッドに token と storeId をペアで渡し、Privateストアを厳格に指定！
      const { blobs } = await list({ token, storeId });
      const dictBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary"));
      if (dictBlobs.length > 0) {
        dictBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        cloudDate = new Date(dictBlobs[0].uploadedAt);
        const res = await fetch(dictBlobs[0].url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
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
    const storeId = process.env.BLOB_STORE_ID; // 👑 ストアIDを召喚
    const localDictPath = process.env.LOCAL_MEMORY_PATH;
    const isLocalEnv = !!localDictPath;
    const isCloudEnv = !isLocalEnv;

    if (isCloudEnv) {
      // 🌐 クラウドからの保存
      if (token && storeId) {
        // 💡 putメソッドに token と storeId のダブルキーを装填！！！
        const blob = await put(BLOB_FILENAME, jsonString, { access: "private", addRandomSuffix: true, token, storeId });
        try {
          const { blobs } = await list({ token, storeId });
          const oldBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary") && b.url !== blob.url);
          if (oldBlobs.length > 0) {
            // 💡 delメソッドにも token と storeId のダブルキーを装填！！！
            await del(oldBlobs.map(b => b.url), { token, storeId });
          }
        } catch (e) { /* スルー */ }
        return NextResponse.json({ success: true, url: blob.url });
      }
    } else {
      // 🏠 ローカルPCからの保存: 絶対座標ディスクへ書き込み ＋ クラウドへ二重ミラーリング
      if (localDictPath) {
        const dir = path.dirname(localDictPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localDictPath, jsonString, "utf-8");
      }

      if (token && storeId) {
        const blob = await put(BLOB_FILENAME, jsonString, { access: "private", addRandomSuffix: true, token, storeId });
        try {
          const { blobs } = await list({ token, storeId });
          const oldBlobs = blobs.filter(b => b.pathname.startsWith("mimir_dictionary") && b.url !== blob.url);
          if (oldBlobs.length > 0) {
            await del(oldBlobs.map(b => b.url), { token, storeId });
          }
        } catch (e) { /* スルー */ }
      }
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: "No valid environment or missing Blob credentials" }, { status: 400 });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}