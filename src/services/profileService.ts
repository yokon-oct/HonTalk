/**
 * プロフィールサービス
 *
 * - プロフィールの取得・更新
 * - 読書統計の取得
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/** プロフィール + 統計情報 */
export interface ProfileWithStats extends ProfileRow {
  stats: {
    following_count: number;
    followers_count: number;
    read_count: number;
    want_to_read_count: number;
  };
}

// ==========================================
// プロフィール取得・更新
// ==========================================

/**
 * プロフィールを ID で取得する
 */
export async function getProfileById(
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

/**
 * プロフィールを統計情報付きで取得する
 */
export async function getProfileWithStats(
  userId: string,
): Promise<ProfileWithStats | null> {
  const profile = await getProfileById(userId);
  if (!profile) return null;

  // 並列で統計を取得
  const [followingRes, followerRes, readRes, wantToReadRes] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('reading_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'finished'),
    supabase
      .from('reading_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'want_to_read'),
  ]);

  return {
    ...profile,
    stats: {
      following_count: followingRes.count ?? 0,
      followers_count: followerRes.count ?? 0,
      read_count: readRes.count ?? 0,
      want_to_read_count: wantToReadRes.count ?? 0,
    }
  };
}

/**
 * プロフィールを更新する
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * ニックネームの重複チェック
 */
export async function isNicknameAvailable(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !data;
}

/**
 * ニックネームでプロフィールを検索する
 */
export async function searchProfiles(
  query: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ProfileRow[]> {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nickname', `%${query}%`)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

// ==========================================
// アバター画像
// ==========================================

/**
 * アバター画像をアップロードする
 */
export async function uploadAvatar(
  userId: string,
  file: {
    uri: string;
    type?: string;
    name?: string;
  },
): Promise<string> {
  const fileExt = file.name?.split('.').pop() ?? 'jpg';
  const fileName = `${userId}/avatar.${fileExt}`;

  // fetch でファイルを取得して Blob に変換
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      contentType: file.type ?? 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // 公開 URL を取得
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // プロフィールを更新
  await updateProfile(userId, { avatar_url: urlData.publicUrl });

  return urlData.publicUrl;
}
