-- ==========================================
-- 共通関数・トリガー関数
-- ==========================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- テーブル定義
-- ==========================================

-- 1. profiles（ユーザープロフィール - auth.usersの拡張）
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    favorite_genres TEXT[] DEFAULT '{}',
    privacy_setting TEXT NOT NULL DEFAULT 'public'
        CHECK (privacy_setting IN ('public', 'followers_only', 'private')),
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    notification_settings JSONB NOT NULL DEFAULT '{
        "like": true,
        "comment": true,
        "follow": true,
        "recommend": true,
        "dm": true
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ニックネーム検索用インデックス
CREATE INDEX idx_profiles_nickname ON public.profiles (nickname);
-- 更新日時自動更新トリガー
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. books（書籍マスターデータ）
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    isbn TEXT UNIQUE,
    cover_image_url TEXT,
    genre TEXT,
    page_count INTEGER,
    published_date DATE,
    description TEXT,
    google_books_id TEXT UNIQUE,
    rakuten_books_id TEXT UNIQUE,
    average_rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_books_isbn ON public.books (isbn);
CREATE INDEX idx_books_genre ON public.books (genre);
-- トリガー
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3. reading_records（読書記録）
CREATE TABLE public.reading_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'want_to_read'
        CHECK (status IN ('want_to_read', 'reading', 'finished')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, book_id)
);

-- インデックス
CREATE INDEX idx_reading_records_user ON public.reading_records (user_id, status);
CREATE INDEX idx_reading_records_book ON public.reading_records (book_id);
CREATE INDEX idx_reading_records_created ON public.reading_records (created_at DESC);
-- トリガー
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reading_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 4. reviews（レビュー・感想）
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    reading_record_id UUID REFERENCES public.reading_records(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    has_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_reviews_user ON public.reviews (user_id, created_at DESC);
CREATE INDEX idx_reviews_book ON public.reviews (book_id, created_at DESC);
CREATE INDEX idx_reviews_public ON public.reviews (is_public, created_at DESC) WHERE is_public = TRUE;
-- トリガー
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 5. follows（フォロー関係）
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- インデックス
CREATE INDEX idx_follows_follower ON public.follows (follower_id);
CREATE INDEX idx_follows_following ON public.follows (following_id);


-- 6. likes（いいね）
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, review_id)
);

-- インデックス
CREATE INDEX idx_likes_review ON public.likes (review_id);
CREATE INDEX idx_likes_user ON public.likes (user_id);


-- 7. comments（コメント）
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_comments_review ON public.comments (review_id, created_at ASC);
-- トリガー
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 8. shelves（本棚）
CREATE TABLE public.shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);


-- 9. shelf_books（本棚と書籍の中間テーブル）
CREATE TABLE public.shelf_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shelf_id, book_id)
);

-- インデックス
CREATE INDEX idx_shelf_books_shelf ON public.shelf_books (shelf_id);


-- 10. notifications（通知）
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'recommend', 'system')),
    reference_type TEXT,
    reference_id UUID,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);


-- 11. messages（ダイレクトメッセージ - Phase 3）
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_id != receiver_id)
);

-- インデックス
CREATE INDEX idx_messages_conversation ON public.messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC
);
CREATE INDEX idx_messages_receiver ON public.messages (receiver_id, is_read);


-- 12. blocks（ブロック - Phase 2）
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);


-- 13. reports（通報 - Phase 2）
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'review', 'comment')),
    target_id UUID NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('spam', 'inappropriate', 'harassment', 'other')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
