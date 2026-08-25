/**
 * 認証関連の Zustand ストア
 */

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  favoriteGenres: string[];
  privacySetting: 'public' | 'followers_only' | 'private';
  isPremium: boolean;
}

/** DB の snake_case 行をストア用の Profile に変換する */
export function profileFromRow(row: {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_genres?: string[] | null;
  privacy_setting: Profile['privacySetting'];
  is_premium: boolean;
}): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? '',
    favoriteGenres: row.favorite_genres ?? [],
    privacySetting: row.privacy_setting,
    isPremium: row.is_premium,
  };
}

interface AuthState {
  /** Supabase セッション */
  session: Session | null;
  /** Supabase ユーザー */
  user: User | null;
  /** 拡張プロフィール */
  profile: Profile | null;
  /** 初期ロード中かどうか */
  isLoading: boolean;
  /** 初期認証チェック済みかどうか */
  isInitialized: boolean;

  // アクション
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
};

/** ログアウト後の状態（認証情報のみクリアし、初期化済みフラグは維持） */
const loggedOutState = {
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),

  setProfile: (profile) => set({ profile }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  reset: () => set(loggedOutState),
}));
