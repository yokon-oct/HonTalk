/**
 * グローバルエラーハンドリング
 */

type AppError = {
  code: string;
  message: string;
  details?: string;
};

/** エラーコードとユーザー向けメッセージのマッピング */
const ERROR_MESSAGES: Record<string, string> = {
  // 認証
  AUTH_001: 'メールアドレスまたはパスワードが正しくありません',
  AUTH_002: 'このメールアドレスは既に登録されています',
  AUTH_003: 'セッションが切れました。再度ログインしてください',
  AUTH_004: 'パスワードのリセットに失敗しました',
  AUTH_005: 'しばらく時間をおいてから再度お試しください（メール送信の上限に達しました）',
  AUTH_006: 'メールアドレスの確認が必要です。受信トレイをご確認ください',
  // 書籍
  BOOK_001: '書籍が見つかりませんでした',
  BOOK_002: '書籍の登録に失敗しました',
  // レビュー
  REVIEW_001: 'レビューは5,000文字以内で入力してください',
  REVIEW_002: 'レビューの投稿に失敗しました',
  // SNS
  SOCIAL_001: '自分自身をフォローすることはできません',
  SOCIAL_002: 'フォローに失敗しました',
  // システム
  SYS_001: 'サーバーでエラーが発生しました。しばらく経ってから再度お試しください',
  SYS_002: 'ネットワーク接続を確認してください',
  SYS_003: '予期しないエラーが発生しました',
};

/** Supabase エラーかどうかの型ガード */
function isSupabaseError(
  error: unknown,
): error is { message: string; code?: string; status?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/** Supabase エラーコードからアプリ内エラーコードへの変換 */
function mapSupabaseErrorCode(error: {
  message: string;
  code?: string;
  status?: number;
}): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) return 'AUTH_001';
  if (msg.includes('user already registered')) return 'AUTH_002';
  if (msg.includes('jwt expired') || msg.includes('refresh_token')) return 'AUTH_003';
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) return 'AUTH_005';
  if (msg.includes('email not confirmed')) return 'AUTH_006';

  if (error.status === 429) return 'AUTH_005';
  if (error.status && error.status >= 500) return 'SYS_001';

  return 'SYS_003';
}

/**
 * エラーをアプリ内エラー形式に変換する
 */
export function handleError(error: unknown): AppError {
  // Supabase エラー
  if (isSupabaseError(error)) {
    const code = mapSupabaseErrorCode(error);
    return {
      code,
      message: ERROR_MESSAGES[code] ?? 'エラーが発生しました',
      details: error.message,
    };
  }

  // ネットワークエラー
  if (
    error instanceof TypeError &&
    error.message === 'Network request failed'
  ) {
    return {
      code: 'SYS_002',
      message: ERROR_MESSAGES.SYS_002,
    };
  }

  // 不明なエラー
  return {
    code: 'SYS_003',
    message: ERROR_MESSAGES.SYS_003,
    details: String(error),
  };
}

/**
 * エラーコードからユーザー向けメッセージを取得
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.SYS_003;
}
