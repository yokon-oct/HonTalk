/**
 * Supabase クライアント初期化
 *
 * expo-secure-store は 2048 bytes 制限があるため、
 * 大きなセッション JWT はチャンク分割して保存する。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { config } from '@/config/env';
import type { Database } from '@/types/database.types';

/** SecureStore 制限 (2048) より余裕を持たせる */
const SECURE_STORE_CHUNK_SIZE = 1800;

async function deleteSecureItem(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // 未存在キーは無視
  }
}

/**
 * SecureStore ベースのストレージアダプター
 * Web では localStorage にフォールバック
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountRaw != null) {
      const chunkCount = Number(chunkCountRaw);
      if (!Number.isFinite(chunkCount) || chunkCount <= 0) return null;

      let value = '';
      for (let i = 0; i < chunkCount; i += 1) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk == null) return null;
        value += chunk;
      }
      return value;
    }

    // 移行前の単一キーも読めるようにする
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    // 旧形式を掃除
    await deleteSecureItem(key);

    const previousCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    const previousCount = previousCountRaw ? Number(previousCountRaw) : 0;
    if (Number.isFinite(previousCount) && previousCount > 0) {
      for (let i = 0; i < previousCount; i += 1) {
        await deleteSecureItem(`${key}_${i}`);
      }
    }

    const chunkCount = Math.max(1, Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE));
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));

    for (let i = 0; i < chunkCount; i += 1) {
      const chunk = value.slice(
        i * SECURE_STORE_CHUNK_SIZE,
        (i + 1) * SECURE_STORE_CHUNK_SIZE,
      );
      await SecureStore.setItemAsync(`${key}_${i}`, chunk);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    const chunkCount = chunkCountRaw ? Number(chunkCountRaw) : 0;
    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      for (let i = 0; i < chunkCount; i += 1) {
        await deleteSecureItem(`${key}_${i}`);
      }
      await deleteSecureItem(`${key}_chunks`);
    }

    await deleteSecureItem(key);
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
      '.env.local に EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を設定してください。',
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
      flowType: 'pkce',
    },
  },
);
