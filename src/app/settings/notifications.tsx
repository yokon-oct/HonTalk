import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { useProfile, useUpdateProfile } from '@/hooks/useProfile';

interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  likes: true,
  comments: true,
  follows: true,
};

export default function NotificationsSettingsScreen() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // 初回ロード時にDBの設定を反映
  useEffect(() => {
    if (profile?.notification_settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(profile.notification_settings as Partial<NotificationSettings>),
      });
    }
  }, [profile]);

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    // 即座にDBに保存
    updateProfile({
      notification_settings: newSettings as any,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: '通知設定',
          headerBackTitle: '戻る' 
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          アプリ内で受け取るプッシュ通知やバッジの表示設定を変更できます。
        </Text>

        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>いいね</Text>
              <Text style={styles.settingDescription}>あなたの投稿が「いいね」された時</Text>
            </View>
            <Switch
              value={settings.likes}
              onValueChange={() => handleToggle('likes')}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              disabled={isPending}
            />
          </View>
          
          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>コメント</Text>
              <Text style={styles.settingDescription}>あなたの投稿にコメントがついた時</Text>
            </View>
            <Switch
              value={settings.comments}
              onValueChange={() => handleToggle('comments')}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              disabled={isPending}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>フォロー</Text>
              <Text style={styles.settingDescription}>あなたを新しくフォローした人がいる時</Text>
            </View>
            <Switch
              value={settings.follows}
              onValueChange={() => handleToggle('follows')}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              disabled={isPending}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.preset.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  section: {
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  settingTitle: {
    ...typography.preset.body,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  settingDescription: {
    ...typography.preset.bodySmall,
    color: colors.neutral[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: spacing.lg,
  },
});
