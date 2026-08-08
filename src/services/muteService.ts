import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

export type MuteRow = Database['public']['Tables']['mutes']['Row'];

export type MutedUserInfo = {
  mute_id: string;
  muted_at: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string;
};

/**
 * ユーザーをミュートする
 */
export async function muteUser(muterId: string, mutedId: string): Promise<void> {
  const { error } = await supabase
    .from('mutes')
    .insert({ muter_id: muterId, muted_id: mutedId });

  if (error) {
    // すでにミュート済みの場合 (unique violation) は無視
    if (error.code === '23505') return;
    throw error;
  }
}

/**
 * ミュートを解除する
 */
export async function unmuteUser(muterId: string, mutedId: string): Promise<void> {
  const { error } = await supabase
    .from('mutes')
    .delete()
    .eq('muter_id', muterId)
    .eq('muted_id', mutedId);

  if (error) throw error;
}

/**
 * 指定ユーザーをミュートしているかチェックする
 */
export async function isMuting(muterId: string, mutedId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_muting', {
    p_muter_id: muterId,
    p_muted_id: mutedId,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * ミュートしているユーザーの一覧を取得する
 */
export async function getMutedUsers(userId: string): Promise<MutedUserInfo[]> {
  const { data, error } = await supabase.rpc('get_muted_users', {
    p_user_id: userId,
  });

  if (error) throw error;
  return (data ?? []) as MutedUserInfo[];
}
