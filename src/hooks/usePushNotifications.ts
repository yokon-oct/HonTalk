/**
 * プッシュ通知の登録・受信・タップ時遷移を管理するフック
 *
 * ルートレイアウトで一度だけ呼び出すことを想定している。
 * - ログイン中: 通知権限をリクエストし、Expo Push Token を DB に登録する
 * - 通知タップ時: 通知の種類に応じて適切な画面へ遷移する
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { notificationKeys } from '@/hooks/useNotifications';
import {
  registerForPushNotificationsAsync,
} from '@/services/pushNotificationService';
import {
  registerPushToken,
  setCurrentPushToken,
} from '@/services/pushTokenService';

interface PushNotificationData {
  type?: 'like' | 'comment' | 'follow' | 'recommend' | 'system';
  reference_type?: string | null;
  reference_id?: string | null;
  actor_id?: string | null;
}

export function usePushNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const hasNavigatedForResponseRef = useRef<string | null>(null);

  // ログイン中のみ Push Token を登録する
  useEffect(() => {
    if (!userId) return;

    let isCancelled = false;

    (async () => {
      const result = await registerForPushNotificationsAsync();
      if (isCancelled || result.status !== 'success') return;

      setCurrentPushToken(result.token);
      await registerPushToken(
        userId,
        result.token,
        Platform.OS === 'ios' ? 'ios' : 'android',
        Device.deviceName,
      );
    })();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  // 通知の種類に応じて遷移先を決定する
  const navigateFromData = (data: PushNotificationData | undefined) => {
    if (!data) return;

    if (data.reference_type === 'review' && data.reference_id) {
      router.push(`/review/${data.reference_id}`);
    } else if (data.type === 'follow' && data.actor_id) {
      router.push(`/user/${data.actor_id}`);
    } else {
      router.push('/(tabs)/notifications');
    }
  };

  // フォアグラウンド受信 / タップ時の挙動を登録する
  useEffect(() => {
    // フォアグラウンドで通知を受信した場合、未読件数・一覧を再取得する
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    });

    // 通知をタップして開いた場合、該当画面へ遷移する
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const requestId = response.notification.request.identifier;
        if (hasNavigatedForResponseRef.current === requestId) return;
        hasNavigatedForResponseRef.current = requestId;
        navigateFromData(response.notification.request.content.data as PushNotificationData);
      },
    );

    // アプリが通知タップで完全新規起動された場合（コールドスタート）にも対応する
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const requestId = response.notification.request.identifier;
      if (hasNavigatedForResponseRef.current === requestId) return;
      hasNavigatedForResponseRef.current = requestId;
      navigateFromData(response.notification.request.content.data as PushNotificationData);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
    // router / queryClient は安定参照のため依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
