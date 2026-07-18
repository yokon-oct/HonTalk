/**
 * フォローサービス
 *
 * - フォロー / アンフォロー
 * - フォロー状態チェック
 * - フォロー / フォロワー一覧取得
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';
import { createNotification } from './notificationService';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** フォローリストのユーザー情報 */
export interface FollowUser {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string;
}

// ==========================================
// フォロー / アンフォロー
// ==========================================

/**
 * ユーザーをフォローする
 */
export async function followUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) {
    throw new Error('自分自身をフォローすることはできません');
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    // 既にフォロー済みの場合は無視
    if (error.code === '23505') return;
    throw error;
  }

  // フォロー通知の作成
  await createNotification({
    user_id: followingId,
    actor_id: followerId,
    type: 'follow',
    message: 'あなたをフォローしました',
  });
}

/**
 * ユーザーのフォローを解除する
 */
export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

/**
 * フォロー状態をチェックする
 */
export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ==========================================
// フォロー / フォロワー一覧
// ==========================================

/**
 * フォロー中のユーザー一覧を取得する
 */
export async function getFollowing(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<FollowUser[]> {
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:profiles!following_id(id, nickname, avatar_url, bio)
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data ?? []).map(
    (item) => (item as unknown as { following: FollowUser }).following,
  );
}

/**
 * フォロワー一覧を取得する
 */
export async function getFollowers(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<FollowUser[]> {
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follower_id(id, nickname, avatar_url, bio)
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data ?? []).map(
    (item) => (item as unknown as { follower: FollowUser }).follower,
  );
}

/**
 * フォロー数を取得する
 */
export async function getFollowCounts(
  userId: string,
): Promise<{ followingCount: number; followerCount: number }> {
  const [followingRes, followerRes] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
  ]);

  return {
    followingCount: followingRes.count ?? 0,
    followerCount: followerRes.count ?? 0,
  };
}
