import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const CONSOLE_ROOT = process.cwd();
const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
const CONSOLE_JSON_PATH = path.join(CONSOLE_ROOT, "vlh_normalized_performance.json");

// 👑 絶対規律：ASPごとのカオスな生データを「税込グロス」「税込ネット」に強制正規化する神の関数
const getNormalizedCosts = (asp: string, rawReward: number) => {
  if (!rawReward) return { grossInc: 0, netInc: 0 };
  
  if (asp === "A8.net") {
    // ネット税抜を税込化し、マージン（約25%乗せ）でグロス税込を算出
    const netInc = rawReward * 1.1;
    return { grossInc: netInc * 1.25, netInc: netInc }; 
  } else if (asp === "もしもアフィリエイト") {
    // ネット税抜を税込化。グロスはW報酬無視の規定1.3倍
    const netInc = rawReward * 1.1;
    return { grossInc: rawReward * 1.3 * 1.1, netInc: netInc };
  } else if (asp === "QUORIZa") {
    // 特殊案件用（手動設定値）。そのまま税込グロスとし、ネットは0.8で逆算
    return { grossInc: rawReward, netInc: rawReward * 0.8 };
  } else {
    // afb, AccessTrade, felmat 等のグロス税抜
    const grossInc = rawReward * 1.1;
    return { grossInc: grossInc, netInc: grossInc / 1.25 };
  }
};

export async function GET() {
  try {
    const blobList = await list({ 
      prefix: "vlh_normalized_performance.json",
      token: process.env.BLOB_READ_WRITE_TOKEN 
    });
    
    const targetBlob = blobList.blobs[0];
    
    if (targetBlob) {
      const blobRes = await fetch(targetBlob.url, { 
        cache: "no-store",
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
      });

      if (blobRes.ok) {
        const data = await blobRes.json();
        
        // 🚀 核心：フロントへ渡す前に全データを絶対正規化！
        const enhancedData = data.map((row: any) => {
          const costs = getNormalizedCosts(row.asp, row.issued_reward);
          return { ...row, normalized_gross: costs.grossInc, normalized_net: costs.netInc };
        });

        try {
          if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
            fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(enhancedData, null, 2), "utf-8");
          }
          if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) {
            fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(enhancedData, null, 2), "utf-8");
          }
        } catch (fsErr) {}

        return NextResponse.json(enhancedData);
      }
    }
  } catch (e: any) {
    console.error("❌ Vercel Blobからのデータ取得に失敗:", e.message);
  }

  if (fs.existsSync(MEMORY_JSON_PATH)) {
    const localData = JSON.parse(fs.readFileSync(MEMORY_JSON_PATH, "utf-8"));
    const enhancedData = localData.map((row: any) => {
      const costs = getNormalizedCosts(row.asp, row.issued_reward);
      return { ...row, normalized_gross: costs.grossInc, normalized_net: costs.netInc };
    });
    return NextResponse.json(enhancedData);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: "Invalid data format." }, { status: 400 });

    await put("vlh_normalized_performance.json", JSON.stringify(data, null, 2), {
      access: "private", addRandomSuffix: false, allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    
    try {
      if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
      if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (fsErr) {}

    return NextResponse.json({ success: true, synced_rows: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}