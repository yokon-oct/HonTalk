import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewService from '@/services/reviewService';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database.types';
import { timelineKeys } from './useTimeline';

type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export const reviewKeys = {
  all: ['reviews'] as const,
  byBook: (bookId: string) => [...reviewKeys.all, 'book', bookId] as const,
  byUser: (userId: string) => [...reviewKeys.all, 'user', userId] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
  likes: (reviewId: string) => [...reviewKeys.all, 'likes', reviewId] as const,
  comments: (reviewId: string) => [...reviewKeys.all, 'comments', reviewId] as const,
};

// ==========================================
// Queries
// ==========================================

export function useReviewsByBook(bookId: string, limit = 20) {
  return useQuery({
    queryKey: reviewKeys.byBook(bookId),
    queryFn: () => reviewService.getReviewsByBook(bookId, { limit }),
    enabled: !!bookId,
  });
}

export function useReviewsByUser(userId?: string, limit = 20) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: reviewKeys.byUser(targetUserId || ''),
    queryFn: () => reviewService.getReviewsByUser(targetUserId!, { limit }),
    enabled: !!targetUserId,
  });
}

export function useReviewDetail(reviewId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => reviewService.getReviewById(reviewId, currentUserId),
    enabled: !!reviewId,
  });
}

export function useReviewComments(reviewId: string, limit = 50) {
  return useQuery({
    queryKey: reviewKeys.comments(reviewId),
    queryFn: () => reviewService.getCommentsByReview(reviewId, { limit }),
    enabled: !!reviewId,
  });
}

export function useIsReviewLiked(reviewId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...reviewKeys.likes(reviewId), currentUserId],
    queryFn: () => reviewService.isReviewLiked(currentUserId!, reviewId),
    enabled: !!currentUserId && !!reviewId,
  });
}

// ==========================================
// Mutations
// ==========================================

export function useCreateReview() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (review: Omit<ReviewInsert, 'user_id'>) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return reviewService.createReview({ ...review, user_id: currentUserId });
    },
    onSuccess: (data) => {
      if (data.book_id) {
        queryClient.invalidateQueries({ queryKey: reviewKeys.byBook(data.book_id) });
      }
      queryClient.invalidateQueries({ queryKey: reviewKeys.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ReviewUpdate }) => {
      return reviewService.updateReview(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(data.id) });
      if (data.book_id) {
        queryClient.invalidateQueries({ queryKey: reviewKeys.byBook(data.book_id) });
      }
      queryClient.invalidateQueries({ queryKey: reviewKeys.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewService.deleteReview(reviewId),
    onSuccess: () => {
      // 削除されたレビューのbookId等が引数からはわからないため、全体をinvalidateするか
      // 呼び出し元で onSuccess コールバックを利用して対応する
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useToggleLikeReview() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({ reviewId, isLiked }: { reviewId: string; isLiked: boolean }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      if (isLiked) {
        await reviewService.unlikeReview(currentUserId, reviewId);
      } else {
        await reviewService.likeReview(currentUserId, reviewId);
      }
      return { reviewId, isLiked: !isLiked };
    },
    onSuccess: ({ reviewId }) => {
      queryClient.invalidateQueries({ queryKey: [...reviewKeys.likes(reviewId), currentUserId] });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
      // タイムライン上のlike_countも更新する
      queryClient.invalidateQueries({ queryKey: timelineKeys.all });
      queryClient.invalidateQueries({ queryKey: timelineKeys.recent });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (comment: Omit<CommentInsert, 'user_id'>) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return reviewService.createComment({ ...comment, user_id: currentUserId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.comments(data.review_id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(data.review_id) }); // コメント数を更新
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; reviewId: string }) => 
      reviewService.deleteComment(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.comments(variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
