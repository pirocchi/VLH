import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 最高司令官より拝受した絶対の兵站接続情報
const BACKLOG_SPACE = "mkg.backlog.com";
const BACKLOG_API_KEY = "vH6W9K7rRIA8FOfehQTXLzqNlkzmRjxhvmjCwFxQDCyPyz2g7ZtPB5RqE83Ffygh";

/**
 * 💬 POST: VLHの画面から課題キーと戦況データを受け取り、既存のパートナー専用スレッドへ自動コメント投稿
 */
export async function POST(req: NextRequest) {
  try {
    const { backlogIssueKey, partnerName, actionType, currentTier, cv, gross, net } = await req.json();

    // 🛡️ 防衛バリデーション：課題キーが紐付いていない場合は即リターン
    if (!backlogIssueKey) {
      return NextResponse.json({ 
        success: false, 
        error: "このパートナーにはBacklogの課題キーが紐付けられていません。マスタ設定から登録してください。" 
      }, { status: 400 });
    }

    const baseUrl = `https://${BACKLOG_SPACE}/api/v2`;
    
    // トリガー内容に応じた日本語テキストの自動調停（横文字・厨二病の完全パージ）
    const eventName = actionType === "pricing" ? "特別単価の変更・適用" : "掲載位置の格上げ・露出拡大交渉";
    
    // 👑 福本様たちがスレッドを見た瞬間に戦況が1秒でわかる、カンマ・単位付きのクリーンな業務報告テキスト
    const commentContent = `【VLH（特別単価判定管理システム）連動通知】

システムより、当月の成果状況に基づいた以下のデータ連動およびアクションが推奨されました。

■ アクション内容: ${eventName}
■ 現在の判定階級: ${currentTier || "判定なし"}
■ 当月発生成果数: ${Number(cv || 0).toLocaleString()} 件
■ 当月総広告費（グロス）: ￥${Math.round(gross || 0).toLocaleString()}
■ 当月メディア報酬（ネット）: ￥${Math.round(net || 0).toLocaleString()}

【掲載交渉用の共有ファクト】
交渉の際は、現在の強力な追い風である以下の自社実績ファクトを相手方に提示し、プロモーション優位性を強くアピールしてください。
・家庭用脱毛器ケノン：日本国内累計出荷実績「130万台」突破（国内最高峰の実績）
・各 retail プラットフォームにおいて「圧倒的な口コミ」および「絶賛の声」を獲得中

本件に関するASPやパートナーとの交渉経緯・進捗は、引き続き本スレッドのコメント欄にて管理・共有をお願いいたします。`;

    // Backlog API v2 課題コメントの追加（POST /api/v2/issues/{issueIdOrKey}/comments）
    const params = new URLSearchParams();
    params.append("content", commentContent);

    const commentUrl = `${baseUrl}/issues/${backlogIssueKey}/comments?apiKey=${BACKLOG_API_KEY}`;
    const response = await fetch(commentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, error: `Backlogへのコメント投稿に失敗: ${errText}` }, { status: 500 });
    }

    // パートナーのBacklogスレッドURLを動的生成
    const issueUrl = `https://${BACKLOG_SPACE}/view/${backlogIssueKey}`;

    return NextResponse.json({ 
      success: true, 
      issueKey: backlogIssueKey,
      issueUrl: issueUrl
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `システムエラー: ${err.message}` }, { status: 500 });
  }
}