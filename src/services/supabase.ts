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

let supabaseClient: SupabaseClient<Database>;
let jwtRefreshInFlight: Promise<string | null> | null = null;

function requestUrlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isJwtIssuedAtFuture(status: number, body: unknown): boolean {
  if (status !== 401 && status !== 400) return false;
  if (!body || typeof body !== 'object') return false;
  const { code, message } = body as { code?: unknown; message?: unknown };
  const codeText = typeof code === 'string' ? code : '';
  const messageText = typeof message === 'string' ? message.toLowerCase() : '';
  return (
    messageText.includes('jwt issued at future') ||
    (codeText === 'PGRST303' && messageText.includes('issued at future'))
  );
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!jwtRefreshInFlight) {
    jwtRefreshInFlight = (async () => {
      try {
        const { data, error } = await supabaseClient.auth.refreshSession();
        if (error || !data.session) return null;
        return data.session.access_token;
      } catch {
        return null;
      } finally {
        jwtRefreshInFlight = null;
      }
    })();
  }
  return jwtRefreshInFlight;
}

/**
 * PostgREST の時刻ずれ（PGRST303 JWT issued at future）を吸収する。
 * シミュレータや Docker スリープ後に、保存済み JWT の iat がサーバー時刻より先になることがある。
 */
async function fetchWithJwtClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const url = requestUrlOf(input);
  if (url.includes('/auth/v1/')) return response;
  if (response.status !== 401 && response.status !== 400) return response;

  let payload: unknown;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  if (!isJwtIssuedAtFuture(response.status, payload)) return response;

  const accessToken = await refreshAccessTokenOnce();
  if (!accessToken) return response;

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}

supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    fetch: fetchWithJwtClockSkewRetry,
  },
});

export const supabase: SupabaseClient<Database> = supabaseClient;
