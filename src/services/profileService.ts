/**
 * プロフィールサービス
 *
 * - プロフィールの取得・更新
 * - 読書統計の取得
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

const AVATAR_SIZE = 400;

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

  // RLS では他人の読書記録が見えないため、SECURITY DEFINER の RPC で集計する
  const { data: stats, error: statsError } = await supabase.rpc('get_profile_stats', {
    p_user_id: userId,
  });

  if (statsError) throw statsError;

  const parsed =
    typeof stats === 'string' ? (JSON.parse(stats) as ProfileWithStats['stats']) : stats;

  return {
    ...profile,
    stats: {
      following_count: parsed?.following_count ?? 0,
      followers_count: parsed?.followers_count ?? 0,
      read_count: parsed?.read_count ?? 0,
      want_to_read_count: parsed?.want_to_read_count ?? 0,
    },
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
 * 正方形にトリミングして JPEG に変換する。
 * iOS の HEIC など、ブラウザで表示できない形式もここで吸収する。
 */
async function prepareAvatarImage(uri: string): Promise<string> {
  const source = await ImageManipulator.manipulateAsync(uri, [], { compress: 1 });
  const size = Math.min(source.width, source.height);
  const originX = Math.floor((source.width - size) / 2);
  const originY = Math.floor((source.height - size) / 2);

  const result = await ImageManipulator.manipulateAsync(
    source.uri,
    [
      { crop: { originX, originY, width: size, height: size } },
      { resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } },
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  return result.uri;
}

/**
 * アバター画像をアップロードする
 *
 * React Native では Blob / FormData による Storage アップロードが失敗するため、
 * ArrayBuffer で送信する。
 */
export async function uploadAvatar(
  userId: string,
  file: {
    uri: string;
    type?: string;
    name?: string;
  },
): Promise<string> {
  const preparedUri = await prepareAvatarImage(file.uri);
  const fileName = `${userId}/avatar.jpg`;

  const response = await fetch(preparedUri);
  if (!response.ok) {
    throw new Error('画像の読み込みに失敗しました');
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('画像データの読み込みに失敗しました');
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // 同一パスの上書きでも Image キャッシュを更新できるようクエリを付ける
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
}
