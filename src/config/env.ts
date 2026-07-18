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
