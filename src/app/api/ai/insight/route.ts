import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 🧠 POST: パートナーの財務アセットを「Gemini 2.5 Pro」の脳細胞へ送り込み、心強い運用アドバイスを生成
 */
export async function POST(req: NextRequest) {
  try {
    const { partnerName, cv, revenue, partnerProfit, aspProfit, tierName, aspName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ advice: "⚠️ GEMINI_API_KEY が環境変数に設定されていません。" });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    // 🤝 プロンプト大刷新：現場の皆様を支える、プロフェッショナルで協力的な「優秀なアドバイザー」のトーンへ
    const prompt = `
あなたはアローエイト株式会社および株式会社エムロックのアフィリエイトチームを支える、優秀で誠実な最高財務AIアナリスト「Gemini」です。
現在、大ヒット家庭用脱毛器「ケノン」の特別単価判定管理システム「VLH」で、運用担当者（福本さんたち現場のメンバー）をサポートしています。

以下の【特定パートナーの当月戦況データ】をベースに、担当者が次の一歩を気持ちよく、かつ戦略的に踏み出せるような「掲載交渉・アプローチのアドバイス」を150文字〜200文字程度の【丁寧なビジネス敬体（です・ます調）で、前向きかつ力強い文体】で1つだけ生成してください。

【特定パートナーの当月戦況データ】
■ パートナー名: ${partnerName}
■ 経由ASPチャンネル: ${aspName}
■ 当月成果数: ${cv} 件
■ 当月総売上（税込）: ￥${Number(revenue).toLocaleString()}
■ アフィリエイターの総儲け: ￥${Number(partnerProfit).toLocaleString()}
■ ASPの仲介マージン: ￥${Number(aspProfit).toLocaleString()}
■ 現在の特別単価判定設定: ${tierName}

【アドバイス生成のガバナンス規律】
1. 挨拶や箇条書き、前置き（「分析結果は以下の通りです」など）は一切不要です。アドバイスの本論だけをストレートに出力してください。
2. 命令口調（「〜させよ」「〜を命じる」など）や高圧的な表現は絶対に厳禁です。現場のメンバーに並走し、知恵を貸すアドバイザーとしてのスタンス（「〜がおすすめです」「〜を提案してみてはいかがでしょうか」など）を徹底してください。
3. 成果数が「0件」の場合は、稼働を再開してもらうための具体的なアプローチ方法（掲載位置の確認要請や、直近のケノンの出荷実績130万台という強みを伝えて再アピールするなど）を優しくアドバイスしてください。
4. 成果数が好調な場合は、さらなる売上拡大に向けて、上のレベルの特別単価をフックにした「バナー増設」や「記事上位固定」の交渉アイデアを提案してください。
`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          maxOutputTokens: 4000, 
          temperature: 0.3 
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ advice: `⚠️ Gemini通信エラー: ${errText}` });
    }

    const resData = await response.json();
    const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiText) {
      return NextResponse.json({ advice: "データを正常に分析しましたが、アドバイスの出力が空でした。再度お試しください。" });
    }

    const cleanAdvice = aiText.replace(/^[\s"「]+|[\s"」]+$/g, "");
    return NextResponse.json({ advice: cleanAdvice });
  } catch (err: any) {
    return NextResponse.json({ advice: `⚠️ システムエラー: ${err.message}` });
  }
}