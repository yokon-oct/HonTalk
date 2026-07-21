import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

export type BlockRow = Database['public']['Tables']['blocks']['Row'];

export type BlockedUserInfo = {
  block_id: string;
  blocked_at: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string;
};

/**
 * ユーザーをブロックする
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error) {
    // すでにブロック済みの場合 (unique violation) は無視
    if (error.code === '23505') return;
    throw error;
  }
}

/**
 * ブロックを解除する
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

/**
 * 指定ユーザーをブロックしているかチェックする
 */
export async function isBlocking(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_blocking', {
    p_blocker_id: blockerId,
    p_blocked_id: blockedId,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * ブロックしているユーザーの一覧を取得する
 */
export async function getBlockedUsers(userId: string): Promise<BlockedUserInfo[]> {
  const { data, error } = await supabase.rpc('get_blocked_users', {
    p_user_id: userId,
  });

  if (error) throw error;
  return (data ?? []) as BlockedUserInfo[];
}
