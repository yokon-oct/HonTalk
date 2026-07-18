import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getRecentPublicReviews } from '@/services/reviewService';
import type { ReviewWithDetails } from '@/services/reviewService';

export const timelineKeys = {
  all: ['timeline'] as const,
  recent: ['timeline', 'recent'] as const,
};

const TIMELINE_LIMIT = 10;

export function useTimeline() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useInfiniteQuery({
    queryKey: timelineKeys.all,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      // get_timeline RPC を呼び出す（フォロー中のみ）
      const { data, error } = await supabase.rpc('get_timeline', {
        p_user_id: currentUserId || '',
        p_limit: TIMELINE_LIMIT,
        p_offset: pageParam,
        p_following_only: true,
      });

      if (error) {
        console.error('get_timeline RPC Error:', error);
        throw new Error('タイムラインの取得に失敗しました');
      }

      // RPCの戻り値を ReviewWithDetails の型にマッピングする
      const items = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        book_id: row.book_id,
        reading_record_id: null,
        content: row.content,
        is_public: true,
        has_spoiler: row.is_spoiler,
        like_count: row.likes_count,
        comment_count: row.comments_count,
        created_at: row.created_at,
        updated_at: row.created_at,
        user: {
          id: row.user_id,
          nickname: row.user_nickname,
          avatar_url: row.user_avatar_url,
        },
        book: row.book_id ? {
          id: row.book_id,
          title: row.book_title,
          author: row.book_author,
          cover_image_url: row.book_cover_url,
        } : null,
        reading_record: row.rating ? { rating: row.rating } : null,
      })) as ReviewWithDetails[];

      return {
        items,
        nextPage: items.length === TIMELINE_LIMIT ? pageParam + TIMELINE_LIMIT : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useRecentReviews() {
  return useInfiniteQuery({
    queryKey: timelineKeys.recent,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const items = await getRecentPublicReviews({ limit: TIMELINE_LIMIT, offset: pageParam });
      return {
        items,
        nextPage: items.length === TIMELINE_LIMIT ? pageParam + TIMELINE_LIMIT : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
