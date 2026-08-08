/**
 * OAuth コールバック画面
 *
 * Google OAuth のリダイレクト先。
 * セッション復元後、メイン画面へ遷移する。
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

import { createSessionFromUrl } from '@/services/oauthService';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchProfile } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const queryString = Object.entries(params)
          .flatMap(([key, value]) => {
            if (value == null) return [];
            const values = Array.isArray(value) ? value : [value];
            return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
          })
          .join('&');

        const callbackUrl =
          initialUrl ??
          (queryString ? `hontalk://auth/callback?${queryString}` : null);

        if (!callbackUrl) {
          throw new Error('認証情報が見つかりませんでした');
        }

        const session = await createSessionFromUrl(callbackUrl);
        if (cancelled) return;

        if (!session?.user) {
          throw new Error('認証情報が見つかりませんでした');
        }

        await fetchProfile(session.user.id);
        if (cancelled) return;

        router.replace('/(tabs)');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : 'ログインに失敗しました',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchProfile, params, router]);

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.loadingText}>ログイン処理中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 24,
  },
  loadingText: {
    ...typography.preset.body,
    color: colors.neutral[500],
    marginTop: 16,
  },
  errorText: {
    ...typography.preset.body,
    color: colors.error,
    textAlign: 'center',
  },
});
