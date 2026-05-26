import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 🧠 POST: 2社のパフォーマンス比較データを「Gemini 2.5 Pro」へ送り込み、掲載交渉用の具体的な改善提案を生成
 */
export async function POST(req: NextRequest) {
  try {
    const { partnerA, partnerB, metrics } = await req.json();
    const { metricsA, metricsB } = metrics || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ advice: "⚠️ GEMINI_API_KEY が環境変数に設定されていません。" });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    // 2社の顧客獲得単価（CPA）を裏側で算出し、AIの解析精度を極限まで高める
    const cpaA = metricsA?.cv > 0 ? Math.round(metricsA.gross / metricsA.cv) : 0;
    const cpaB = metricsB?.cv > 0 ? Math.round(metricsB.gross / metricsB.cv) : 0;

    // 🤝 プロンプト刷新：横文字ハラスメント・厨二病ワードを完全パージし、2社のバランス比較に特化
    const prompt = `
    
あなたはアローエイト株式会社のアフィリエイトチームを支える、優秀で誠実な最高財務AIアナリスト「Gemini」です。
現在、家庭用脱毛器「ケノン」の特別単価判定管理システム「VLH」の比較・分析センターにおいて、運用担当者をサポートしています。

以下の【選択された2社のパフォーマンス比較データ】をベースに、担当者が両社の投資対効果の差異を明確に把握し、プロモーション配分の最適化や掲載交渉などの次の一歩を戦略的に踏み出せるような「掲載交渉・改善提案のアドバイス」を150文字～200文字程度の【丁寧なビジネス敬体（です・ます調）で、前向きかつ力強い文体】で1つだけ生成してください。

【選択された2社のパフォーマンス比較データ】
■ 対象A（パートナー名）: ${partnerA}
  - 当月成果数: ${metricsA?.cv || 0} 件
  - 広告費（グロス）: ￥${Math.round(metricsA?.gross || 0).toLocaleString()}
  - メディア報酬（ネット）: ￥${Math.round(metricsA?.net || 0).toLocaleString()}
  - 顧客獲得単価（目安CPA）: ￥${cpaA.toLocaleString()}

■ 対象B（パートナー名）: ${partnerB}
  - 当月成果数: ${metricsB?.cv || 0} 件
  - 広告費（グロス）: ￥${Math.round(metricsB?.gross || 0).toLocaleString()}
  - メディア報酬（ネット）: ￥${Math.round(metricsB?.net || 0).toLocaleString()}
  - 顧客獲得単価（目安CPA）: ￥${cpaB.toLocaleString()}

【アドバイス生成 of ガバナンス規律】
1. 挨拶や箇条書き、前置き（「分析結果は以下の通りです」など）は一切不要です。アドバイスの本論だけをストレートに出力してください。
2. 「インサイト」「トレンド」「ベンチマーク」などのカタカナ・英語表現（横文字ハラスメント）は避け、分かりやすい日本語表現（「分析・改善提案」「推移」「比較評価」など）を用いてください。もちろん「戦闘力」「要塞」などの不適切な表現も完全厳禁です。
3. 命令口調や高圧的な表現は厳禁です。現場のメンバーに並走し、知恵を貸す誠実な立場（「～がおすすめです」「～を検討してみてはいかがでしょうか」など）を徹底してください。
4. 交渉の強力な武器として、ケノンが「日本国内累計出荷130万台」を突破したという最新の実績、およびプラットフォームを問わず寄せられているユーザーからの「圧倒的な口コミ」や「絶賛の声」が集まっている事実を、必ずアドバイス内に自然に組み込んでください。
5. 両社の獲得効率（顧客獲得単価）や売上規模のバランスを踏まえ、効率の良い提携先への露出強化や条件の適正化に向けた具体的な交渉の方向性を提案してください。
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