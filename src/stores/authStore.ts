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

  reset: () => set(initialState),
}));
