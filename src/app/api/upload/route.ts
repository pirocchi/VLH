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

function cleanNum(val: any): number {
  if (val === undefined || val === null || String(val).trim() === "" || String(val).trim() === "-" || String(val).trim() === "\\0" || String(val).trim() === "￥0" || String(val).trim() === "0%") return 0;
  const cleaned = String(val).replace(/[^\d.]/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let current = "";
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim());
      lines.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    lines.push(row);
  }
  return lines;
}

export async function POST(req: NextRequest) {
  console.log("=== 📡 VLH DATA INJECTION PULSE STARTED ===");
  try {
    const formData = await req.formData();
    
    let files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      files = formData.getAll("file") as File[];
    }
    
    if (!files || files.length === 0) {
      console.error("❌ エラー: ファイルがフォームデータに見つかりません。");
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    console.log(`📦 装填されたファイル数: ${files.length} 件`);

    const CONSOLE_ROOT = process.cwd();
    const tmpDir = path.join(CONSOLE_ROOT, "..", "03_Memory", "TMP_LAUNCH_PAD");
    const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "..", "03_Memory", "vlh_normalized_performance.json");
    const CONSOLE_JSON_PATH = path.join(CONSOLE_ROOT, "vlh_normalized_performance.json");

    const runtimeTmpDir = fs.existsSync("/tmp") ? "/tmp" : tmpDir;
    if (!fs.existsSync(runtimeTmpDir) && runtimeTmpDir !== "/tmp") {
      fs.mkdirSync(runtimeTmpDir, { recursive: true });
    }

    // 過去のクラウド上の全歴史メモリをロード
    let combinedNormalizedList: any[] = [];
    try {
      const blobList = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const sortedBlobs = blobList.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      const targetBlob = sortedBlobs.find(b => b.pathname === "vlh_normalized_performance.json");
      if (targetBlob) {
        const blobRes = await fetch(targetBlob.url, { cache: "no-store", headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
        if (blobRes.ok) {
          const oldData = await blobRes.json();
          if (Array.isArray(oldData)) {
            combinedNormalizedList = [...oldData];
            console.log(`📚 クラウドから過去の蓄積メモリをロード完了: ${combinedNormalizedList.length} 行`);
          }
        }
      }
    } catch (blobError) {
      console.log("⚠ クラウドに既存メモリがないため新規生成モードで進軍します。");
    }

    // もしクラウドが空で、ローカルにデータが残っていればそれを土台にする
    if (combinedNormalizedList.length === 0 && fs.existsSync(MEMORY_JSON_PATH)) {
      try {
        const localData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
        const parsedLocal = JSON.parse(localData);
        if (Array.isArray(parsedLocal)) {
          combinedNormalizedList = [...parsedLocal];
          console.log(`🏠 ローカルの物理JSONから過去遺産をサルベージ完了: ${combinedNormalizedList.length} 行`);
        }
      } catch (e) {}
    }

    let totalProcessedRows = 0;

    for (const file of files) {
      console.log(`🚀 ファイル解析開始: ${file.name}`);
      const dateMatch = file.name.match(/\d{8}/);
      const YYYYMMDD = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 10).replace(/-/g, "");

      // YYYY-MM-DD 形式に成形
      const formattedDate = `${YYYYMMDD.slice(0,4)}-${YYYYMMDD.slice(4,6)}-${YYYYMMDD.slice(6,8)}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      
      const safeTmpPath = path.join(runtimeTmpDir, `vlh_${YYYYMMDD}_${Date.now()}.csv`);
      
      // ローカルPC環境下の場合のみ一時ファイルを物理書き込み
      if (runtimeTmpDir !== "/tmp" || fs.existsSync(path.dirname(safeTmpPath))) {
        try { fs.writeFileSync(safeTmpPath, buffer); } catch(e){}
      }

      const escapedPath = safeTmpPath.replace(/\\/g, "/");
      const servicePath = path.join(CONSOLE_ROOT, "..", "02_Services").replace(/\\/g, "/");
      
      try {
        // 1) まずはローカルのPython（ブリュンヒルド）の呼び出しを試みる
        const execCommand = `python -c "import sys, json; sys.path.append('${servicePath}'); from brynhild import BrynhildInjector; inj = BrynhildInjector(); print(json.dumps(inj.detect_and_parse('${escapedPath}')))"`;
        
        const { stdout, stderr } = await execAsync(execCommand, { windowsHide: true });
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

        if (stderr && !stdout) {
          throw new Error(stderr);
        }

        const parsedRows = JSON.parse(stdout.trim());
        if (Array.isArray(parsedRows) && parsedRows.length > 0) {
          const detectedAsp = parsedRows[0].asp || "その他";
          const folderName = ASP_FOLDER_MAP[detectedAsp] || "others";
          
          // ローカル物理バックアップ保存
          try {
            const archiveAspDir = path.join(CONSOLE_ROOT, "..", "03_Memory", folderName);
            if (!fs.existsSync(archiveAspDir)) fs.mkdirSync(archiveAspDir, { recursive: true });
            const finalArchivedPath = path.join(archiveAspDir, `${YYYYMMDD}.csv`);
            fs.writeFileSync(finalArchivedPath, buffer);
          } catch (e) {}

          combinedNormalizedList = [...combinedNormalizedList, ...parsedRows];
          totalProcessedRows += parsedRows.length;
          console.log(`✓ ブリュンヒルドパース成功 [${file.name}]: +${parsedRows.length} 行`);
        }
      } catch (execErr: any) {
        // 2) クラウド環境（Python未稼働）時は、内製高精度JSパースエンジンへ安全に自動フォールバックバイパス
        console.log(`💡 [${file.name}]: クラウド環境を検知。内製パースエンジンで直接解析を執行します。`);
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

        try {
          let text = new TextDecoder("utf-8").decode(buffer);
          if (text.includes("") || (!text.includes("A8.net") && !text.includes("メディアID") && !text.includes("SID") && !text.includes("パートナーサイトID") && !text.includes("サイトID") && !text.includes("ASP"))) {
            text = new TextDecoder("shift-jis").decode(buffer);
          }

          const rows = parseCSV(text);
          if (rows.length < 2) continue;

          let aspType = "";
          let headerIdx = -1;
          for (let i = 0; i < Math.min(15, rows.length); i++) {
            const lineStr = rows[i].join(",");
            if (lineStr.includes("メディアID") && lineStr.includes("確定件数")) { aspType = "A8.net"; headerIdx = i; break; }
            if (lineStr.includes("SID") && lineStr.includes("発生成果数")) { aspType = "afb"; headerIdx = i; break; }
            if (lineStr.includes("パートナーサイトID")) { aspType = "AccessTrade"; headerIdx = i; break; }
            if (lineStr.includes("サイトID") && lineStr.includes("発生報酬")) { aspType = "felmat"; headerIdx = i; break; }
            if (lineStr.includes("サイトID") && lineStr.includes("発生成果金額")) { aspType = "もしもアフィリエイト"; headerIdx = i; break; }
            if (lineStr.includes("ASP") && lineStr.includes("Click数")) { aspType = "QUORIZa"; headerIdx = i; break; }
          }

          if (!aspType || headerIdx === -1) continue;

          const headers = rows[headerIdx];
          const dataRows = rows.slice(headerIdx + 1);
          const parsedRows: any[] = [];

          dataRows.forEach((r) => {
            if (r.length < headers.length || !r[0]) return;
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => { rowObj[h] = r[idx]; });

            let standardized: any = null;

            if (aspType === "A8.net" && rowObj["メディアID"]) {
              const imp = cleanNum(rowObj["インプレッション"] || rowObj["インプレッション数"]);
              const clicks = Math.round(cleanNum(rowObj["クリック"]));
              standardized = {
                asp: "A8.net", date: formattedDate, media_id: rowObj["メディアID"].trim(), media_name: rowObj["サイト名"]?.trim() || "",
                impressions: imp === 0 ? clicks * 12 : Math.round(imp), clicks,
                issued_count: Math.round(cleanNum(rowObj["発生件数"])), approved_count: Math.round(cleanNum(rowObj["確定件数"])),
                approval_rate: cleanNum(rowObj["確定率（件数ベース）"]), issued_reward: cleanNum(rowObj["発生金額"]), approved_reward: cleanNum(rowObj["確定金額"])
              };
            } else if (aspType === "afb" && rowObj["SID"]) {
              const imp = cleanNum(rowObj["表示回数"] || rowObj["インプレッション"]);
              const clicks = Math.round(cleanNum(rowObj["クリック数"]));
              standardized = {
                asp: "afb", date: formattedDate, media_id: rowObj["SID"].trim(), media_name: rowObj["サイト名"]?.trim() || "",
                impressions: imp === 0 ? clicks * 10 : Math.round(imp), clicks,
                issued_count: Math.round(cleanNum(rowObj["発生成果数"])), approved_count: Math.round(cleanNum(rowObj["承認成果数"])),
                approval_rate: cleanNum(rowObj["承認率"]), issued_reward: cleanNum(rowObj["発生成果報酬"]), approved_reward: cleanNum(rowObj["承認成果報酬"])
              };
            } else if (aspType === "AccessTrade" && rowObj["パートナーサイトID"] && rowObj["パートナーサイトID"] !== "合計") {
              const imp = cleanNum(rowObj["Imp"] || rowObj["インプレッション数"]);
              const clicks = Math.round(cleanNum(rowObj["Click"]));
              const appRate = cleanNum(rowObj["承認率"]);
              standardized = {
                asp: "AccessTrade", date: formattedDate, media_id: rowObj["パートナーサイトID"].trim(), media_name: rowObj["パートナーサイト名"]?.trim() || "",
                impressions: imp === 0 ? clicks * 15 : Math.round(imp), clicks,
                issued_count: Math.round(cleanNum(rowObj["発生件数：合計"])), approved_count: Math.round(cleanNum(rowObj["発生件数：承認"])),
                approval_rate: appRate <= 1.0 ? appRate * 100.0 : appRate, issued_reward: cleanNum(rowObj["発生報酬額"]), approved_reward: cleanNum(rowObj["成果報酬額"])
              };
            } else if (aspType === "felmat" && rowObj["サイトID"]) {
              const clicks = Math.round(cleanNum(rowObj["Click数"]));
              const imp = cleanNum(rowObj["Impression"] || rowObj["表示回数"]) || (clicks * 11);
              const issued = cleanNum(rowObj["発生数"]);
              const approved = cleanNum(rowObj["承認数"]);
              standardized = {
                asp: "felmat", date: formattedDate, media_id: rowObj["サイトID"].trim(), media_name: rowObj["サイト名"]?.trim() || "",
                impressions: Math.round(imp), clicks, issued_count: Math.round(issued), approved_count: Math.round(approved),
                approval_rate: issued > 0 ? parseFloat(((approved / issued) * 100).toFixed(2)) : 0.0, issued_reward: cleanNum(rowObj["発生報酬"]), approved_reward: cleanNum(rowObj["承認報酬"])
              };
            } else if (aspType === "もしもアフィリエイト" && rowObj["サイトID"]) {
              const clicks = Math.round(cleanNum(rowObj["クリック数"]));
              const imp = cleanNum(rowObj["インプレッション数"] || rowObj["インプ"]) || (clicks * 14);
              const issued = cleanNum(rowObj["発生成果数"]);
              const approved = cleanNum(rowObj["承認成果数"]);
              standardized = {
                asp: "もしもアフィリエイト", date: formattedDate, media_id: rowObj["サイトID"].trim(), media_name: rowObj["サイト名"]?.trim() || "",
                impressions: Math.round(imp), clicks, issued_count: Math.round(issued), approved_count: Math.round(approved),
                approval_rate: issued > 0 ? parseFloat(((approved / issued) * 100).toFixed(2)) : 0.0, issued_reward: cleanNum(rowObj["発生成果金額"]), approved_reward: cleanNum(rowObj["承認成果金額"])
              };
            } else if (aspType === "QUORIZa" && rowObj["ASP"]) {
              const clicks = Math.round(cleanNum(rowObj["Click数"]));
              const imp = cleanNum(rowObj["Imp数"]) || (clicks * 8);
              standardized = {
                asp: "QUORIZa", date: formattedDate, media_id: "N/A", media_name: rowObj["ASP"].trim(),
                impressions: Math.round(imp), clicks, issued_count: Math.round(cleanNum(rowObj["発生数"])), approved_count: Math.round(cleanNum(rowObj["承認数"])),
                approval_rate: cleanNum(rowObj["承認率"]), issued_reward: 0.0, approved_reward: 0.0
              };
            }

            if (standardized) parsedRows.push(standardized);
          });

          if (parsedRows.length > 0) {
            combinedNormalizedList = [...combinedNormalizedList, ...parsedRows];
            totalProcessedRows += parsedRows.length;
            console.log(`✓ 内製エンジンマージ成功 [${file.name}]: +${parsedRows.length} 行`);
          }
        } catch (innerJsErr: any) {
          console.error(`❌ 内製エンジンパースエラー [${file.name}]:`, innerJsErr.message);
        }
      }
    }

    // 🚀 重複を永久抹殺する、一意性上書きマージ
    if (combinedNormalizedList.length > 0) {
      const masterMap = new Map<string, any>();
      for (const row of combinedNormalizedList) {
        const key = `${row.asp}_${row.date}_${row.media_id}`;
        masterMap.set(key, row);
      }
      combinedNormalizedList = Array.from(masterMap.values());
      console.log(`🧹 重複パージ完了。ユニーク総行数: ${combinedNormalizedList.length} 行`);

      // 宇宙（Vercel Blob）へ絶対上書き射出
      await put("vlh_normalized_performance.json", JSON.stringify(combinedNormalizedList, null, 2), {
        access: "private", addRandomSuffix: false, allowOverwrite: true, token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      // ローカル側（手元PC）であれば物理ファイル2箇所にも即座に自動保存ミラーリング
      try {
        if (fs.existsSync(path.dirname(MEMORY_JSON_PATH))) {
          fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
        }
        if (fs.existsSync(path.dirname(CONSOLE_JSON_PATH))) {
          fs.writeFileSync(CONSOLE_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
        }
        console.log("🏠 ローカルの物理 JSON メモリの同期バックアップ完了。");
      } catch (e) {}
    } else {
      return NextResponse.json({ error: "有効な成果データ行が0件です。" }, { status: 400 });
    }

    console.log(`=== 🎉 VLH DATA INJECTION PULSE COMPLETE ===`);
    return NextResponse.json({ success: true, rows_stacked: totalProcessedRows });
  } catch (err: any) {
    console.error("❌ システムエラー:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}