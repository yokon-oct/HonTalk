#!/usr/bin/env node
/**
 * Expo Push Token へ直接テスト通知を送信する CLI スクリプト
 *
 * 使い方:
 *   node scripts/send-test-push.mjs ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *
 * アプリの「設定 > 通知設定」で Push Token を共有して取得できます。
 * または Supabase の push_tokens テーブルから確認できます。
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const token = process.argv[2];

if (!token) {
  console.error('Usage: node scripts/send-test-push.mjs <ExpoPushToken>');
  process.exit(1);
}

const message = {
  to: token,
  sound: 'default',
  title: 'HonTalk',
  body: 'CLI からのテスト通知です。',
  data: { type: 'system' },
};

const response = await fetch(EXPO_PUSH_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  },
  body: JSON.stringify([message]),
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));

const ticket = result?.data?.[0];
if (ticket?.status === 'error') {
  process.exit(1);
}
