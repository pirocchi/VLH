import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { put, list } from "@vercelblob";

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
        const blobRes = await fetch(targetBlob.url, { cache: "no-store" });
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

      const buffer = Buffer.from(await file.arrayBuffer());
      
      const safeTmpPath = path.join(runtimeTmpDir, `vlh_${YYYYMMDD}_${Date.now()}.csv`);
      fs.writeFileSync(safeTmpPath, buffer);

      const escapedPath = safeTmpPath.replace(/\\/g, "/");
      const servicePath = path.join(CONSOLE_ROOT, "..", "02_Services").replace(/\\/g, "/");
      
      try {
        const execCommand = `python -c "import sys, json; sys.path.append('${servicePath}'); from brynhild import BrynhildInjector; inj = BrynhildInjector(); print(json.dumps(inj.detect_and_parse('${escapedPath}')))"`;
        
        const { stdout, stderr } = await execAsync(execCommand, { windowsHide: true });
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);

        if (stderr && !stdout) {
          console.error(`❌ ブリュンヒルド stderr エラー [${file.name}]:`, stderr);
          continue;
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

          // 解析された行をストレートに全件マージ（重複はこの後のMap調停で一撃粉砕）
          combinedNormalizedList = [...combinedNormalizedList, ...parsedRows];
          totalProcessedRows += parsedRows.length;
          console.log(`✓ ブリュンヒルドパース成功 [${file.name}]: +${parsedRows.length} 行`);
        } else {
          console.log(`⚠ 警告 [${file.name}]: パース結果が空、または配列ではありませんでした。`);
        }
      } catch (execErr: any) {
        if (fs.existsSync(safeTmpPath)) fs.unlinkSync(safeTmpPath);
        console.error(`❌ Python実行大クラッシュ [${file.name}]:`, execErr.message);
        return NextResponse.json({ error: `環境エラー：CSVの直接解析は社内ローカルPC環境（Python稼働下）でのみ実行可能です。` }, { status: 500 });
      }
    }

    // 🚀 核心：重複を20000%永久抹殺する、クラウド側・一意性上書きマージプロトコル
    if (combinedNormalizedList.length > 0) {
      const masterMap = new Map<string, any>();
      
      for (const row of combinedNormalizedList) {
        // 宇宙一意キーの創世 -> [ASP名]_[絶対日付]_[メディアID]
        const key = `${row.asp}_${row.date}_${row.media_id}`;
        // すでに同一キーが存在する場合は最新の行（ループ後方）で完全自動上書き
        masterMap.set(key, row);
      }
      
      // マップから重複の完全に消滅したユニーク配列を再生成
      combinedNormalizedList = Array.from(masterMap.values());
      console.log(`🧹 クラウド側マージ監査完了。重複をパージしたユニーク総行数: ${combinedNormalizedList.length} 行`);

      console.log(`🌐 Vercel Blob [vlh-memory] へ最終大統一JSONを絶対上書き射出中... (総行数: ${combinedNormalizedList.length} 行)`);
      
      try {
        await put("vlh_normalized_performance.json", JSON.stringify(combinedNormalizedList, null, 2), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        
        console.log("✓ Vercel Blob への絶対上書き打ち上げに完全勝利しました！");
      } catch (blobPutErr: any) {
        console.error("❌ Vercel Blob 射出中にセキュリティー防衛線で大破:", blobPutErr.message);
        throw blobPutErr;
      }
      
      // ローカル側への物理上書きバックアップ
      try {
        fs.writeFileSync(MEMORY_JSON_PATH, JSON.stringify(combinedNormalizedList, null, 2), "utf-8");
        console.log("🏠 ローカルの物理 JSON メモリのバックアップ上書きも完全完了しました。");
      } catch (e) {}
    } else {
      console.error("❌ 致命的エラー: マージ後の全データが0件のため、クラウドへの上書きを安全に拒絶しました。");
      return NextResponse.json({ error: "解析された有効な成果データ行が0件です。" }, { status: 400 });
    }

    console.log(`=== 🎉 VLH DATA INJECTION PULSE COMPLETE: +${totalProcessedRows} ROWS STACKED ===`);
    return NextResponse.json({ success: true, rows_stacked: totalProcessedRows });
  } catch (err: any) {
    console.error("❌ 致命大破システムエラー:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}