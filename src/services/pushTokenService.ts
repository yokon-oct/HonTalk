import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

export type PushTokenPlatform = Database['public']['Tables']['push_tokens']['Row']['platform'];

/**
 * Expo Push Token を登録（同一トークンが既にあれば所有者・端末情報を更新）する
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: PushTokenPlatform,
  deviceName?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        device_name: deviceName ?? null,
      },
      { onConflict: 'token' },
    );

  if (error) {
    console.error('Failed to register push token:', error);
  }
}

/**
 * 指定のトークンを削除する（ログアウト時など）
 */
export async function removePushToken(token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);

  if (error) {
    console.error('Failed to remove push token:', error);
  }
}

/**
 * この端末で最後に登録に成功した Expo Push Token
 * ログアウト時にサーバー側のトークンを解除するために保持する
 */
let currentDeviceToken: string | null = null;

export function setCurrentPushToken(token: string | null): void {
  currentDeviceToken = token;
}

export function getCurrentPushToken(): string | null {
  return currentDeviceToken;
}

/**
 * この端末で登録済みの Push Token を解除する（ログアウト時に呼び出す）
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  if (!currentDeviceToken) return;
  await removePushToken(currentDeviceToken);
  currentDeviceToken = null;
}
