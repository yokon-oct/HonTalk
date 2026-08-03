import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, Switch,
  ScrollView, ActivityIndicator, TouchableOpacity, Platform, Linking, Share,
} from 'react-native';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import {
  getPushPermissionStatusAsync,
  registerForPushNotificationsAsync,
  sendTestPushNotification,
} from '@/services/pushNotificationService';
import {
  registerPushToken,
  setCurrentPushToken,
  getCurrentPushToken,
} from '@/services/pushTokenService';

type PushStatus = 'checking' | 'granted' | 'denied' | 'undetermined' | 'unsupported';

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
  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [registeredToken, setRegisteredToken] = useState<string | null>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (profile?.notification_settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(profile.notification_settings as Partial<NotificationSettings>),
      });
    }
  }, [profile]);

  const checkPushStatus = useCallback(async () => {
    if (Platform.OS === 'web' || !Device.isDevice) {
      setPushStatus('unsupported');
      return;
    }
    const status = await getPushPermissionStatusAsync();
    setPushStatus(status as PushStatus);
  }, []);

  // 画面表示時に現在のプッシュ通知権限状態を取得する
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web' || !Device.isDevice) {
        setPushStatus('unsupported');
        return;
      }
      const status = await getPushPermissionStatusAsync();
      setPushStatus(status as PushStatus);
    })();
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    updateProfile({ notification_settings: newSettings as any });
  };

  const handleEnablePush = async () => {
    if (pushStatus === 'denied') {
      // 一度拒否された場合はアプリからの再リクエストができないため、OS設定を開く
      Linking.openSettings();
      return;
    }

    setIsRequestingPush(true);
    try {
      const result = await registerForPushNotificationsAsync();
      if (result.status === 'success' && userId) {
        setCurrentPushToken(result.token);
        setRegisteredToken(result.token);
        await registerPushToken(userId, result.token, Platform.OS === 'ios' ? 'ios' : 'android', Device.deviceName);
      }
    } finally {
      setIsRequestingPush(false);
      checkPushStatus();
    }
  };

  useEffect(() => {
    if (pushStatus !== 'granted' || !userId) return;

    const existing = getCurrentPushToken();
    if (existing) {
      setRegisteredToken(existing);
      return;
    }

    (async () => {
      const result = await registerForPushNotificationsAsync();
      if (result.status === 'success') {
        setCurrentPushToken(result.token);
        setRegisteredToken(result.token);
        await registerPushToken(
          userId,
          result.token,
          Platform.OS === 'ios' ? 'ios' : 'android',
          Device.deviceName,
        );
      }
    })();
  }, [pushStatus, userId]);

  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    try {
      const result = await sendTestPushNotification();
      if (result.ok) {
        showToast({
          message: `テスト通知を送信しました（${result.sent} 端末）`,
          type: 'success',
        });
      } else {
        showToast({ message: result.message, type: 'error' });
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleShareToken = async () => {
    const token = registeredToken ?? getCurrentPushToken();
    if (!token) return;
    await Share.share({ message: token });
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
      {pushStatus !== 'unsupported' && (
        <View style={styles.pushCard}>
          <View style={styles.pushIconWrap}>
            <Ionicons
              name={pushStatus === 'granted' ? 'notifications' : 'notifications-off-outline'}
              size={22}
              color={pushStatus === 'granted' ? colors.primary[500] : colors.neutral[400]}
            />
          </View>
          <View style={styles.pushTextWrap}>
            <Text style={styles.pushTitle}>プッシュ通知</Text>
            <Text style={styles.pushDesc}>
              {pushStatus === 'granted'
                ? 'この端末でプッシュ通知が有効になっています'
                : pushStatus === 'denied'
                ? '端末の設定でプッシュ通知が無効になっています'
                : 'いいねやフォローなどをプッシュ通知でお知らせします'}
            </Text>
          </View>
          {pushStatus !== 'granted' && (
            <TouchableOpacity
              style={styles.pushButton}
              onPress={handleEnablePush}
              disabled={isRequestingPush}
            >
              {isRequestingPush ? (
                <ActivityIndicator size="small" color={colors.neutral[0]} />
              ) : (
                <Text style={styles.pushButtonText}>
                  {pushStatus === 'denied' ? '設定を開く' : '有効にする'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {pushStatus === 'granted' && (
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>実機テスト</Text>
          <Text style={styles.testDesc}>
            この端末へテスト通知を送信して、プッシュ通知が届くか確認できます。
            アプリをバックグラウンドにしてから送信すると確認しやすいです。
          </Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleSendTestPush}
            disabled={isSendingTest}
          >
            {isSendingTest ? (
              <ActivityIndicator size="small" color={colors.neutral[0]} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={16} color={colors.neutral[0]} />
                <Text style={styles.testButtonText}>テスト通知を送信</Text>
              </>
            )}
          </TouchableOpacity>
          {(registeredToken ?? getCurrentPushToken()) && (
            <TouchableOpacity style={styles.tokenRow} onPress={handleShareToken}>
              <Text style={styles.tokenLabel}>Push Token</Text>
              <Text style={styles.tokenValue} numberOfLines={1}>
                {(registeredToken ?? getCurrentPushToken())?.slice(0, 28)}...
              </Text>
              <Ionicons name="share-outline" size={16} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      )}

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
  pushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pushIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pushTextWrap: { flex: 1, paddingRight: 8 },
  pushTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 3 },
  pushDesc: { fontSize: 12, color: colors.neutral[500], lineHeight: 17 },
  pushButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 84,
    alignItems: 'center',
  },
  pushButtonText: { color: colors.neutral[0], fontSize: 13, fontWeight: '600' },
  testCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  testTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 6 },
  testDesc: { fontSize: 12, color: colors.neutral[500], lineHeight: 18, marginBottom: 14 },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    borderRadius: 10,
  },
  testButtonText: { color: colors.neutral[0], fontSize: 14, fontWeight: '600' },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 8,
  },
  tokenLabel: { fontSize: 11, color: colors.neutral[400], fontWeight: '600' },
  tokenValue: { flex: 1, fontSize: 11, color: colors.neutral[500], fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
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
