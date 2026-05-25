import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 👑 保存先は「03_Memory/pricing.json」として辞書から完全独立！
const PRICING_FILE = path.join(process.cwd(), '..', '03_Memory', 'pricing.json');

export async function GET() {
  try {
    if (!fs.existsSync(PRICING_FILE)) {
      return NextResponse.json({ special_prices: [] });
    }
    const data = fs.readFileSync(PRICING_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ special_prices: [] });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!fs.existsSync(path.dirname(PRICING_FILE))) {
      fs.mkdirSync(path.dirname(PRICING_FILE), { recursive: true });
    }
    fs.writeFileSync(PRICING_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}