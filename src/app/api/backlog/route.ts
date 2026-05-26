import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 👑 最高司令官より拝受した絶対の兵站接続情報
const BACKLOG_SPACE = "mkg.backlog.com";
const BACKLOG_API_KEY = "vH6W9K7rRIA8FOfehQTXLzqNlkzmRjxhvmjCwFxQDCyPyz2g7ZtPB5RqE83Ffygh";

/**
 * 💬 POST: カンマ区切りの複数キーから「最新のキー」を自動選定し、既存スレッドのコメント欄へ自動投稿
 */
export async function POST(req: NextRequest) {
  try {
    const { backlogIssueKey, partnerName, actionType, currentTier, cv, gross, net } = await req.json();

    if (!backlogIssueKey || !backlogIssueKey.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "このパートナーにはBacklogの課題キーが紐付けられていません。マスタ設定から登録してください。" 
      }, { status: 400 });
    }

    // 🛡️ 複数キー自動調停ロジック：カンマ区切り文字列を分解・トリミングし、空文字を除外
    const keysArray = backlogIssueKey
      .split(",")
      .map((k: string) => k.trim())
      .filter((k: string) => k !== "");

    if (keysArray.length === 0) {
      return NextResponse.json({ success: false, error: "有効なBacklog課題キーが検出されませんでした。" }, { status: 400 });
    }

    // 🎯 スタック最上部（配列の最後）のキーを「現行の最新スレッド」として完全ロックオン！！！
    const targetLatestKey = keysArray[keysArray.length - 1];

    const baseUrl = `https://${BACKLOG_SPACE}/api/v2`;
    const eventName = actionType === "pricing" ? "特別単価の変更・適用" : "掲載位置の格上げ・露出拡大交渉";
    
    // 👑 現場の皆様がひと目で戦況を把握できるクリーンな実数値テキスト
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

    const params = new URLSearchParams();
    params.append("content", commentContent);

    // 最新スレッドのエンドポイントへ射出！！！
    const commentUrl = `${baseUrl}/issues/${targetLatestKey}/comments?apiKey=${BACKLOG_API_KEY}`;
    const response = await fetch(commentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, error: `Backlogへのコメント投稿に失敗しました（対象キー: ${targetLatestKey}）: ${errText}` }, { status: 500 });
    }

    const issueUrl = `https://${BACKLOG_SPACE}/view/${targetLatestKey}`;

    return NextResponse.json({ 
      success: true, 
      issueKey: targetLatestKey,
      issueUrl: issueUrl,
      isMultiple: keysArray.length > 1
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `システムエラー: ${err.message}` }, { status: 500 });
  }
}