import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type NotificationWithActor = NotificationRow & {
  actor: Pick<ProfileRow, 'id' | 'nickname' | 'avatar_url'> | null;
};

/**
 * 新しい通知を作成する
 * create_notification RPC (SECURITY DEFINER) 経由で作成し、
 * - 自分自身への通知スキップ
 * - ユーザーの通知設定の尊重
 * をDB側で一元管理する
 *
 * 続けて send-push-notification Edge Function を呼び出し、
 * 対象ユーザーの登録済み端末にプッシュ通知を送信する。
 * （送信可否・通知設定の再チェックは Edge Function 側で行う）
 */
export async function createNotification(
  notification: Pick<NotificationInsert, 'user_id' | 'actor_id' | 'type' | 'reference_type' | 'reference_id' | 'message'>
): Promise<void> {
  const { error } = await supabase.rpc('create_notification', {
    p_user_id: notification.user_id,
    p_actor_id: notification.actor_id ?? notification.user_id,
    p_type: notification.type,
    p_reference_type: notification.reference_type ?? null,
    p_reference_id: notification.reference_id ?? null,
    p_message: notification.message ?? null,
  });

  if (error) {
    console.error('Failed to create notification:', error);
    // 通知作成の失敗で親の処理（いいね等）を失敗させないよう、throwせずログのみ残す
    return;
  }

  // プッシュ送信は失敗してもアプリ内通知の作成自体には影響させない（fire-and-forget）
  supabase.functions
    .invoke('send-push-notification', {
      body: {
        user_id: notification.user_id,
        actor_id: notification.actor_id ?? notification.user_id,
        type: notification.type,
        reference_type: notification.reference_type ?? null,
        reference_id: notification.reference_id ?? null,
        message: notification.message ?? null,
      },
    })
    .catch((pushError) => {
      console.error('Failed to invoke send-push-notification:', pushError);
    });
}

/**
 * ユーザーの通知一覧を取得する
 */
export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<NotificationWithActor[]> {
  const { limit = 30, offset = 0 } = options;

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(id, nickname, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as NotificationWithActor[];
}

/**
 * 未読の通知件数を取得する
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * 特定の通知を既読にする
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * ユーザーの全通知を既読にする
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}
