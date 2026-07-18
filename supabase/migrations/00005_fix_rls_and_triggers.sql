-- ==========================================
-- Migration 00005: Fix RLS policies, add triggers, improve RPC functions
-- ==========================================

-- ==========================================
-- A. カウント自動同期トリガー
-- ==========================================

-- A-1. likes → reviews.like_count を自動同期

CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reviews
    SET like_count = like_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reviews
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.review_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_likes_increment ON public.likes;
DROP TRIGGER IF EXISTS trg_likes_decrement ON public.likes;

CREATE TRIGGER trg_likes_increment
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.increment_like_count();

CREATE TRIGGER trg_likes_decrement
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.decrement_like_count();


-- A-2. comments → reviews.comment_count を自動同期

CREATE OR REPLACE FUNCTION public.increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reviews
    SET comment_count = comment_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reviews
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.review_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_comments_increment ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_decrement ON public.comments;

CREATE TRIGGER trg_comments_increment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.increment_comment_count();

CREATE TRIGGER trg_comments_decrement
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.decrement_comment_count();


-- A-3. reading_records → books.average_rating / rating_count を自動同期

CREATE OR REPLACE FUNCTION public.update_book_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_book_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_book_id := OLD.book_id;
    ELSE
        v_book_id := NEW.book_id;
    END IF;

    UPDATE public.books
    SET
        average_rating = (
            SELECT COALESCE(AVG(rating::NUMERIC), 0)
            FROM public.reading_records
            WHERE book_id = v_book_id
              AND rating IS NOT NULL
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM public.reading_records
            WHERE book_id = v_book_id
              AND rating IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = v_book_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reading_records_rating ON public.reading_records;

CREATE TRIGGER trg_reading_records_rating
AFTER INSERT OR UPDATE OF rating OR DELETE ON public.reading_records
FOR EACH ROW EXECUTE FUNCTION public.update_book_rating();


-- ==========================================
-- B. RLS ポリシー修正
-- ==========================================

-- B-1. reading_records: 公開レビューに紐づく評価は他ユーザーも参照可能
DROP POLICY IF EXISTS "reading_records_select_own" ON public.reading_records;

CREATE POLICY "reading_records_select_own_or_via_review"
ON public.reading_records FOR SELECT
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.reading_record_id = reading_records.id
          AND r.is_public = TRUE
    )
);

-- B-2. shelves: 他ユーザーの本棚も閲覧可能に
DROP POLICY IF EXISTS "shelves_select_own" ON public.shelves;

CREATE POLICY "shelves_select_public_or_own"
ON public.shelves FOR SELECT
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = shelves.user_id
          AND p.privacy_setting != 'private'
    )
);

-- B-3. shelf_books: 閲覧可能な本棚の書籍も閲覧可能に
DROP POLICY IF EXISTS "shelf_books_select_own" ON public.shelf_books;

CREATE POLICY "shelf_books_select_via_shelf"
ON public.shelf_books FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.shelves s
        WHERE s.id = shelf_books.shelf_id
          AND (
              s.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.id = s.user_id
                    AND p.privacy_setting != 'private'
              )
          )
    )
);

-- B-4. notifications: INSERT ポリシーを追加（create_notification RPC 経由）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications' AND policyname = 'notifications_insert_system'
    ) THEN
        EXECUTE '
            CREATE POLICY "notifications_insert_system"
            ON public.notifications FOR INSERT
            WITH CHECK (true)
        ';
    END IF;
END $$;


-- ==========================================
-- C. RPC 関数の追加・修正
-- ==========================================

-- C-1. create_notification: SECURITY DEFINER で通知を安全に作成
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_actor_id UUID,
    p_type TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- 自分への通知は作成しない
    IF p_user_id = p_actor_id THEN
        RETURN;
    END IF;

    -- 通知設定を確認
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id
          AND (notification_settings->>p_type)::boolean IS NOT FALSE
    ) THEN
        RETURN;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        reference_type,
        reference_id,
        message
    ) VALUES (
        p_user_id,
        p_actor_id,
        p_type,
        p_reference_type,
        p_reference_id,
        p_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C-2. get_timeline を修正（フォローフィルタ対応 + ブロック除外）
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
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C-3. ニックネーム重複チェック関数
CREATE OR REPLACE FUNCTION public.check_nickname_availability(p_nickname TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE LOWER(nickname) = LOWER(p_nickname)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- D. 既存カウントデータの修正（初期同期）
-- ==========================================

-- like_count を実数に合わせる
UPDATE public.reviews r
SET like_count = (
    SELECT COUNT(*) FROM public.likes l WHERE l.review_id = r.id
);

-- comment_count を実数に合わせる
UPDATE public.reviews r
SET comment_count = (
    SELECT COUNT(*) FROM public.comments c WHERE c.review_id = r.id
);

-- books の average_rating / rating_count を実数に合わせる
UPDATE public.books b
SET
    average_rating = COALESCE((
        SELECT AVG(rr.rating::NUMERIC)
        FROM public.reading_records rr
        WHERE rr.book_id = b.id AND rr.rating IS NOT NULL
    ), 0),
    rating_count = (
        SELECT COUNT(*)
        FROM public.reading_records rr
        WHERE rr.book_id = b.id AND rr.rating IS NOT NULL
    );
