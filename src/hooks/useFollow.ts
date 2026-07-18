import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as followService from '@/services/followService';
import { useAuthStore } from '@/stores/authStore';
import { profileKeys } from './useProfile';

export const followKeys = {
  all: ['follows'] as const,
  following: (userId: string) => [...followKeys.all, 'following', userId] as const,
  followers: (userId: string) => [...followKeys.all, 'followers', userId] as const,
  counts: (userId: string) => [...followKeys.all, 'counts', userId] as const,
  isFollowing: (userId: string, targetId: string) => [...followKeys.all, 'isFollowing', userId, targetId] as const,
};

// ==========================================
// Queries
// ==========================================

export function useFollowing(userId?: string, limit = 50) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: followKeys.following(targetUserId || ''),
    queryFn: () => followService.getFollowing(targetUserId!, { limit }),
    enabled: !!targetUserId,
  });
}

export function useFollowers(userId?: string, limit = 50) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: followKeys.followers(targetUserId || ''),
    queryFn: () => followService.getFollowers(targetUserId!, { limit }),
    enabled: !!targetUserId,
  });
}

export function useFollowCounts(userId?: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: followKeys.counts(targetUserId || ''),
    queryFn: () => followService.getFollowCounts(targetUserId!),
    enabled: !!targetUserId,
  });
}

export function useIsFollowing(targetId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: followKeys.isFollowing(currentUserId || '', targetId),
    queryFn: () => followService.isFollowing(currentUserId!, targetId),
    enabled: !!currentUserId && !!targetId,
  });
}

// ==========================================
// Mutations
// ==========================================

export function useToggleFollow() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({ targetId, isFollowing }: { targetId: string; isFollowing: boolean }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      if (isFollowing) {
        await followService.unfollowUser(currentUserId, targetId);
      } else {
        await followService.followUser(currentUserId, targetId);
      }
      return { targetId, isFollowing: !isFollowing };
    },
    onSuccess: ({ targetId }) => {
      if (currentUserId) {
        // フォロー状態を更新
        queryClient.invalidateQueries({ queryKey: followKeys.isFollowing(currentUserId, targetId) });
        // 自分のフォローリストとカウントを更新
        queryClient.invalidateQueries({ queryKey: followKeys.following(currentUserId) });
        queryClient.invalidateQueries({ queryKey: followKeys.counts(currentUserId) });
        queryClient.invalidateQueries({ queryKey: profileKeys.stats(currentUserId) });
        // 相手のフォロワーリストとカウントを更新
        queryClient.invalidateQueries({ queryKey: followKeys.followers(targetId) });
        queryClient.invalidateQueries({ queryKey: followKeys.counts(targetId) });
        queryClient.invalidateQueries({ queryKey: profileKeys.stats(targetId) });
      }
    },
  });
}
