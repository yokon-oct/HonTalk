import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.neutral[0] },
        headerTintColor: colors.primary[500],
        headerTitleStyle: { fontWeight: '700', color: colors.neutral[900] },
        headerBackTitle: '戻る',
        contentStyle: { backgroundColor: colors.neutral[100] },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: '設定' }} />
      <Stack.Screen name="profile-edit" options={{ title: 'プロフィールの編集' }} />
      <Stack.Screen name="email-edit" options={{ title: 'メールアドレス変更' }} />
      <Stack.Screen name="notifications" options={{ title: '通知設定' }} />
      <Stack.Screen name="privacy" options={{ title: 'プライバシー設定' }} />
    </Stack>
  );
}
