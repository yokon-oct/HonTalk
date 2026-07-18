/**
 * Supabase クライアント初期化
 *
 * expo-secure-store をストレージアダプターとして使用し、
 * JWTトークンを安全に永続化する。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { config } from '@/config/env';
import type { Database } from '@/types/database.types';

/**
 * SecureStore ベースのストレージアダプター
 * Web ではlocalStorageにフォールバック
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
/**
 * Supabase 未設定時のフォールバック
 *
 * Supabase のプロジェクトをまだ作成していない開発初期段階では
 * URL/Key が空になる。その場合でもアプリが起動できるよう
 * ダミー値でクライアントを生成する（API コールは当然失敗する）。
 */
const SUPABASE_URL = config.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY =
  config.supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder';

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn(
    '[HonTalk] Supabase の環境変数が未設定です。' +
      '.env.local に EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
