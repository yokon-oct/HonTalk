#!/usr/bin/env node
/**
 * Apple Sign In 用 OAuth Secret（JWT）を生成する
 *
 * Supabase → Authentication → Providers → Apple → Secret Key (for OAuth) に貼り付ける。
 * 有効期限は最大 6 ヶ月。期限切れ前に再生成すること。
 *
 * 使用例:
 *   node scripts/generate-apple-client-secret.mjs \
 *     --team-id AB12CD34EF \
 *     --client-id com.hontalk.app.auth \
 *     --key-id 45CCP4S5J9 \
 *     --key-path ~/Downloads/AuthKey_45CCP4S5J9.p8
 */

import { readFileSync } from 'node:fs';
import { sign } from 'node:crypto';

const MAX_DAYS = 180;
const AUD = 'https://appleid.apple.com';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`--${key} の値が指定されていません`);
    }
    result[key] = value;
    i += 1;
  }
  return result;
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlBuffer(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const args = parseArgs(process.argv.slice(2));

const teamId = args['team-id'] ?? process.env.APPLE_TEAM_ID;
const clientId = args['client-id'] ?? process.env.APPLE_SERVICES_ID ?? 'com.hontalk.app.auth';
const keyId = args['key-id'] ?? process.env.APPLE_KEY_ID ?? '45CCP4S5J9';
const keyPath = args['key-path'] ?? process.env.APPLE_KEY_PATH;

if (!teamId || !keyPath) {
  console.error(`
Apple OAuth Secret (JWT) 生成スクリプト

必須:
  --team-id     Apple Developer の Team ID（Membership details）
  --key-path    AuthKey_XXXXX.p8 のパス

任意:
  --client-id   Services ID（既定: com.hontalk.app.auth）
  --key-id      Key ID（既定: 45CCP4S5J9）

例:
  node scripts/generate-apple-client-secret.mjs \\
    --team-id AB12CD34EF \\
    --key-path ~/Downloads/AuthKey_45CCP4S5J9.p8
`);
  process.exit(1);
}

const privateKey = readFileSync(keyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + MAX_DAYS * 24 * 60 * 60;

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: AUD,
  sub: clientId,
};

const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
const signature = sign('sha256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

const jwt = `${signingInput}.${base64urlBuffer(signature)}`;

console.error('\n以下を Supabase → Auth → Providers → Apple → Secret Key (for OAuth) に貼り付けてください:\n');
console.log(jwt);
console.error(`\n（Services ID: ${clientId}, Key ID: ${keyId}, 有効期限: 約 ${MAX_DAYS} 日）\n`);
