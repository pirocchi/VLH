import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BLOB_FILENAME = "mimir_dictionary.json";

// OS標準変数からローカル絶対座標をクリーンに割り出す
const getDictPath = () => {
  if (process.env.LOCAL_MEMORY_PATH) return process.env.LOCAL_MEMORY_PATH;
  const homeDir = process.env.USERPROFILE || "C:\\Users\\Watanabe_2025";
  return path.join(homeDir, "Desktop", "script", "py", "VLH", "03_Memory", "mimir_dictionary.json");
};

// 👑 PM2の環境変数ロスト対策：ローカルの.envファイルから直接トークン類を物理抽出する防衛回路
const getCredentials = () => {
  let token = process.env.BLOB_READ_WRITE_TOKEN;
  let storeId = process.env.BLOB_STORE_ID;

  if (!token || !storeId) {
    const homeDir = process.env.USERPROFILE || "C:\\Users\\Watanabe_2025";
    const envPath = path.join(homeDir, "Desktop", "script", "py", "VLH", "06_Console", ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const tokenMatch = envContent.match(/BLOB_READ_WRITE_TOKEN=["']?([^"'\r\n]+)/);
      const storeIdMatch = envContent.match(/BLOB_STORE_ID=["']?([^"'\r\n]+)/);
      if (tokenMatch) token = tokenMatch[1];
      if (storeIdMatch) storeId = storeIdMatch[1];
    }
  }
  return { token, storeId };
};

export async function GET() {
  try {
    const { token, storeId } = getCredentials();
    const dictPath = getDictPath();
    const canWriteLocal = fs.existsSync(path.dirname(dictPath));

    // 1. ローカル物理データのサルベージ
    let localData: any = null;
    if (canWriteLocal && fs.existsSync(dictPath)) {
      try {
        localData = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
      } catch (e) {
        localData = { master_partners: [] };
      }
    }

    // 2. クラウド（Blob）データのサルベージ
    let cloudData: any = null;
    if (token && storeId) {
      const { blobs } = await list({ token, storeId });
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      if (targetBlob) {
        const res = await fetch(`${targetBlob.url}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          cloudData = await res.json();
        }
      }
    }

    // Vercel本番環境（ローカルパスの実在しない環境）からのアクセスの場合はクラウドデータを即返却
    const isCloudEnv = !canWriteLocal;
    if (isCloudEnv) {
      return NextResponse.json(cloudData || { master_partners: [] });
    }

    // 3. 【真のデータ内部タイムスタンプ照合シンク】
    let finalData = { master_partners: [] };
    const localTime = localData?.updated_at || 0;
    const cloudTime = cloudData?.updated_at || 0;

    if (localData && cloudData) {
      if (cloudTime > localTime) {
        // クラウド（モバイル）側が真に新しい場合のみ、ローカルへ安全に書き戻す
        finalData = cloudData;
        fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
      } else if (localTime > cloudTime) {
        // ローカル側が真に新しい場合は、本番Blobへ強制ミラーアップロードして同期を上書き適用！！！
        finalData = localData;
        if (token && storeId) {
          await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { 
            access: "private", 
            addRandomSuffix: false, 
            allowOverwrite: true, 
            token, 
            storeId 
          });
        }
      } else {
        finalData = localData;
      }
    } else if (localData && !cloudData) {
      // クラウドがまだ空の場合は、手元のデータを本番へ強制再チャージ！！！
      finalData = localData;
      if (token && storeId) {
        await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { 
          access: "private", 
          addRandomSuffix: false, 
          allowOverwrite: true, 
          token, 
          storeId 
        });
      }
    } else if (!localData && cloudData) {
      finalData = cloudData;
      fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
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
    
    // 👑 宇宙絶対規律：保存が走った「その瞬間」の確定UnixタイムスタンプをJSON内部に直接刻印！！！
    body.updated_at = Date.now();
    const jsonString = JSON.stringify(body, null, 2);

    const { token, storeId } = getCredentials();
    const dictPath = getDictPath();
    const canWriteLocal = fs.existsSync(path.dirname(dictPath));

    // 🏠 ローカルが実在すれば確実に書き込み
    if (canWriteLocal) {
      fs.writeFileSync(dictPath, jsonString, "utf-8");
    }

    // 🌐 トークンとストアIDがあれば、実行環境を問わず確実に本番クラウドへミラー上書き書き込み！！！
    if (token && storeId) {
      await put(BLOB_FILENAME, jsonString, { 
        access: "private", 
        addRandomSuffix: false, 
        allowOverwrite: true, 
        token, 
        storeId 
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Dictionary POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}