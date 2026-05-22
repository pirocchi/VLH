import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 💡 規律：Python側のMIMIR（03_Memory）と100%同じファイルを完全共有・ロックする絶対座標
const dictPath = path.join(process.cwd(), "..", "03_Memory", "mimir_dictionary.json");

// ディレクトリ自動生成の安全弁
const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

// 辞書データのサルベージ（読み込み）
export async function GET() {
  try {
    if (!fs.existsSync(dictPath)) {
      return NextResponse.json({ master_partners: [] });
    }
    const data = fs.readFileSync(dictPath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ master_partners: [] });
  }
}

// 辞書データの書き込み・永続保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    ensureDirectoryExists(dictPath);
    fs.writeFileSync(dictPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}