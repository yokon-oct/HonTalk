import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as muteService from '@/services/muteService';
import { useAuthStore } from '@/stores/authStore';
import { timelineKeys } from './useTimeline';

export const muteKeys = {
  all: ['mutes'] as const,
  isMuting: (muterId: string, mutedId: string) =>
    [...muteKeys.all, 'isMuting', muterId, mutedId] as const,
  mutedUsers: (userId: string) =>
    [...muteKeys.all, 'mutedUsers', userId] as const,
};

function invalidateMuteQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  currentUserId: string,
  targetId: string,
) {
  queryClient.invalidateQueries({
    queryKey: muteKeys.isMuting(currentUserId, targetId),
  });
  queryClient.invalidateQueries({
    queryKey: muteKeys.mutedUsers(currentUserId),
  });
  // タイムライン / 新着からミュート対象を即座に反映
  queryClient.invalidateQueries({ queryKey: timelineKeys.all });
  queryClient.invalidateQueries({ queryKey: timelineKeys.recent });
}

// ==========================================
// Queries
// ==========================================

/**
 * 指定ユーザーをミュートしているか確認するクエリ
 */
export function useIsMuting(targetId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: muteKeys.isMuting(currentUserId ?? '', targetId),
    queryFn: () => muteService.isMuting(currentUserId!, targetId),
    enabled: !!currentUserId && !!targetId && currentUserId !== targetId,
    staleTime: 30_000,
  });
}

/**
 * ミュートしているユーザー一覧を取得するクエリ
 */
export function useMutedUsers() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: muteKeys.mutedUsers(currentUserId ?? ''),
    queryFn: () => muteService.getMutedUsers(currentUserId!),
    enabled: !!currentUserId,
  });
}

// ==========================================
// Mutations
// ==========================================

/**
 * ミュート / ミュート解除ミューテーション
 */
export function useToggleMute() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({
      targetId,
      isMuting,
    }: {
      targetId: string;
      isMuting: boolean;
    }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      if (isMuting) {
        await muteService.unmuteUser(currentUserId, targetId);
      } else {
        await muteService.muteUser(currentUserId, targetId);
      }
      return { targetId, isMuting: !isMuting };
    },
    onSuccess: ({ targetId }) => {
      if (!currentUserId) return;
      invalidateMuteQueries(queryClient, currentUserId, targetId);
    },
  });
}

/**
 * ミュート解除ミューテーション（ミュートリスト画面用）
 */
export function useUnmute() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({ targetId }: { targetId: string }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      await muteService.unmuteUser(currentUserId, targetId);
      return { targetId };
    },
    onSuccess: ({ targetId }) => {
      if (!currentUserId) return;
      invalidateMuteQueries(queryClient, currentUserId, targetId);
    },
  });
}
