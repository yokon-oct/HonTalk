-- ==========================================
-- Row Level Security (RLS) ポリシー設定
-- ==========================================

-- すべてのテーブルで RLS を有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- profiles テーブルのポリシー
-- ==========================================

-- 誰でもプロフィールを閲覧可能
CREATE POLICY "profiles_select_public"
ON public.profiles FOR SELECT
USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 自分のプロフィールのみ作成可能
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);


-- ==========================================
-- books テーブルのポリシー
-- ==========================================

-- 誰でも書籍情報を閲覧可能
CREATE POLICY "books_select_public"
ON public.books FOR SELECT
USING (true);

-- ログインユーザーは書籍を追加可能
CREATE POLICY "books_insert_authenticated"
ON public.books FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 書籍情報は管理者以外更新不可（将来的にEdge Functionで管理）
-- ここでは認証ユーザーが更新できるようにしておく
CREATE POLICY "books_update_authenticated"
ON public.books FOR UPDATE
USING (auth.role() = 'authenticated');


-- ==========================================
-- reading_records テーブルのポリシー
-- ==========================================

-- 自分の読書記録を閲覧可能
CREATE POLICY "reading_records_select_own"
ON public.reading_records FOR SELECT
USING (auth.uid() = user_id);

-- 自分の読書記録のみ作成可能
CREATE POLICY "reading_records_insert_own"
ON public.reading_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 自分の読書記録のみ更新可能
CREATE POLICY "reading_records_update_own"
ON public.reading_records FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 自分の読書記録のみ削除可能
CREATE POLICY "reading_records_delete_own"
ON public.reading_records FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- reviews テーブルのポリシー
-- ==========================================

-- 公開レビューは誰でも閲覧可能 / 非公開レビューは自分のみ
CREATE POLICY "reviews_select_public_or_own"
ON public.reviews FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- 自分のレビューのみ作成可能
CREATE POLICY "reviews_insert_own"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 自分のレビューのみ更新可能
CREATE POLICY "reviews_update_own"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 自分のレビューのみ削除可能
CREATE POLICY "reviews_delete_own"
ON public.reviews FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- follows テーブルのポリシー
-- ==========================================

-- フォロー関係は誰でも閲覧可能
CREATE POLICY "follows_select_public"
ON public.follows FOR SELECT
USING (true);

-- 自分がフォローする操作のみ
CREATE POLICY "follows_insert_own"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- 自分のフォローのみ解除可能
CREATE POLICY "follows_delete_own"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);


-- ==========================================
-- likes テーブルのポリシー
-- ==========================================

-- いいねは誰でも閲覧可能
CREATE POLICY "likes_select_public"
ON public.likes FOR SELECT
USING (true);

-- 自分のいいねのみ作成可能
CREATE POLICY "likes_insert_own"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 自分のいいねのみ削除可能
CREATE POLICY "likes_delete_own"
ON public.likes FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- comments テーブルのポリシー
-- ==========================================

-- コメントは誰でも閲覧可能
CREATE POLICY "comments_select_public"
ON public.comments FOR SELECT
USING (true);

-- 自分のコメントのみ作成可能
CREATE POLICY "comments_insert_own"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 自分のコメントのみ更新可能
CREATE POLICY "comments_update_own"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 自分のコメントのみ削除可能
CREATE POLICY "comments_delete_own"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- shelves テーブルのポリシー
-- ==========================================

-- 自分の本棚を閲覧可能
CREATE POLICY "shelves_select_own"
ON public.shelves FOR SELECT
USING (auth.uid() = user_id);

-- 自分の本棚のみ作成・更新・削除可能
CREATE POLICY "shelves_insert_own"
ON public.shelves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shelves_update_own"
ON public.shelves FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "shelves_delete_own"
ON public.shelves FOR DELETE
USING (auth.uid() = user_id);


-- ==========================================
-- shelf_books テーブルのポリシー
-- ==========================================

-- 本棚の所有者のみ操作可能（shelves の user_id で判定）
CREATE POLICY "shelf_books_select_own"
ON public.shelf_books FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shelves WHERE shelves.id = shelf_books.shelf_id AND shelves.user_id = auth.uid()
));

CREATE POLICY "shelf_books_insert_own"
ON public.shelf_books FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shelves WHERE shelves.id = shelf_books.shelf_id AND shelves.user_id = auth.uid()
));

CREATE POLICY "shelf_books_delete_own"
ON public.shelf_books FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shelves WHERE shelves.id = shelf_books.shelf_id AND shelves.user_id = auth.uid()
));


-- ==========================================
-- notifications テーブルのポリシー
-- ==========================================

-- 自分への通知のみ閲覧可能
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- 自分の通知のみ既読に更新可能
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);


-- ==========================================
-- messages テーブルのポリシー
-- ==========================================

-- 自分が送信者または受信者のメッセージのみ閲覧可能
CREATE POLICY "messages_select_own"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 自分が送信者のメッセージのみ作成可能
CREATE POLICY "messages_insert_own"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- 受信者が既読に更新可能
CREATE POLICY "messages_update_receiver"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);


-- ==========================================
-- blocks テーブルのポリシー
-- ==========================================

-- 自分のブロック設定のみ閲覧可能
CREATE POLICY "blocks_select_own"
ON public.blocks FOR SELECT
USING (auth.uid() = blocker_id);

-- 自分のみブロック操作可能
CREATE POLICY "blocks_insert_own"
ON public.blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_delete_own"
ON public.blocks FOR DELETE
USING (auth.uid() = blocker_id);


-- ==========================================
-- reports テーブルのポリシー
-- ==========================================

-- 自分の通報のみ閲覧可能
CREATE POLICY "reports_select_own"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- ログインユーザーは通報を作成可能
CREATE POLICY "reports_insert_authenticated"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);


-- ==========================================
-- 新規ユーザー登録時にプロフィールを自動作成するトリガー
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'user_' || LEFT(NEW.id::text, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
