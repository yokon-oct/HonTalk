/**
 * レビューサービス
 *
 * - レビューの CRUD 操作
 * - いいね（like）の操作
 * - コメントの操作
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';
import { createNotification } from './notificationService';

type ReviewRow = Database['public']['Tables']['reviews']['Row'];
type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];
type CommentRow = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];

/** レビュー + ユーザー + 書籍情報を含む型 */
export interface ReviewWithDetails extends ReviewRow {
  user: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string | null;
  } | null;
  reading_record: {
    rating: number | null;
  } | null;
}

/** コメント + ユーザー情報を含む型 */
export interface CommentWithUser extends CommentRow {
  user: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
}

// ==========================================
// レビュー CRUD
// ==========================================

/**
 * レビューを作成する
 */
export async function createReview(
  review: ReviewInsert,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * レビューを更新する
 */
export async function updateReview(
  reviewId: string,
  updates: ReviewUpdate,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * レビューを削除する
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
}

/**
 * レビューを ID で取得する（詳細付き）
 */
export async function getReviewById(
  reviewId: string,
  currentUserId?: string,
): Promise<ReviewWithDetails | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!user_id(id, nickname, avatar_url),
      book:books!book_id(id, title, author, cover_image_url),
      reading_record:reading_records!reading_record_id(rating)
    `)
    .eq('id', reviewId)
    .single();

  if (error) throw error;
  return data as unknown as ReviewWithDetails;
}

/**
 * 書籍のレビュー一覧を取得する
 */
export async function getReviewsByBook(
  bookId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ReviewWithDetails[]> {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!user_id(id, nickname, avatar_url),
      book:books!book_id(id, title, author, cover_image_url),
      reading_record:reading_records!reading_record_id(rating)
    `)
    .eq('book_id', bookId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithDetails[];
}

/**
 * ユーザーのレビュー一覧を取得する
 */
export async function getReviewsByUser(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<ReviewWithDetails[]> {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!user_id(id, nickname, avatar_url),
      book:books!book_id(id, title, author, cover_image_url),
      reading_record:reading_records!reading_record_id(rating)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithDetails[];
}

/**
 * アプリ全体の最新の公開レビューを取得する
 */
export async function getRecentPublicReviews(
  options: { limit?: number; offset?: number } = {},
): Promise<ReviewWithDetails[]> {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!user_id(id, nickname, avatar_url),
      book:books!book_id(id, title, author, cover_image_url),
      reading_record:reading_records!reading_record_id(rating)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithDetails[];
}

// ==========================================
// いいね
// ==========================================

/**
 * レビューにいいねする
 */
export async function likeReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .insert({ user_id: userId, review_id: reviewId });

  if (error) {
    // 既にいいね済みの場合は無視
    if (error.code === '23505') return;
    throw error;
  }

  // like_count をインクリメントし、通知を作成
  try {
    const { data: review } = await supabase
      .from('reviews')
      .select('like_count, user_id')
      .eq('id', reviewId)
      .single();
    
    if (review) {
      await supabase
        .from('reviews')
        .update({ like_count: (review.like_count || 0) + 1 })
        .eq('id', reviewId);
        
      // 通知を作成
      await createNotification({
        user_id: review.user_id,
        actor_id: userId,
        type: 'like',
        reference_type: 'review',
        reference_id: reviewId,
        message: 'あなたのレビューにいいねしました。',
      });
    }
  } catch (err) {
    console.warn('Failed to increment like_count or create notification', err);
  }
}

/**
 * レビューのいいねを取り消す
 */
export async function unlikeReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('review_id', reviewId);

  if (error) throw error;

  // like_count をデクリメント
  try {
    const { data: review } = await supabase
      .from('reviews')
      .select('like_count')
      .eq('id', reviewId)
      .single();
    
    if (review && review.like_count > 0) {
      await supabase
        .from('reviews')
        .update({ like_count: review.like_count - 1 })
        .eq('id', reviewId);
    }
  } catch (err) {
    console.warn('Failed to decrement like_count', err);
  }
}

/**
 * ユーザーがレビューにいいね済みかチェック
 */
export async function isReviewLiked(
  userId: string,
  reviewId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('review_id', reviewId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ==========================================
// コメント
// ==========================================

/**
 * コメントを投稿する
 */
export async function createComment(
  comment: CommentInsert,
): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select()
    .single();

  if (error) throw error;

  // comment_count をインクリメントし、通知を作成
  try {
    const { data: review } = await supabase
      .from('reviews')
      .select('comment_count, user_id')
      .eq('id', comment.review_id)
      .single();
    
    if (review) {
      await supabase
        .from('reviews')
        .update({ comment_count: (review.comment_count || 0) + 1 })
        .eq('id', comment.review_id);
        
      // 通知を作成
      await createNotification({
        user_id: review.user_id,
        actor_id: comment.user_id,
        type: 'comment',
        reference_type: 'review',
        reference_id: comment.review_id,
        message: 'あなたのレビューにコメントしました。',
      });
    }
  } catch (err) {
    console.warn('Failed to increment comment_count or create notification', err);
  }

  return data!;
}

/**
 * コメントを削除する
 */
export async function deleteComment(commentId: string): Promise<void> {
  // 削除対象のコメントから review_id を取得
  const { data: comment } = await supabase
    .from('comments')
    .select('review_id')
    .eq('id', commentId)
    .single();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;

  // comment_count を手動でデクリメント
  if (comment?.review_id) {
    try {
      const { data: review } = await supabase
        .from('reviews')
        .select('comment_count')
        .eq('id', comment.review_id)
        .single();
      
      if (review && review.comment_count > 0) {
        await supabase
          .from('reviews')
          .update({ comment_count: review.comment_count - 1 })
          .eq('id', comment.review_id);
      }
    } catch (err) {
      console.warn('Failed to decrement comment_count', err);
    }
  }
}

/**
 * レビューのコメント一覧を取得する
 */
export async function getCommentsByReview(
  reviewId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<CommentWithUser[]> {
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!user_id(id, nickname, avatar_url)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as CommentWithUser[];
}
