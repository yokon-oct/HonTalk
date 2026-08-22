/**
 * 環境変数設定
 *
 * EXPO_PUBLIC_ プレフィックス付き変数はクライアントに公開される。
 * 秘密鍵は Edge Functions のシークレットとして管理すること。
 */

type AppEnv = 'development' | 'staging' | 'production';

const ENV_CONFIG = {
  development: {
    supabaseUrl: 'http://localhost:54321',
    supabaseAnonKey: '',
  },
  staging: {
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
  production: {
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
} as const;

const currentEnv: AppEnv =
  (process.env.EXPO_PUBLIC_APP_ENV as AppEnv) ?? 'development';

export const config = {
  env: currentEnv,
  isDev: currentEnv === 'development',
  isProd: currentEnv === 'production',
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    ENV_CONFIG[currentEnv].supabaseUrl,
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    ENV_CONFIG[currentEnv].supabaseAnonKey,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;

/** Supabase 接続設定が実機ビルド向けに不足・不正な場合の説明を返す */
export function getSupabaseConfigIssue(): string | null {
  const { supabaseUrl, supabaseAnonKey } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    return 'アプリの接続設定が不足しています。最新ビルドを再インストールしてください。';
  }

  if (supabaseUrl.includes('placeholder.supabase.co')) {
    return 'アプリの接続設定が正しく組み込まれていません。EAS ビルドの環境変数を確認してください。';
  }

  if (
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.startsWith('http://10.') ||
    supabaseUrl.startsWith('http://192.168.')
  ) {
    return 'このビルドは開発用サーバー向けです。実機では preview / production ビルドをご利用ください。';
  }

  return null;
}
