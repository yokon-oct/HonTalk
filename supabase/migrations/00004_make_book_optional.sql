-- ==========================================
-- Migration 00004: Make book_id optional in reviews table
-- ==========================================

-- 1. `public.reviews` の `book_id` を NULL 許容に変更
ALTER TABLE public.reviews ALTER COLUMN book_id DROP NOT NULL;

-- 2. `get_timeline` RPC関数を修正し、`book_id` が NULL の場合でも表示されるよう LEFT JOIN に変更
CREATE OR REPLACE FUNCTION public.get_timeline(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
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
        -- p_user_id が指定されている場合のみ、いいね済みか判定
        (p_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.likes l 
            WHERE l.review_id = r.id AND l.user_id = p_user_id
        )) AS is_liked
    FROM public.reviews r
    LEFT JOIN public.books b ON r.book_id = b.id
    JOIN public.profiles p ON r.user_id = p.id
    LEFT JOIN public.reading_records rr ON r.reading_record_id = rr.id
    WHERE r.is_public = TRUE
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
