/**
 * Google OAuth コールバック URL をアプリ全体で受け取るためのブリッジ。
 *
 * openAuthSessionAsync / 外部 Safari のどちらでも、
 * Linking イベントを 1 箇所に集約して待機中の Promise を解決する。
 */

import * as WebBrowser from 'expo-web-browser';

/** Supabase Redirect URLs にこの値をそのまま登録すること */
export const OAUTH_REDIRECT_URI = 'hontalk://auth/callback';

type PendingOAuth = {
  resolve: (url: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

let pendingOAuth: PendingOAuth | null = null;

export function isOAuthCallbackUrl(url: string): boolean {
  return (
    url.startsWith(OAUTH_REDIRECT_URI) ||
    url.includes('://auth/callback')
  );
}

/** OAuth コールバック URL の到着を待つ */
export function waitForOAuthCallback(timeoutMs: number): Promise<string> {
  if (pendingOAuth) {
    clearTimeout(pendingOAuth.timeoutId);
    pendingOAuth.reject(new Error('前回の Google ログインが中断されました'));
    pendingOAuth = null;
  }

  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (pendingOAuth) {
        pendingOAuth = null;
      }
      reject(
        new Error(
          'ログインがタイムアウトしました。\n' +
            '・Supabase の Redirect URLs に hontalk://auth/callback を追加\n' +
            '・シミュレータでは QR コードではなく、メール/パスワードでログイン\n' +
            '・可能なら実機で試してください',
        ),
      );
    }, timeoutMs);

    pendingOAuth = { resolve, reject, timeoutId };
  });
}

/** 待機中の OAuth を完了させる（Linking から呼ぶ） */
export function notifyOAuthCallback(url: string): boolean {
  if (!isOAuthCallbackUrl(url) || !pendingOAuth) {
    return false;
  }

  WebBrowser.dismissAuthSession();
  clearTimeout(pendingOAuth.timeoutId);
  pendingOAuth.resolve(url);
  pendingOAuth = null;
  return true;
}

/** 待機中の OAuth をキャンセルする */
export function cancelPendingOAuth(): void {
  if (!pendingOAuth) return;
  clearTimeout(pendingOAuth.timeoutId);
  pendingOAuth.reject(new Error('Google ログインがキャンセルされました'));
  pendingOAuth = null;
}
