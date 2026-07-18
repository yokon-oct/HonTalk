/**
 * (auth) グループレイアウト
 *
 * 認証画面（ログイン・新規登録）用の Stack レイアウト。
 * ヘッダー非表示、背景色をウォームカラーに統一。
 */

import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral[50] },
        animation: 'slide_from_right',
      }}
    />
  );
}
