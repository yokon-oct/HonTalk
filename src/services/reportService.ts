import { supabase } from './supabase';

export type ReportTargetType = 'user' | 'review' | 'comment';
export type ReportCategory = 'spam' | 'inappropriate' | 'harassment' | 'other';

export type SubmitReportResult =
  | { success: true; report_id: string }
  | { success: false; error: 'already_reported' | 'invalid_target_type' | 'invalid_category' | 'cannot_report_self' | string };

/**
 * 通報を送信する（重複通報はサーバー側で防止）
 */
export async function submitReport(params: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  description?: string;
}): Promise<SubmitReportResult> {
  const { data, error } = await supabase.rpc('submit_report', {
    p_reporter_id: params.reporterId,
    p_target_type: params.targetType,
    p_target_id: params.targetId,
    p_category: params.category,
    p_description: params.description ?? null,
  });

  if (error) throw error;

  return data as SubmitReportResult;
}
