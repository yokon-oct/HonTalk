/**
 * ランキング取得カスタムフック
 *
 * 人気の本 / 話題のレビュー / 注目のユーザー の各ランキングを
 * 週間・月間の期間指定で取得する。
 */

import { useQuery } from '@tanstack/react-query';
import * as rankingService from '@/services/rankingService';
import { useAuthStore } from '@/stores/authStore';
import type { RankingPeriod } from '@/services/rankingService';

export const rankingKeys = {
  all: ['ranking'] as const,
  books: (period: RankingPeriod) => [...rankingKeys.all, 'books', period] as const,
  reviews: (period: RankingPeriod) => [...rankingKeys.all, 'reviews', period] as const,
  users: (period: RankingPeriod) => [...rankingKeys.all, 'users', period] as const,
};

/** ランキングは即時性より一覧の安定性を優先し、5分間キャッシュする */
const RANKING_STALE_TIME = 5 * 60_000;

/**
 * 人気の本ランキングを取得する
 */
export function useBookRanking(period: RankingPeriod, enabled = true) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: rankingKeys.books(period),
    queryFn: () => rankingService.getBookRanking(period, currentUserId),
    staleTime: RANKING_STALE_TIME,
    enabled,
  });
}

/**
 * 話題のレビューランキングを取得する
 */
export function useReviewRanking(period: RankingPeriod, enabled = true) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: rankingKeys.reviews(period),
    queryFn: () => rankingService.getReviewRanking(period, currentUserId),
    staleTime: RANKING_STALE_TIME,
    enabled,
  });
}

/**
 * 注目のユーザーランキングを取得する
 */
export function useUserRanking(period: RankingPeriod, enabled = true) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: rankingKeys.users(period),
    queryFn: () => rankingService.getUserRanking(period, currentUserId),
    staleTime: RANKING_STALE_TIME,
    enabled,
  });
}
