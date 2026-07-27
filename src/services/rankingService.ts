/**
 * ランキングサービス
 *
 * - 人気の本 / 話題のレビュー / 注目のユーザー ランキングの取得
 * - 週間 / 月間の集計期間切り替えに対応
 */

import { supabase } from './supabase';

export type RankingPeriod = 'week' | 'month';

/** 人気の本ランキング 1件分のデータ */
export interface BookRankingItem {
  book_id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  genre: string | null;
  average_rating: number;
  rating_count: number;
  new_registrations: number;
  new_reviews: number;
  period_likes: number;
  score: number;
}

/** 話題のレビューランキング 1件分のデータ（フラット構造） */
export interface ReviewRankingItem {
  review_id: string;
  content: string;
  has_spoiler: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  user_nickname: string;
  user_avatar_url: string | null;
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url: string | null;
  rating: number | null;
  period_likes: number;
  period_comments: number;
  score: number;
}

/** 注目のユーザーランキング 1件分のデータ */
export interface UserRankingItem {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  new_followers: number;
  new_reviews: number;
  period_likes_received: number;
  score: number;
}

/**
 * 人気の本ランキングを取得する
 */
export async function getBookRanking(
  period: RankingPeriod,
  viewerId?: string | null,
  limit = 20,
): Promise<BookRankingItem[]> {
  const { data, error } = await supabase.rpc('get_book_ranking', {
    p_period: period,
    p_viewer_id: viewerId ?? null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as unknown as BookRankingItem[];
}

/**
 * 話題のレビューランキングを取得する
 */
export async function getReviewRanking(
  period: RankingPeriod,
  viewerId?: string | null,
  limit = 20,
): Promise<ReviewRankingItem[]> {
  const { data, error } = await supabase.rpc('get_review_ranking', {
    p_period: period,
    p_viewer_id: viewerId ?? null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as unknown as ReviewRankingItem[];
}

/**
 * 注目のユーザーランキングを取得する
 */
export async function getUserRanking(
  period: RankingPeriod,
  viewerId?: string | null,
  limit = 20,
): Promise<UserRankingItem[]> {
  const { data, error } = await supabase.rpc('get_user_ranking', {
    p_period: period,
    p_viewer_id: viewerId ?? null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as unknown as UserRankingItem[];
}
