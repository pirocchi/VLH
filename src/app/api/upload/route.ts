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
    const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");

    const runtimeTmpDir = fs.existsSync("/tmp") ? "/tmp" : tmpDir;
    if (!fs.existsSync(runtimeTmpDir) && runtimeTmpDir !== "/tmp") {
      fs.mkdirSync(runtimeTmpDir, { recursive: true });
    }

    let combinedNormalizedList: any[] = [];

    // 🏛️ 絶対ガバナンス：クラウドが初回で空の場合でも、まずはローカルPCの全歴史JSONをベース財産として100%死守ロード！
    if (fs.existsSync(MEMORY_JSON_PATH)) {
      try {
        const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
        const parsedLocal = JSON.parse(localData);
        if (Array.isArray(parsedLocal)) {
          combinedNormalizedList = [...parsedLocal];
        }
      } catch (e) {}
    }

    // クラウド側に最新Blobの歴史があれば、そっちを優先してマージ
    try {
      const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const sortedBlobs = blobList.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const targetBlob = sortedBlobs.find(b => b.pathname === "vlh_normalized_performance.json");
      if (targetBlob) {
        const blobRes = await fetch(targetBlob.url, { cache: "no-store" });
        if (blobRes.ok) {
          const oldData = await blobRes.json();
          if (Array.isArray(oldData) && oldData.length > 0) {
            combinedNormalizedList = [...oldData]; 
          }
        }
      }
    } catch (blobError) {
      console.log("クラウド通信スキップ。ローカル遺産を正として進軍します。");
    }

    let totalProcessedRows = 0;

    for (const file of files) {
      const dateMatch = file.name.match(/\d{8}/);
      const YYYYMMDD = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10).replace(/-/g, "");

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeTmpPath = path.join(runtimeTmpDir, `vhl_upload_${Date.now()}.csv`);
      fs.writeFileSync(safeTmpPath, buffer);

      const escapedPath = safeTmpPath.replace(/\\/g, "/");
      const servicePath = path.join(CONSOLE_ROOT, "..", "02_Services").replace(/\\/g, "/");
      
      // 💡 安全防衛：Vercelクラウド環境（Python不在）で叩かれた場合は、環境エラーとして安全に弾いてデータを守るガード！
      try {
        const execCommand = `python -c "import sys, json; sys.path.append('${servicePath}'); from brynhild import BrynhildInjector; inj = BrynhildInjector(); print(json.dumps(inj.detect_and_parse('${escapedPath}')))"`;
        
        const { stdout, stderr } = await execAsync(execCommand);
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

        if (stderr && !stdout) throw new Error(stderr);

        const parsedRows = JSON.parse(stdout.trim());
        if (Array.isArray(parsedRows) && parsedRows.length > 0) {
          const detectedAsp = parsedRows[0].asp || "その他";
          const folderName = ASP_FOLDER_MAP[detectedAsp] || "others";
          
          try {
            const archiveAspDir = path.join(CONSOLE_ROOT, "..", "03_Memory", folderName);
            if (!fs.existsSync(archiveAspDir)) fs.mkdirSync(archiveAspDir, { recursive: true });
            const finalArchivedPath = path.join(archiveAspDir, `${YYYYMMDD}.csv`);
            fs.writeFileSync(finalArchivedPath, buffer);
          } catch (e) {}

          // 重複排除マージ
          parsedRows.forEach(newRow => {
            const duplicateIndex = combinedNormalizedList.findIndex(oldRow => 
              oldRow.date === newRow.date &&
              oldRow.asp === newRow.asp &&
              oldRow.media_id === newRow.media_id &&
              oldRow.media_name === newRow.media_name
            );

            if (duplicateIndex !== -1) {
              combinedNormalizedList[duplicateIndex] = newRow;
            } else {
              combinedNormalizedList.push(newRow);
            }
          });

          totalProcessedRows += parsedRows.length;
        }
      } catch (execErr: any) {
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);
        return NextResponse.json({ error: `環境エラー：CSVの直接解析は社内ローカルPC環境（Python稼働下）でのみ実行可能です。` }, { status: 500 });
      }
    }

    // クラウド（Vercel Blob）へ大統一JSONを打ち上げ
    if (combinedNormalizedList.length > 0) {
      await put("vlh_normalized_performance.json", JSON.stringify(combinedNormalizedList, null, 2), {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      try {
        fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
      } catch (e) {}
    }

    return NextResponse.json({ success: true, rows_stacked: totalProcessedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}