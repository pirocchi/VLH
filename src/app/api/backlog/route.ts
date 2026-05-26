import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKLOG_SPACE = "mkg.backlog.com";
const BACKLOG_API_KEY = "vH6W9K7rRIA8FOfehQTXLzqNlkzmRjxhvmjCwFxQDCyPyz2g7ZtPB5RqE83Ffygh";

/**
 * 💬 POST: カンマ区切りの複数キーから最新課題を特定し、AI分析内容または定型アクションをコメント投稿
 */
export async function POST(req: NextRequest) {
  try {
    const { backlogIssueKey, partnerName, actionType, currentTier, cv, gross, net, aiAdvice } = await req.json();

    if (!backlogIssueKey || !backlogIssueKey.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "このパートナーにはBacklogの課題キーが紐付けられていません。マスタ設定から登録してください。" 
      }, { status: 400 });
    }

    const keysArray = backlogIssueKey
      .split(",")
      .map((k: string) => k.trim())
      .filter((k: string) => k !== "");

    if (keysArray.length === 0) {
      return NextResponse.json({ success: false, error: "有効なBacklog課題キーが検出されませんでした。" }, { status: 400 });
    }

    const targetLatestKey = keysArray[keysArray.length - 1];
    const baseUrl = `https://${BACKLOG_SPACE}/api/v2`;
    
    // 👑 共通の戦況ヘッダーを生成（カンマ・単位完全準拠）
    let commentContent = `【VLH（特別単価判定管理システム）連動通知】

システムより、当月の成果状況に基づいた以下のデータ連動およびアクションが推奨されました。

■ 対象パートナー名: ${partnerName}
■ 現在の判定階級: ${currentTier || "判定なし"}
■ 当月発生成果数: ${Number(cv || 0).toLocaleString()} 件
■ 当月総広告費（グロス）: ￥${Math.round(gross || 0).toLocaleString()}
■ 当月メディア報酬（ネット）: ￥${Math.round(net || 0).toLocaleString()}
`;

    // 👑 最高司令官の神提案：AI分析内容が存在する場合は、それを対応内容のメインとして極上マウント！！！
    if (aiAdvice) {
      commentContent += `
【AIによる具体的な掲載交渉・改善提案】
${aiAdvice}
`;
    } else {
      // 既存の定型ボタン用テキストロジックも完全互換で残存
      const eventName = actionType === "pricing" ? "特別単価の変更・適用" : "掲載位置の格上げ・露出拡大交渉";
      commentContent += `
■ アクション内容: ${eventName}

【対応依頼内容】
上記パートナーに対して、当月の成果状況に応じた特別単価の適用変更、または掲載順位の格上げ・バナー増設等のプロモーション交渉を行ってください。
`;
    }

    // 援護射撃のケノン絶対ファクトブロック
    commentContent += `
【掲載交渉用の共有ファクト】
交渉の際は、現在の強力な追い風である以下の自社実績ファクトを相手方に提示し、プロモーション優位性を強くアピールしてください。
・家庭用脱毛器ケノン：日本国内累計出荷実績「130万台」突破（国内最高峰の実績）
・各 retail プラットフォームにおいて「圧倒的な口コミ」および「絶賛の声」を獲得中

本件に関するASPやパートナーとの交渉経緯・進捗は、引き続き本スレッドのコメント欄にて管理・共有をお願いいたします。`;

    const params = new URLSearchParams();
    params.append("content", commentContent);

    const commentUrl = `${baseUrl}/issues/${targetLatestKey}/comments?apiKey=${BACKLOG_API_KEY}`;
    const response = await fetch(commentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, error: `Backlogへのコメント投稿に失敗: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      issueKey: targetLatestKey,
      issueUrl: `https://${BACKLOG_SPACE}/view/${targetLatestKey}`
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `システムエラー: ${err.message}` }, { status: 500 });
  }
}