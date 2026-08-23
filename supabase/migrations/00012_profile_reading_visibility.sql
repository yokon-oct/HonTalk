-- ==========================================
-- Migration 00012: 他ユーザーの読了数・本棚を正しく表示する
--
-- reading_records の SELECT は「自分の記録」または「公開レビューに紐づく記録」
-- しか許可されていなかったため、レビュー未作成の読了が他人のプロフィールで 0 件に見えていた。
-- ==========================================

-- A. プロフィールの公開範囲に応じて読書記録を閲覧可能にする
DROP POLICY IF EXISTS "reading_records_select_own_or_via_review" ON public.reading_records;
DROP POLICY IF EXISTS "reading_records_select_visible" ON public.reading_records;

CREATE POLICY "reading_records_select_visible"
ON public.reading_records FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.reading_record_id = reading_records.id
          AND r.is_public = TRUE
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = reading_records.user_id
          AND (
            p.privacy_setting = 'public'
            OR (
                p.privacy_setting = 'followers_only'
                AND EXISTS (
                    SELECT 1 FROM public.follows f
                    WHERE f.follower_id = auth.uid()
                      AND f.following_id = reading_records.user_id
                )
            )
          )
    )
);

-- B. 統計 RPC も同じ公開範囲に合わせる（SECURITY DEFINER のため明示する）
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_privacy TEXT;
    v_can_view BOOLEAN;
    v_followers_count INTEGER;
    v_following_count INTEGER;
    v_read_count INTEGER := 0;
    v_want_to_read_count INTEGER := 0;
BEGIN
    SELECT privacy_setting INTO v_privacy
    FROM public.profiles
    WHERE id = p_user_id;

    v_can_view :=
        p_user_id = auth.uid()
        OR v_privacy = 'public'
        OR (
            v_privacy = 'followers_only'
            AND EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.follower_id = auth.uid()
                  AND f.following_id = p_user_id
            )
        );

    SELECT COUNT(*) INTO v_followers_count FROM public.follows WHERE following_id = p_user_id;
    SELECT COUNT(*) INTO v_following_count FROM public.follows WHERE follower_id = p_user_id;

    IF v_can_view THEN
        SELECT COUNT(*) INTO v_read_count
        FROM public.reading_records
        WHERE user_id = p_user_id AND status = 'finished';

        SELECT COUNT(*) INTO v_want_to_read_count
        FROM public.reading_records
        WHERE user_id = p_user_id AND status = 'want_to_read';
    END IF;

    RETURN json_build_object(
        'followers_count', v_followers_count,
        'following_count', v_following_count,
        'read_count', v_read_count,
        'want_to_read_count', v_want_to_read_count
    );
END;
$$;
