import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 🧠 POST: パートナーの財務アセットを「Gemini」の脳細胞へ送り込み、神速のアドバイスを錬成
 */
export async function POST(req: NextRequest) {
  try {
    const { partnerName, cv, revenue, partnerProfit, aspProfit, tierName, aspName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ advice: "⚠️ GEMINI_API_KEY が環境変数に設定されていません。システム管理者に要請してください。" });
    }

    // 💡 規律：Gemini 1.5 Pro への公式直通通信パイプライン
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    // 👑 プロンプト大粛清：「ジム」の呼称を完全抹殺し、最高財務AIとして現場（福本たち）を統治する冷徹な規律
    const prompt = `
あなたはアローエイト株式会社および株式会社エムロックの最高財務AIアフィリエイトアナリスト「Gemini」です。
現在、大ヒット家庭用脱毛器「ケノン」の特別単価判定ガバナンスシステム「VLH」を運用しています。

以下の【特定パートナーの当月戦況データ】を冷徹に分析し、運用担当者（現場の福本たち）が次に打つべき具体的な「示唆・交渉アドバイス」を150文字〜200文字程度の【極めて簡潔かつプロフェッショナル、なおかつ力強い文体】で1つだけ生成してください。

【特定パートナーの當月戦況データ】
■ パートナー名: ${partnerName}
■ 経由ASPチャンネル: ${aspName}
■ 当月成果数: ${cv} 件
■ 当月総売上（税込）: ￥${Number(revenue).toLocaleString()}
■ アフィリエイターの総儲け: ￥${Number(partnerProfit).toLocaleString()}
■ ASPの仲介マージン: ￥${Number(aspProfit).toLocaleString()}
■ 現在の特別単価判定設定: ${tierName}

【アドバイス生成のガバナンス規律】
1. 前置き（「分析結果は以下の通りです」など）や余計な挨拶、箇条書きは1文字とも出力するな。アドバイスの本論だけをストレートに出力せよ。
2. 成果数が「0件」の場合は、稼働を再開させるための具体的なアクション（担当営業への突っつき、掲載位置の確認要請など）を指示せよ。
3. 成果数が急増、または高い影響力を維持している場合は、上のレベルへの特別単価引き上げをエサにした「さらなる広告露出拡大（バナー増設、記事上位固定）」の交渉を仕掛けるよう担当者に命じよ。
4. 自社の手残り、ASPマージン、アフィリエイター利益の三位一体のバランスから、この媒体が本当に利益貢献しているかを厳格に見極める視点を含めよ。
`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Gemini API 接続大破:", errText);
      return NextResponse.json({ advice: "Geminiの脳細胞と通信中にエラーが発生しました。時間をおいて再執行してください。" });
    }

    const resData = await response.json();
    const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "データは正常ですが、Geminiからの電波が途絶えています。";

    const cleanAdvice = aiText.replace(/^[\s"「]+|[\s"」]+$/g, "");

    return NextResponse.json({ advice: cleanAdvice });
  } catch (err: any) {
    console.error("❌ AIインサイト生成大クラッシュ:", err.message);
    return NextResponse.json({ advice: `システムエラー: ${err.message}` });
  }
}