import { useMutation } from '@tanstack/react-query';
import * as reportService from '@/services/reportService';
import type { ReportTargetType, ReportCategory } from '@/services/reportService';
import { useAuthStore } from '@/stores/authStore';

export type { ReportTargetType, ReportCategory };

/**
 * 通報送信ミューテーション
 */
export function useSubmitReport() {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async (params: {
      targetType: ReportTargetType;
      targetId: string;
      category: ReportCategory;
      description?: string;
    }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');

      const result = await reportService.submitReport({
        reporterId: currentUserId,
        ...params,
      });

      if (!result.success) {
        if (result.error === 'already_reported') {
          throw new Error('already_reported');
        }
        if (result.error === 'cannot_report_self') {
          throw new Error('cannot_report_self');
        }
        throw new Error(result.error);
      }

      return result;
    },
  });
}
