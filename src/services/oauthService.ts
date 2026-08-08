/**
 * ソーシャルログイン（Google / Apple）
 *
 * Google: Supabase OAuth + expo-web-browser
 * Apple:  expo-apple-authentication + signInWithIdToken（iOS のみ）
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import {
  cancelPendingOAuth,
  notifyOAuthCallback,
  OAUTH_REDIRECT_URI,
  waitForOAuthCallback,
} from './oauthCallbackBridge';

WebBrowser.maybeCompleteAuthSession();

export { OAUTH_REDIRECT_URI };

export type OAuthSignInResult =
  | { cancelled: true }
  | { cancelled: false; session: Session };

function createRawNonce(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function hashSha256Hex(value: string): Promise<string> {
  try {
    const Crypto = await import('expo-crypto');
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      value,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
  } catch {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const data = new TextEncoder().encode(value);
      const hashBuffer = await subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }
  }

  throw new Error(
    'Apple ログインを使うには dev client の再ビルドが必要です。`npx expo run:ios` または `npm run ios:build` を実行してください。',
  );
}

/** OAuth コールバック URL から Supabase セッションを復元する */
export async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  if (params.error_description) {
    throw new Error(String(params.error_description));
  }

  // PKCE: ?code=...
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  // Implicit: #access_token=...&refresh_token=...
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (error) throw error;
  return data.session;
}

async function settleGoogleOAuth(callbackUrl: string): Promise<OAuthSignInResult> {
  console.log('[OAuth] callback received');
  const session = await createSessionFromUrl(callbackUrl);
  if (!session) {
    throw new Error(
      '認証情報の取得に失敗しました。Supabase の Redirect URLs に ' +
        `${OAUTH_REDIRECT_URI} が登録されているか確認してください。`,
    );
  }
  return { cancelled: false, session };
}

/**
 * Google OAuth でログイン / 新規登録
 *
 * iOS シミュレータでは QR ログイン後にコールバックが届かないことがあるため、
 * シミュレータでは外部 Safari を使う。
 */
export async function signInWithGoogleOAuth(): Promise<OAuthSignInResult> {
  console.log('[OAuth] start, redirectTo=', OAUTH_REDIRECT_URI);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT_URI,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google ログイン URL の生成に失敗しました');

  const useExternalBrowser =
    Platform.OS === 'ios' && !Device.isDevice;

  const callbackPromise = waitForOAuthCallback(90_000);

  try {
    if (useExternalBrowser) {
      console.log('[OAuth] opening external Safari (simulator)');
      const canOpen = await Linking.canOpenURL(data.url);
      if (!canOpen) {
        throw new Error('Google ログイン画面を開けませんでした');
      }
      await Linking.openURL(data.url);
    } else {
      console.log('[OAuth] opening in-app auth session');
      void WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI, {
        preferEphemeralSession: true,
      }).then((result) => {
        console.log('[OAuth] auth session result=', result.type);
        if (result.type === 'success' && result.url) {
          notifyOAuthCallback(result.url);
        } else if (result.type === 'dismiss' || result.type === 'cancel') {
          setTimeout(() => cancelPendingOAuth(), 1_500);
        }
      });
    }

    const callbackUrl = await callbackPromise;
    return await settleGoogleOAuth(callbackUrl);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('キャンセル') || err.message.includes('中断'))
    ) {
      return { cancelled: true };
    }
    cancelPendingOAuth();
    throw err;
  }
}

/** Apple ネイティブ Sign In（iOS のみ） */
export async function signInWithAppleNative(): Promise<OAuthSignInResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple ログインは iOS のみ対応しています');
  }

  let AppleAuthentication: typeof import('expo-apple-authentication');
  try {
    AppleAuthentication = await import('expo-apple-authentication');
  } catch {
    throw new Error(
      'Apple ログインを使うには dev client の再ビルドが必要です。`npx expo run:ios` または `npm run ios:build` を実行してください。',
    );
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple ログインが利用できません');
  }

  const rawNonce = createRawNonce();
  const hashedNonce = await hashSha256Hex(rawNonce);

  let credential: import('expo-apple-authentication').AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      return { cancelled: true };
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple ID トークンの取得に失敗しました');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;
  if (!data.session) {
    throw new Error('Apple ログインのセッション確立に失敗しました');
  }

  if (credential.fullName && data.user) {
    const givenName = credential.fullName.givenName ?? '';
    const familyName = credential.fullName.familyName ?? '';
    const fullName = [givenName, familyName].filter(Boolean).join(' ');

    if (fullName) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName || undefined,
          family_name: familyName || undefined,
        },
      });

      await updateAutoGeneratedNickname(data.user.id, fullName);
    }
  }

  return { cancelled: false, session: data.session };
}

async function updateAutoGeneratedNickname(userId: string, displayName: string) {
  const nickname = displayName.trim().slice(0, 20);
  if (!nickname) return;

  const { data: profile } = await (supabase.from('profiles') as any)
    .select('nickname')
    .eq('id', userId)
    .single();

  if (profile && /^user_[a-f0-9]{8}$/i.test(profile.nickname)) {
    await (supabase.from('profiles') as any)
      .update({ nickname })
      .eq('id', userId);
  }
}

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}
