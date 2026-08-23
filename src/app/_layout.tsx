/**
 * ルートレイアウト
 *
 * - Supabase 認証状態の監視
 * - TanStack Query プロバイダ
 * - 認証チェックによるルーティング
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';

import 'react-native-url-polyfill/auto';
import { queryClient } from '@/config/queryClient';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { createSessionFromUrl } from '@/services/oauthService';
import { notifyOAuthCallback } from '@/services/oauthCallbackBridge';
import { colors } from '@/theme/colors';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();
  const { initializeAuth, fetchProfile } = useAuth();

  // プッシュ通知の登録・受信・タップ時遷移
  usePushNotifications();

  // 認証状態の初期化
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // OAuth 深リンクを常時監視（シミュレータの外部 Safari 復帰にも対応）
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (notifyOAuthCallback(url)) {
        return;
      }

      if (!url.includes('auth/callback')) return;

      setTimeout(() => {
        void (async () => {
          try {
            const session = await createSessionFromUrl(url);
            if (session?.user) {
              await fetchProfile(session.user.id);
            }
          } catch {
            // コールバック画面側でも処理するため握りつぶす
          }
        })();
      }, 0);
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [fetchProfile]);

  // 認証状態の変更をリスニング
  // 注意: onAuthStateChange 内で await すると setSession / exchangeCodeForSession と
  // デッドロックし、OAuth 完了後にアプリがフリーズする（Supabase 既知の制約）
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      useAuthStore.getState().setSession(session);

      if (session?.user) {
        const userId = session.user.id;
        setTimeout(() => {
          void fetchProfile(userId);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ルーティングガード
  useEffect(() => {
    console.log('[AuthGuard] Check routing:', { isInitialized, hasSession: !!session, segments });
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAuthCallback = segments[0] === 'auth' && segments[1] === 'callback';

    if (!session) {
      if (!inAuthGroup && !inAuthCallback) {
        console.log('[AuthGuard] Redirect to /(auth)/login');
        router.replace('/(auth)/login');
      }
    } else {
      // ログイン済みの状態で、authグループにいるか、またはルートインデックスにいる場合
      const rootSegment = segments.length > 0 ? (segments[0] as string) : '';
      const isAtRoot = rootSegment === 'index' || rootSegment === '';
      if (inAuthGroup || isAtRoot) {
        console.log('[AuthGuard] Redirect to /(tabs)');
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, isInitialized, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="dark" />
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.neutral[50] },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="book/[id]"
              options={{
                headerShown: true,
                headerTitle: '書籍詳細',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="review/[id]"
              options={{
                headerShown: true,
                headerTitle: 'レビュー',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="review/create"
              options={{
                headerShown: true,
                headerTitle: 'レビューを書く',
                headerBackTitle: '戻る',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="user/[id]"
              options={{
                headerShown: true,
                headerTitle: 'プロフィール',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                headerTitle: '設定',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="stats"
              options={{
                headerShown: true,
                headerTitle: '読書統計',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="ranking"
              options={{
                headerShown: true,
                headerTitle: 'ランキング',
                headerBackTitle: '戻る',
              }}
            />
            <Stack.Screen
              name="scanner"
              options={{
                headerShown: true,
                headerTitle: 'バーコードスキャン',
                headerBackTitle: '戻る',
              }}
            />
          </Stack>
        </AuthGuard>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
});
