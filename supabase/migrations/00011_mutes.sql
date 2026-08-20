-- ==========================================
-- Migration 00011: Mute feature (FR-SAFE-004)
-- ==========================================
-- ミュートしたユーザーの投稿をタイムラインから非表示にし、
-- ミュートリストの表示・解除を可能にする。
-- ブロックと異なり、プロフィール閲覧は可能のまま。


-- ==========================================
-- A. mutes テーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS public.mutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (muter_id, muted_id),
    CHECK (muter_id != muted_id)
);

CREATE INDEX IF NOT EXISTS idx_mutes_muter_muted
ON public.mutes (muter_id, muted_id);

CREATE INDEX IF NOT EXISTS idx_mutes_muter
ON public.mutes (muter_id, created_at DESC);


-- ==========================================
-- B. RLS
-- ==========================================

ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutes_select_own" ON public.mutes;
CREATE POLICY "mutes_select_own"
ON public.mutes FOR SELECT
USING (auth.uid() = muter_id);

DROP POLICY IF EXISTS "mutes_insert_own" ON public.mutes;
CREATE POLICY "mutes_insert_own"
ON public.mutes FOR INSERT
WITH CHECK (auth.uid() = muter_id);

DROP POLICY IF EXISTS "mutes_delete_own" ON public.mutes;
CREATE POLICY "mutes_delete_own"
ON public.mutes FOR DELETE
USING (auth.uid() = muter_id);


-- ==========================================
-- C. ミュート関連 RPC
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_muting(
    p_muter_id UUID,
    p_muted_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.mutes
        WHERE muter_id = p_muter_id
          AND muted_id = p_muted_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_muted_users(p_user_id UUID)
RETURNS TABLE (
    mute_id UUID,
    muted_at TIMESTAMPTZ,
    user_id UUID,
    nickname TEXT,
    avatar_url TEXT,
    bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS mute_id,
        m.created_at AS muted_at,
        p.id AS user_id,
        p.nickname,
        p.avatar_url,
        p.bio
    FROM public.mutes m
    JOIN public.profiles p ON m.muted_id = p.id
    WHERE m.muter_id = p_user_id
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- D. get_timeline にミュート除外を追加
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_timeline(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_following_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    book_id UUID,
    book_title TEXT,
    book_author TEXT,
    book_cover_url TEXT,
    rating INTEGER,
    content TEXT,
    is_spoiler BOOLEAN,
    likes_count INTEGER,
    comments_count INTEGER,
    created_at TIMESTAMPTZ,
    user_id UUID,
    user_nickname TEXT,
    user_avatar_url TEXT,
    is_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        b.id AS book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.cover_image_url AS book_cover_url,
        rr.rating AS rating,
        r.content,
        r.has_spoiler AS is_spoiler,
        r.like_count AS likes_count,
        r.comment_count AS comments_count,
        r.created_at,
        p.id AS user_id,
        p.nickname AS user_nickname,
        p.avatar_url AS user_avatar_url,
        (p_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.likes l
            WHERE l.review_id = r.id AND l.user_id = p_user_id
        )) AS is_liked
    FROM public.reviews r
    JOIN public.profiles p ON r.user_id = p.id
    LEFT JOIN public.books b ON r.book_id = b.id
    LEFT JOIN public.reading_records rr ON r.reading_record_id = rr.id
    WHERE
        r.is_public = TRUE
        AND (
            NOT p_following_only
            OR p_user_id IS NULL
            OR r.user_id IN (
                SELECT following_id
                FROM public.follows
                WHERE follower_id = p_user_id
            )
        )
        AND (
            p_user_id IS NULL
            OR r.user_id NOT IN (
                SELECT blocked_id
                FROM public.blocks
                WHERE blocker_id = p_user_id
            )
        )
        AND (
            p_user_id IS NULL
            OR r.user_id NOT IN (
                SELECT muted_id
                FROM public.mutes
                WHERE muter_id = p_user_id
            )
        )
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- E. ランキング RPC にもミュート除外を追加
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_book_ranking(
    p_period TEXT DEFAULT 'week',
    p_viewer_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    book_id UUID,
    title TEXT,
    author TEXT,
    cover_image_url TEXT,
    genre TEXT,
    average_rating NUMERIC,
    rating_count INTEGER,
    new_registrations INTEGER,
    new_reviews INTEGER,
    period_likes INTEGER,
    score NUMERIC
) AS $$
DECLARE
    v_since TIMESTAMPTZ := NOW() - (CASE WHEN p_period = 'month' THEN INTERVAL '30 days' ELSE INTERVAL '7 days' END);
BEGIN
    RETURN QUERY
    WITH reg AS (
        SELECT rr.book_id, COUNT(*)::INTEGER AS cnt
        FROM public.reading_records rr
        WHERE rr.created_at >= v_since
        GROUP BY rr.book_id
    ), rev AS (
        SELECT r.book_id, COUNT(*)::INTEGER AS cnt
        FROM public.reviews r
        WHERE r.created_at >= v_since
          AND r.is_public = TRUE
          AND (
              p_viewer_id IS NULL
              OR (
                  r.user_id NOT IN (SELECT blocked_id FROM public.blocks WHERE blocker_id = p_viewer_id)
                  AND r.user_id NOT IN (SELECT muted_id FROM public.mutes WHERE muter_id = p_viewer_id)
              )
          )
        GROUP BY r.book_id
    ), likes_agg AS (
        SELECT r.book_id, COUNT(*)::INTEGER AS cnt
        FROM public.likes l
        JOIN public.reviews r ON r.id = l.review_id
        WHERE l.created_at >= v_since
          AND r.is_public = TRUE
        GROUP BY r.book_id
    )
    SELECT
        b.id AS book_id,
        b.title,
        b.author,
        b.cover_image_url,
        b.genre,
        b.average_rating,
        b.rating_count,
        COALESCE(reg.cnt, 0) AS new_registrations,
        COALESCE(rev.cnt, 0) AS new_reviews,
        COALESCE(likes_agg.cnt, 0) AS period_likes,
        (COALESCE(reg.cnt, 0) * 2 + COALESCE(rev.cnt, 0) * 3 + COALESCE(likes_agg.cnt, 0) * 1)::NUMERIC AS score
    FROM public.books b
    LEFT JOIN reg ON reg.book_id = b.id
    LEFT JOIN rev ON rev.book_id = b.id
    LEFT JOIN likes_agg ON likes_agg.book_id = b.id
    WHERE COALESCE(reg.cnt, 0) + COALESCE(rev.cnt, 0) + COALESCE(likes_agg.cnt, 0) > 0
    ORDER BY score DESC, b.rating_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_review_ranking(
    p_period TEXT DEFAULT 'week',
    p_viewer_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    review_id UUID,
    content TEXT,
    has_spoiler BOOLEAN,
    like_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMPTZ,
    user_id UUID,
    user_nickname TEXT,
    user_avatar_url TEXT,
    book_id UUID,
    book_title TEXT,
    book_author TEXT,
    book_cover_url TEXT,
    rating INTEGER,
    period_likes INTEGER,
    period_comments INTEGER,
    score NUMERIC
) AS $$
DECLARE
    v_since TIMESTAMPTZ := NOW() - (CASE WHEN p_period = 'month' THEN INTERVAL '30 days' ELSE INTERVAL '7 days' END);
BEGIN
    RETURN QUERY
    WITH period_likes AS (
        SELECT l.review_id, COUNT(*)::INTEGER AS cnt
        FROM public.likes l
        WHERE l.created_at >= v_since
        GROUP BY l.review_id
    ), period_comments AS (
        SELECT c.review_id, COUNT(*)::INTEGER AS cnt
        FROM public.comments c
        WHERE c.created_at >= v_since
        GROUP BY c.review_id
    )
    SELECT
        r.id AS review_id,
        r.content,
        r.has_spoiler,
        r.like_count,
        r.comment_count,
        r.created_at,
        p.id AS user_id,
        p.nickname AS user_nickname,
        p.avatar_url AS user_avatar_url,
        b.id AS book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.cover_image_url AS book_cover_url,
        rr.rating,
        COALESCE(pl.cnt, 0) AS period_likes,
        COALESCE(pc.cnt, 0) AS period_comments,
        (COALESCE(pl.cnt, 0) * 3 + COALESCE(pc.cnt, 0) * 5)::NUMERIC AS score
    FROM public.reviews r
    JOIN public.profiles p ON p.id = r.user_id
    LEFT JOIN public.books b ON b.id = r.book_id
    LEFT JOIN public.reading_records rr ON rr.id = r.reading_record_id
    LEFT JOIN period_likes pl ON pl.review_id = r.id
    LEFT JOIN period_comments pc ON pc.review_id = r.id
    WHERE r.is_public = TRUE
      AND (COALESCE(pl.cnt, 0) + COALESCE(pc.cnt, 0)) > 0
      AND (
          p_viewer_id IS NULL
          OR (
              r.user_id NOT IN (SELECT blocked_id FROM public.blocks WHERE blocker_id = p_viewer_id)
              AND r.user_id NOT IN (SELECT muted_id FROM public.mutes WHERE muter_id = p_viewer_id)
          )
      )
    ORDER BY score DESC, r.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_user_ranking(
    p_period TEXT DEFAULT 'week',
    p_viewer_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    avatar_url TEXT,
    bio TEXT,
    new_followers INTEGER,
    new_reviews INTEGER,
    period_likes_received INTEGER,
    score NUMERIC
) AS $$
DECLARE
    v_since TIMESTAMPTZ := NOW() - (CASE WHEN p_period = 'month' THEN INTERVAL '30 days' ELSE INTERVAL '7 days' END);
BEGIN
    RETURN QUERY
    WITH followers AS (
        SELECT f.following_id AS user_id, COUNT(*)::INTEGER AS cnt
        FROM public.follows f
        WHERE f.created_at >= v_since
        GROUP BY f.following_id
    ), rev AS (
        SELECT r.user_id, COUNT(*)::INTEGER AS cnt
        FROM public.reviews r
        WHERE r.created_at >= v_since
          AND r.is_public = TRUE
        GROUP BY r.user_id
    ), likes_received AS (
        SELECT r.user_id, COUNT(*)::INTEGER AS cnt
        FROM public.likes l
        JOIN public.reviews r ON r.id = l.review_id
        WHERE l.created_at >= v_since
          AND r.is_public = TRUE
        GROUP BY r.user_id
    )
    SELECT
        p.id AS user_id,
        p.nickname,
        p.avatar_url,
        p.bio,
        COALESCE(followers.cnt, 0) AS new_followers,
        COALESCE(rev.cnt, 0) AS new_reviews,
        COALESCE(likes_received.cnt, 0) AS period_likes_received,
        (COALESCE(followers.cnt, 0) * 3 + COALESCE(rev.cnt, 0) * 2 + COALESCE(likes_received.cnt, 0) * 1)::NUMERIC AS score
    FROM public.profiles p
    LEFT JOIN followers ON followers.user_id = p.id
    LEFT JOIN rev ON rev.user_id = p.id
    LEFT JOIN likes_received ON likes_received.user_id = p.id
    WHERE p.privacy_setting != 'private'
      AND COALESCE(followers.cnt, 0) + COALESCE(rev.cnt, 0) + COALESCE(likes_received.cnt, 0) > 0
      AND (
          p_viewer_id IS NULL
          OR (
              p.id NOT IN (SELECT blocked_id FROM public.blocks WHERE blocker_id = p_viewer_id)
              AND p.id NOT IN (SELECT muted_id FROM public.mutes WHERE muter_id = p_viewer_id)
          )
      )
    ORDER BY score DESC, followers.cnt DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
