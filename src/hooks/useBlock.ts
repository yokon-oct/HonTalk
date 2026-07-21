import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as blockService from '@/services/blockService';
import { useAuthStore } from '@/stores/authStore';

export const blockKeys = {
  all: ['blocks'] as const,
  isBlocking: (blockerId: string, blockedId: string) =>
    [...blockKeys.all, 'isBlocking', blockerId, blockedId] as const,
  blockedUsers: (userId: string) =>
    [...blockKeys.all, 'blockedUsers', userId] as const,
};

// ==========================================
// Queries
// ==========================================

/**
 * 指定ユーザーをブロックしているか確認するクエリ
 */
export function useIsBlocking(targetId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: blockKeys.isBlocking(currentUserId ?? '', targetId),
    queryFn: () => blockService.isBlocking(currentUserId!, targetId),
    enabled: !!currentUserId && !!targetId && currentUserId !== targetId,
    staleTime: 30_000,
  });
}

/**
 * ブロックしているユーザー一覧を取得するクエリ
 */
export function useBlockedUsers() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: blockKeys.blockedUsers(currentUserId ?? ''),
    queryFn: () => blockService.getBlockedUsers(currentUserId!),
    enabled: !!currentUserId,
  });
}

// ==========================================
// Mutations
// ==========================================

/**
 * ブロック / ブロック解除ミューテーション
 */
export function useToggleBlock() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({
      targetId,
      isBlocking,
    }: {
      targetId: string;
      isBlocking: boolean;
    }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      if (isBlocking) {
        await blockService.unblockUser(currentUserId, targetId);
      } else {
        await blockService.blockUser(currentUserId, targetId);
      }
      return { targetId, isBlocking: !isBlocking };
    },
    onSuccess: ({ targetId }) => {
      if (!currentUserId) return;
      // ブロック状態を更新
      queryClient.invalidateQueries({
        queryKey: blockKeys.isBlocking(currentUserId, targetId),
      });
      // ブロックリストを更新
      queryClient.invalidateQueries({
        queryKey: blockKeys.blockedUsers(currentUserId),
      });
    },
  });
}

/**
 * ブロック解除ミューテーション（ブロックリスト画面用）
 */
export function useUnblock() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({ targetId }: { targetId: string }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      await blockService.unblockUser(currentUserId, targetId);
      return { targetId };
    },
    onSuccess: ({ targetId }) => {
      if (!currentUserId) return;
      queryClient.invalidateQueries({
        queryKey: blockKeys.isBlocking(currentUserId, targetId),
      });
      queryClient.invalidateQueries({
        queryKey: blockKeys.blockedUsers(currentUserId),
      });
    },
  });
}
