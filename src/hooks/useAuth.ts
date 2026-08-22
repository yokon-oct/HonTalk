/**
 * 認証カスタムフック
 *
 * Supabase Auth の操作をラップし、
 * Zustand ストアとの同期を行う。
 */

import { useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { queryClient } from '@/config/queryClient';
import { timelineKeys } from '@/hooks/useTimeline';
import { followKeys } from '@/hooks/useFollow';
import { profileKeys } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { getSupabaseConfigIssue } from '@/config/env';
import { ConfigError, handleError } from '@/utils/errorHandler';
import { unregisterCurrentPushToken, setCurrentPushToken } from '@/services/pushTokenService';
import {
  signInWithGoogleOAuth,
  signInWithAppleNative,
} from '@/services/oauthService';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/stores/authStore';

export function useAuth() {
  const {
    session,
    user,
    profile,
    isLoading,
    isInitialized,
    setSession,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  /**
   * プロフィールを取得してストアに保存
   */
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      const profile: Profile = {
        id: (data as any).id,
        nickname: (data as any).nickname,
        avatarUrl: (data as any).avatar_url,
        bio: (data as any).bio,
        favoriteGenres: (data as any).favorite_genres,
        privacySetting: (data as any).privacy_setting,
        isPremium: (data as any).is_premium,
      };

      setProfile(profile);
      return profile;
    },
    [setProfile],
  );

  /**
   * セッション確立後の共通処理
   */
  const completeSignIn = useCallback(
    async (session: Session | null) => {
      if (!session?.user) return { success: false as const };

      setSession(session);
      await fetchProfile(session.user.id);

      // ログイン後はユーザー依存のキャッシュを破棄して再取得する
      queryClient.invalidateQueries({ queryKey: timelineKeys.all });
      queryClient.invalidateQueries({ queryKey: followKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });

      return { success: true as const };
    },
    [setSession, fetchProfile],
  );

  /**
   * Google OAuth でログイン / 新規登録
   */
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const configIssue = getSupabaseConfigIssue();
      if (configIssue) {
        throw new ConfigError(configIssue);
      }

      const result = await signInWithGoogleOAuth();
      if (result.cancelled) {
        return { success: false, cancelled: true };
      }
      return await completeSignIn(result.session);
    } catch (error) {
      // コールバック待ちが失敗しても、別経路でセッションが確立されている場合がある
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        return await completeSignIn(session);
      }

      console.error('[Auth] Google sign-in failed:', error);
      const appError = handleError(error);
      showToast({ message: appError.message, type: 'error' });
      return { success: false, error: appError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, completeSignIn, showToast]);

  /**
   * Apple Sign In でログイン / 新規登録（iOS）
   */
  const signInWithApple = useCallback(async () => {
    setLoading(true);
    try {
      const configIssue = getSupabaseConfigIssue();
      if (configIssue) {
        throw new ConfigError(configIssue);
      }

      const result = await signInWithAppleNative();
      if (result.cancelled) {
        return { success: false, cancelled: true };
      }
      return await completeSignIn(result.session);
    } catch (error) {
      const appError = handleError(error);
      showToast({ message: appError.message, type: 'error' });
      return { success: false, error: appError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, completeSignIn, showToast]);

  /**
   * メール + パスワードでログイン
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const configIssue = getSupabaseConfigIssue();
        if (configIssue) {
          throw new ConfigError(configIssue);
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSession(data.session);
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
          queryClient.invalidateQueries({ queryKey: timelineKeys.all });
          queryClient.invalidateQueries({ queryKey: followKeys.all });
          queryClient.invalidateQueries({ queryKey: profileKeys.all });
        }

        return { success: true };
      } catch (error) {
        const appError = handleError(error);
        showToast({ message: appError.message, type: 'error' });
        return { success: false, error: appError };
      } finally {
        setLoading(false);
      }
    },
    [setSession, setLoading, fetchProfile, showToast],
  );

  /**
   * メール + パスワードで新規登録
   */
  const signUpWithEmail = useCallback(
    async (email: string, password: string, nickname: string) => {
      setLoading(true);
      try {
        // サインアップ時に nickname を metadata として渡す
        // DBトリガー handle_new_user が profiles を自動作成する
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error('ユーザーの作成に失敗しました');

        setSession(data.session);
        if (data.session) {
          await fetchProfile(data.user.id);
          queryClient.invalidateQueries({ queryKey: timelineKeys.all });
          queryClient.invalidateQueries({ queryKey: followKeys.all });
          queryClient.invalidateQueries({ queryKey: profileKeys.all });
        }

        showToast({ message: 'アカウントを作成しました', type: 'success' });
        return { success: true, needsEmailConfirmation: !data.session };
      } catch (error) {
        const appError = handleError(error);
        showToast({ message: appError.message, type: 'error' });
        return { success: false, error: appError };
      } finally {
        setLoading(false);
      }
    },
    [setSession, setLoading, fetchProfile, showToast],
  );

  /**
   * ログアウト
   */
  const signOut = useCallback(async () => {
    try {
      // この端末のプッシュ通知トークンをサーバーから解除する
      // （signOut後はRLSにより削除できなくなるため、signOut前に実行する）
      await unregisterCurrentPushToken();
      await supabase.auth.signOut();
      reset();
      queryClient.clear();
      showToast({ message: 'ログアウトしました', type: 'info' });
    } catch (error) {
      const appError = handleError(error);
      showToast({ message: appError.message, type: 'error' });
    }
  }, [reset, showToast]);

  /**
   * メールアドレスの変更
   */
  const updateEmail = useCallback(async (newEmail: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;
      
      showToast({ 
        message: '確認メールを送信しました。新しいメールアドレスで確認リンクをクリックしてください。', 
        type: 'success' 
      });
      return { success: true };
    } catch (error) {
      const appError = handleError(error);
      showToast({ message: appError.message, type: 'error' });
      return { success: false, error: appError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  /**
   * アカウント削除
   * profiles テーブルから削除 → CASCADE で関連データも全削除 → サインアウト
   */
  const deleteAccount = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('ユーザーが認証されていません');

      // profiles を削除（ON DELETE CASCADE で reading_records, reviews 等も連鎖削除）
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUser.id);

      if (error) throw error;

      // profiles のCASCADE削除でpush_tokensも削除されるため、ローカルの参照のみクリアする
      setCurrentPushToken(null);

      // 認証セッションも削除
      await supabase.auth.signOut();
      reset();
      queryClient.clear();

      showToast({ message: 'アカウントを削除しました', type: 'info' });
      return { success: true };
    } catch (error) {
      const appError = handleError(error);
      showToast({ message: appError.message, type: 'error' });
      return { success: false, error: appError };
    } finally {
      setLoading(false);
    }
  }, [reset, setLoading, showToast]);

  /**
   * セッションの初期チェック
   * アプリ起動時に一度だけ呼び出す
   */
  const initializeAuth = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
    } catch {
      // セッション取得失敗は無視（未ログイン扱い）
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [setSession, setLoading, setInitialized, fetchProfile]);

  return {
    // 状態
    session,
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,

    // アクション
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signUpWithEmail,
    signOut,
    updateEmail,
    deleteAccount,
    initializeAuth,
    fetchProfile,
  };
}
