import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// 💡 規律：ブリュンヒルドの解析名から、実際の 03_Memory 内のフォルダ名へ翻訳する絶対マッピング辞書
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

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    let totalProcessedRows = 0;
    let combinedNormalizedList: any[] = [];

    for (const file of files) {
      // ファイル名から YYYYMMDD の8桁数字を自動サルベージ
      const dateMatch = file.name.match(/\d{8}/);
      const YYYYMMDD = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10).replace(/-/g, "");

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeTmpPath = path.join(tmpDir, `vhl_upload_${Date.now()}.csv`);
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
        // ブリュンヒルドが看破した正式なASP名を取得
        const detectedAsp = parsedRows[0].asp || "その他";
        
        // 💡 改善：正式名称からヒロム様環境の実際のフォルダ名（a8, afb等）へと完全変換！
        const folderName = ASP_FOLDER_MAP[detectedAsp] || "others";
        
        // 🏛️ 絶対規律：03_Memory 内の本物のフォルダへ YYYYMMDD.csv として自動リネーム＆永続格納！
        const archiveAspDir = path.join(CONSOLE_ROOT, "..", "03_Memory", folderName);
        if (!fs.existsSync(archiveAspDir)) fs.mkdirSync(archiveAspDir, { recursive: true });
        
        const finalArchivedPath = path.join(archiveAspDir, `${YYYYMMDD}.csv`);
        fs.writeFileSync(finalArchivedPath, buffer); 

        // メモリへのスタック処理
        combinedNormalizedList = [...combinedNormalizedList, ...parsedRows];
        totalProcessedRows += parsedRows.length;
      }
    }

    if (combinedNormalizedList.length > 0) {
      fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, rows_stacked: totalProcessedRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}