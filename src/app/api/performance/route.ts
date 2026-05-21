import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  // 💡 規律：Vercel同梱用に、06_Console直下に安置された本物のJSONを読みに行く
  const CONSOLE_ROOT = process.cwd();
  const MEMORY_JSON_PATH = path.join(CONSOLE_ROOT, "vlh_normalized_performance.json");

  try {
    if (!fs.existsSync(MEMORY_JSON_PATH)) {
      return NextResponse.json([]);
    }
    const rawData = fs.readFileSync(MEMORY_JSON_PATH, "utf-8");
    return NextResponse.json(JSON.parse(rawData));
  } catch (err) {
    return NextResponse.json({ error: "Memory read crash" }, { status: 500 });
  }
}