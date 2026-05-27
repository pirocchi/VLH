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

    // 1. ローカル物理データのサルベージ
    let localData = null;
    let localTime = 0;
    if (canWriteLocal && fs.existsSync(dictPath)) {
      localData = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
      localTime = fs.statSync(dictPath).mtimeMs;
    }

    // 2. クラウド（Blob）データのサルベージ
    let cloudData = null;
    let cloudTime = 0;
    if (token && storeId) {
      const { blobs } = await list({ token, storeId });
      const targetBlob = blobs.find(b => b.pathname === BLOB_FILENAME);
      if (targetBlob) {
        cloudTime = new Date(targetBlob.uploadedAt).getTime();
        
        const res = await fetch(`${targetBlob.url}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          cloudData = await res.json();
        }
      }
    }

    // 3. 【スマート照合シンク】
    let finalData = { master_partners: [] };

    if (localData && cloudData) {
      const localStr = JSON.stringify(localData);
      const cloudStr = JSON.stringify(cloudData);

      if (localStr !== cloudStr) {
        if (cloudTime > localTime) {
          finalData = cloudData;
          if (canWriteLocal) fs.writeFileSync(dictPath, JSON.stringify(cloudData, null, 2), "utf-8");
        } else {
          finalData = localData;
          // 👑 救済回路のputにも allowOverwrite: true を確実に装填！！！
          if (token && storeId) {
            await put(BLOB_FILENAME, JSON.stringify(localData, null, 2), { 
              access: "private", 
              addRandomSuffix: false, 
              allowOverwrite: true, 
              token, 
              storeId 
            });
          }
        }
      } else {
        finalData = localData;
      }
    } else if (localData && !cloudData) {
      finalData = localData;
      // 👑 救済回路のputに allowOverwrite: true を確実に装填！！！
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
      // 👑 エラーログの指示通り、allowOverwrite: true を100%完璧に装填し、上書きロックを完全粉砕！！！
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