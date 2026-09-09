-- ==========================================
-- Migration 00014: アカウント削除を通す
--
-- 原因:
--   1. profiles に DELETE ポリシーが無く、クライアントからの削除が RLS で無視される
--   2. プロフィールだけ消しても auth.users が残るため、再ログイン・再登録できてしまう
--
-- 対応:
--   - 自分の profiles 行を消せるようにする
--   - profiles 削除後に auth.users も消す（関連データは既存の CASCADE に任せる）
--   - 新クライアント用に delete_own_account RPC を用意する
-- ==========================================

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.delete_auth_user_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.users 側からの CASCADE でプロフィールが消えた場合は何もしない
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.id) THEN
    RETURN OLD;
  END IF;

  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_auth_user_for_profile ON public.profiles;
CREATE TRIGGER trg_delete_auth_user_for_profile
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_for_profile();

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
      AND name LIKE v_user_id::text || '/%';
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  DELETE FROM public.profiles WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account() IS
  'Deletes the current user profile, which cascades to related data and removes auth.users.';
