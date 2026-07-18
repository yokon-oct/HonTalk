import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, Switch,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { colors } from '@/theme/colors';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';

// DBの notification_settings と同じキー名を使用
interface NotificationSettings {
  like: boolean;
  comment: boolean;
  follow: boolean;
  recommend: boolean;
  dm: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  like: true,
  comment: true,
  follow: true,
  recommend: true,
  dm: true,
};

const NOTIFICATION_ITEMS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  { key: 'like',      label: 'いいね',          description: 'あなたの投稿に「いいね」がついた時' },
  { key: 'comment',   label: 'コメント',         description: 'あなたの投稿にコメントがついた時' },
  { key: 'follow',    label: 'フォロー',         description: '新しくフォローされた時' },
  { key: 'recommend', label: '本のおすすめ',      description: '他のユーザーから本をおすすめされた時' },
  { key: 'dm',        label: 'ダイレクトメッセージ', description: 'DM を受信した時' },
];

export default function NotificationsSettingsScreen() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

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
    updateProfile({ notification_settings: newSettings as any });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        各通知のON / OFFを切り替えられます。変更はすぐに保存されます。
      </Text>

      <View style={styles.card}>
        {NOTIFICATION_ITEMS.map((item, idx) => (
          <View key={item.key}>
            <View style={styles.row}>
              <View style={styles.textWrap}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.description}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
                thumbColor="#ffffff"
                disabled={isPending}
              />
            </View>
            {idx < NOTIFICATION_ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {isPending && (
        <View style={styles.savingRow}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.savingText}>保存中...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[100] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  description: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  textWrap: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 3 },
  rowDesc: { fontSize: 12, color: colors.neutral[500], lineHeight: 17 },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginHorizontal: 16,
  },
  savingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  savingText: { fontSize: 13, color: colors.primary[500] },
});
