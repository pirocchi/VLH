import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { put, list } from "@vercel/blob";

const execAsync = promisify(exec);

const ASP_FOLDER_MAP: Record<string, string> = {
  "A8.net": "a8",
  "afb": "afb",
  "AccessTrade": "at",
  "felmat": "flm",
  "もしもアフィリエイト": "msm",
  "QUORIZa": "quo"
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    let files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      files = formData.getAll("file") as File[];
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    const CONSOLE_ROOT = process.cwd();
    const tmpDir = path.join(CONSOLE_ROOT, "..", "03_Memory", "TMP_LAUNCH_PAD");

    // 💡 安全弁：Vercelサーバーレス（Read-Only）環境でも絶対にクラッシュしない一時領域の調停
    const runtimeTmpDir = fs.existsSync("/tmp") ? "/tmp" : tmpDir;
    if (!fs.existsSync(runtimeTmpDir) && runtimeTmpDir !== "/tmp") {
      fs.mkdirSync(runtimeTmpDir, { recursive: true });
    }

    let totalProcessedRows = 0;
    let combinedNormalizedList: any[] = [];

    // 🏰 既存のデータをクラウド（vlh-memory）から一度ダウンロードしてマージ・蓄積する規律
    try {
      const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const targetBlob = blobList.blobs.find(b => b.pathname === "vlh_normalized_performance.json");
      if (targetBlob) {
        const blobRes = await fetch(targetBlob.url, { cache: "no-store" });
        if (blobRes.ok) {
          const oldData = await blobRes.json();
          if (Array.isArray(oldData)) {
            combinedNormalizedList = [...oldData];
          }
        }
      }
    } catch (blobError) {
      console.log("既存のクラウドメモリが不在、または初回起動のため新規作成します。");
    }

    for (const file of files) {
      // ファイル名から YYYYMMDD の8桁数字を自動サルベージ
      const dateMatch = file.name.match(/\d{8}/);
      const YYYYMMDD = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10).replace(/-/g, "");

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeTmpPath = path.join(runtimeTmpDir, `vhl_upload_${Date.now()}.csv`);
      fs.writeFileSync(safeTmpPath, buffer);

      const escapedPath = safeTmpPath.replace(/\\/g, "/");
      const servicePath = path.join(CONSOLE_ROOT, "..", "02_Services").replace(/\\/g, "/");
      
      // ブリュンヒルド自動解析エンジンのキック
      const execCommand = `python -c "import sys, json; sys.path.append('${servicePath}'); from brynhild import BrynhildInjector; inj = BrynhildInjector(); print(json.dumps(inj.detect_and_parse('${escapedPath}')))"`;
      
      const { stdout, stderr } = await execAsync(execCommand);
      if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

      if (stderr && !stdout) continue;

      const parsedRows = JSON.parse(stdout.trim());
      if (Array.isArray(parsedRows) && parsedRows.length > 0) {
        const detectedAsp = parsedRows[0].asp || "その他";
        const folderName = ASP_FOLDER_MAP[detectedAsp] || "others";
        
        // 🏛️ ローカル保存（環境がローカルPCであればバックアップとして仕分け格納。クラウド環境なら安全に無視）
        try {
          const archiveAspDir = path.join(CONSOLE_ROOT, "..", "03_Memory", folderName);
          if (!fs.existsSync(archiveAspDir)) fs.mkdirSync(archiveAspDir, { recursive: true });
          const finalArchivedPath = path.join(archiveAspDir, `${YYYYMMDD}.csv`);
          fs.writeFileSync(finalArchivedPath, buffer);
        } catch (localWriteErr) {
          // クラウド環境における書き込み拒絶は完全に想定内のためスルー
        }

        // 💡 改善：データ重複排除マージエンジン（同じ日・同じASP・同じメディアIDがあれば最新データで上書き更新）
        parsedRows.forEach(newRow => {
          const duplicateIndex = combinedNormalizedList.findIndex(oldRow => 
            oldRow.date === newRow.date &&
            oldRow.asp === newRow.asp &&
            oldRow.media_id === newRow.media_id &&
            oldRow.media_name === newRow.media_name
          );

          if (duplicateIndex !== -1) {
            combinedNormalizedList[duplicateIndex] = newRow; // 既存行の更新
          } else {
            combinedNormalizedList.push(newRow); // 新規行のスタック
          }
        });

        totalProcessedRows += parsedRows.length;
      }
    }

    // 🚀 核心：名寄せされた大統一JSONデータを、新設された『vlh-memory』へ直接上書き打ち上げ！！！
    if (combinedNormalizedList.length > 0) {
      await put("vlh_normalized_performance.json", JSON.stringify(combinedNormalizedList, null, 2), {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      // ローカル環境用のバックアップJSON書き込み
      try {
        const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
        fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
      } catch (e) {}
    }

    return NextResponse.json({ success: true, rows_stacked: totalProcessedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}