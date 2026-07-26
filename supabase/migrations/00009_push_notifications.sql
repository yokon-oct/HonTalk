-- ==========================================
-- Migration 00009: プッシュ通知機能
-- ==========================================
--
-- Expo Push Token をユーザーごとに保持するテーブルを追加する。
-- 実際のプッシュ送信は Edge Function (send-push-notification) が担当し、
-- クライアントは createNotification() 実行時にその Function を呼び出す。

-- ==========================================
-- push_tokens（プッシュ通知トークン）
-- ==========================================
CREATE TABLE public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1ユーザーが複数デバイスを持てるよう user_id にインデックス
CREATE INDEX idx_push_tokens_user ON public.push_tokens (user_id);

-- 更新日時自動更新トリガー（00001で定義済みの共通関数を再利用）
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 有効化
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 自分のトークンのみ閲覧可能
CREATE POLICY "push_tokens_select_own"
ON public.push_tokens FOR SELECT
USING (auth.uid() = user_id);

-- 自分のトークンのみ登録可能
CREATE POLICY "push_tokens_insert_own"
ON public.push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 自分のトークンのみ更新可能（再ログイン時の user_id 引き継ぎなど）
CREATE POLICY "push_tokens_update_own"
ON public.push_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 自分のトークンのみ削除可能（ログアウト時の解除）
CREATE POLICY "push_tokens_delete_own"
ON public.push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Edge Function（service_role）が無効トークンを削除できるようにする
-- （service_role は RLS をバイパスするため追加ポリシーは不要）
