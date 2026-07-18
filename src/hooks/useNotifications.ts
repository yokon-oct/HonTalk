import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationService from '@/services/notificationService';
import { useAuthStore } from '@/stores/authStore';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unreadCount', userId] as const,
};

export function useNotifications(limit = 30) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: notificationKeys.list(currentUserId || ''),
    queryFn: () => notificationService.getNotifications(currentUserId!, { limit }),
    enabled: !!currentUserId,
  });
}

export function useUnreadNotificationCount() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: notificationKeys.unreadCount(currentUserId || ''),
    queryFn: () => notificationService.getUnreadCount(currentUserId!),
    enabled: !!currentUserId,
    // 未読件数は定期的にポーリングするか、リアルタイムリスナーで更新するのが理想ですが
    // 今回は簡易的にフォーカス時などに再フェッチさせます
    refetchInterval: 30000, // 30秒ごとに自動更新
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(currentUserId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(currentUserId) });
      }
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: () => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return notificationService.markAllAsRead(currentUserId);
    },
    onSuccess: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(currentUserId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(currentUserId) });
      }
    },
  });
}
