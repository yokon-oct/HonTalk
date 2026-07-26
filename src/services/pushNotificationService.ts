/**
 * プッシュ通知（Expo Notifications）関連の処理
 *
 * - フォアグラウンド時の通知表示設定
 * - 通知権限のリクエストと Expo Push Token の取得
 * - Android 通知チャンネルの作成
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// フォアグラウンド時にも通知バナー・サウンド・バッジを表示する
// （ルートレイアウトの初回レンダリング前に登録される必要があるため、モジュール読み込み時に実行）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android 用の通知チャンネルを作成する
 * (app.json の expo-notifications プラグイン設定と同じ 'default' チャンネル)
 */
export async function configureAndroidChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'デフォルト通知',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F5E6D3',
  });
}

/**
 * EAS プロジェクトIDを取得する
 * app.json の extra.eas.projectId、または EAS Build 時に自動設定される値を参照する
 */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

export type RegisterPushResult =
  | { status: 'success'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error'; error: unknown };

/**
 * 通知権限をリクエストし、Expo Push Token を取得する
 *
 * - 実機以外（シミュレータ）ではプッシュ通知は利用できないためスキップする
 * - projectId が未設定の場合もトークン取得はできないためスキップする
 */
export async function registerForPushNotificationsAsync(): Promise<RegisterPushResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported' };
  }

  if (!Device.isDevice) {
    // シミュレータ / エミュレータではプッシュ通知トークンを取得できない
    return { status: 'unsupported' };
  }

  await configureAndroidChannelAsync();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { status: 'denied' };
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      '[HonTalk] EAS projectId が未設定のため Push Token を取得できません。' +
        'app.json の extra.eas.projectId を設定してください。',
    );
    return { status: 'error', error: new Error('projectId is not set') };
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'success', token };
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return { status: 'error', error };
  }
}

/**
 * 現在の通知権限状態を取得する
 */
export async function getPushPermissionStatusAsync() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
