-- ==========================================
-- Migration 00006: Block & Report RPC functions
-- ==========================================


-- ==========================================
-- A. ブロック関連 RPC
-- ==========================================

-- A-1. ブロック状態確認 RPC
-- ブロックしているかどうかを boolean で返す
CREATE OR REPLACE FUNCTION public.is_blocking(
    p_blocker_id UUID,
    p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocks
        WHERE blocker_id = p_blocker_id
          AND blocked_id = p_blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- A-2. ブロックしているユーザー一覧取得 RPC
-- プロフィール情報付きでブロックリストを返す
CREATE OR REPLACE FUNCTION public.get_blocked_users(p_user_id UUID)
RETURNS TABLE (
    block_id UUID,
    blocked_at TIMESTAMPTZ,
    user_id UUID,
    nickname TEXT,
    avatar_url TEXT,
    bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id AS block_id,
        b.created_at AS blocked_at,
        p.id AS user_id,
        p.nickname,
        p.avatar_url,
        p.bio
    FROM public.blocks b
    JOIN public.profiles p ON b.blocked_id = p.id
    WHERE b.blocker_id = p_user_id
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- B. 通報関連 RPC
-- ==========================================

-- B-1. 通報送信 RPC（重複通報防止）
-- 同一ユーザーが同じターゲットに対して重複して通報できないようにする
CREATE OR REPLACE FUNCTION public.submit_report(
    p_reporter_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_category TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 入力バリデーション
    IF p_target_type NOT IN ('user', 'review', 'comment') THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_target_type');
    END IF;

    IF p_category NOT IN ('spam', 'inappropriate', 'harassment', 'other') THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_category');
    END IF;

    -- 自分自身への通報を防ぐ（ユーザー通報の場合）
    IF p_target_type = 'user' AND p_target_id = p_reporter_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'cannot_report_self');
    END IF;

    -- 重複通報チェック（同一ターゲットへの pending/reviewing 状態の通報が既にある場合）
    SELECT id INTO v_existing_id
    FROM public.reports
    WHERE reporter_id = p_reporter_id
      AND target_type = p_target_type
      AND target_id = p_target_id
      AND status IN ('pending', 'reviewing')
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_reported', 'report_id', v_existing_id);
    END IF;

    -- 通報を作成
    INSERT INTO public.reports (
        reporter_id,
        target_type,
        target_id,
        category,
        description
    ) VALUES (
        p_reporter_id,
        p_target_type,
        p_target_id,
        p_category,
        p_description
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'report_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- C. blocks テーブルのインデックス追加
-- ==========================================

-- ブロックされているかの確認クエリを高速化
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
ON public.blocks (blocker_id, blocked_id);

-- ブロックリスト取得の高速化
CREATE INDEX IF NOT EXISTS idx_blocks_blocker
ON public.blocks (blocker_id, created_at DESC);

-- reports テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_reports_reporter
ON public.reports (reporter_id, target_type, target_id);
