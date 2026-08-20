import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { handleError } from '@/utils/errorHandler';
import type { ReviewWithDetails } from '@/services/reviewService';

export const timelineKeys = {
  all: ['timeline'] as const,
  following: (userId: string) => [...timelineKeys.all, 'following', userId] as const,
  recent: (userId?: string) => [...timelineKeys.all, 'recent', userId ?? ''] as const,
};

const TIMELINE_LIMIT = 10;

function mapTimelineRows(data: unknown): ReviewWithDetails[] {
  return ((data as any[]) || []).map((row) => ({
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
}

async function fetchTimelinePage(
  userId: string | undefined,
  pageParam: number,
  followingOnly: boolean,
) {
  const { data, error } = await supabase.rpc('get_timeline', {
    p_user_id: userId ?? undefined,
    p_limit: TIMELINE_LIMIT,
    p_offset: pageParam,
    p_following_only: followingOnly,
  });

  if (error) {
    throw new Error(handleError(error).message);
  }

  const items = mapTimelineRows(data);
  return {
    items,
    nextPage: items.length === TIMELINE_LIMIT ? pageParam + TIMELINE_LIMIT : undefined,
  };
}

export function useTimeline() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useInfiniteQuery({
    queryKey: timelineKeys.following(currentUserId ?? ''),
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      fetchTimelinePage(currentUserId, pageParam, true),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!currentUserId,
  });
}

export function useRecentReviews() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useInfiniteQuery({
    queryKey: timelineKeys.recent(currentUserId),
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      fetchTimelinePage(currentUserId, pageParam, false),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
