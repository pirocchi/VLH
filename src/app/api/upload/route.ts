import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });

    // 💡 修正：1階層上の本物の03_Memoryへ
    const CONSOLE_ROOT = process.cwd();
    const tmpDir = path.join(CONSOLE_ROOT, "..", "03_Memory", "TMP_LAUNCH_PAD");
    const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    let totalProcessedRows = 0;
    let combinedNormalizedList: any[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeTmpPath = path.join(tmpDir, `vhl_upload_${Date.now()}.csv`);
      fs.writeFileSync(safeTmpPath, buffer);

      const escapedPath = safeTmpPath.replace(/\\/g, "/");
      const servicePath = path.join(CONSOLE_ROOT, "..", "02_Services").replace(/\\/g, "/");
      const execCommand = `python -c "import sys, json; sys.path.append('${servicePath}'); from brynhild import BrynhildInjector; inj = BrynhildInjector(); print(json.dumps(inj.detect_and_parse('${escapedPath}')))"`;
      
      const { stdout, stderr } = await execAsync(execCommand);
      if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

      if (stderr && !stdout) continue;

      const parsedRows = JSON.parse(stdout.trim());
      if (Array.isArray(parsedRows)) {
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