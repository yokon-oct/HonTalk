import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as profileService from '@/services/profileService';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database.types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  stats: (id: string) => [...profileKeys.all, 'stats', id] as const,
  search: (query: string) => [...profileKeys.all, 'search', query] as const,
};

// ==========================================
// Queries
// ==========================================

export function useProfile(userId?: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: profileKeys.detail(targetUserId || ''),
    queryFn: () => profileService.getProfileById(targetUserId!),
    enabled: !!targetUserId,
  });
}

export function useProfileWithStats(userId?: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: profileKeys.stats(targetUserId || ''),
    queryFn: () => profileService.getProfileWithStats(targetUserId!),
    enabled: !!targetUserId,
  });
}

export function useSearchProfiles(query: string, limit = 20) {
  return useQuery({
    queryKey: profileKeys.search(query),
    queryFn: () => profileService.searchProfiles(query, { limit }),
    enabled: query.trim().length > 0,
  });
}

// ==========================================
// Mutations
// ==========================================

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      
      if (updates.nickname) {
        const isAvailable = await profileService.isNicknameAvailable(updates.nickname, currentUserId);
        if (!isAvailable) {
          throw new Error('このニックネームは既に使用されています');
        }
      }

      const updated = await profileService.updateProfile(currentUserId, updates);
      return updated;
    },
    onSuccess: (data) => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(currentUserId) });
        queryClient.invalidateQueries({ queryKey: profileKeys.stats(currentUserId) });
        // Zustandのストアも更新（必要なフィールドのみマッピング）
        setProfile(data as any); 
      }
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setProfile = useAuthStore((state) => state.setProfile);
  const profile = useAuthStore((state) => state.profile);

  return useMutation({
    mutationFn: (file: { uri: string; type?: string; name?: string }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return profileService.uploadAvatar(currentUserId, file);
    },
    onSuccess: (url) => {
      if (currentUserId && profile) {
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(currentUserId) });
        queryClient.invalidateQueries({ queryKey: profileKeys.stats(currentUserId) });
        setProfile({ ...profile, avatarUrl: url });
      }
    },
  });
}
