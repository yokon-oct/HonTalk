/**
 * ログイン情報のローカル保存
 *
 * SecureStore（Web は localStorage）にメールアドレスとパスワードを保存する。
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  email: 'hontalk_saved_email',
  password: 'hontalk_saved_password',
  remember: 'hontalk_remember_credentials',
} as const;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface SavedCredentials {
  email: string;
  password: string;
}

/** 保存済みのログイン情報を取得する */
export async function loadSavedCredentials(): Promise<SavedCredentials | null> {
  const remember = await getItem(KEYS.remember);
  if (remember !== 'true') return null;

  const email = await getItem(KEYS.email);
  const password = await getItem(KEYS.password);
  if (!email || !password) return null;

  return { email, password };
}

/** ログイン情報を保存する */
export async function saveCredentials(email: string, password: string): Promise<void> {
  await Promise.all([
    setItem(KEYS.remember, 'true'),
    setItem(KEYS.email, email),
    setItem(KEYS.password, password),
  ]);
}

/** 保存済みのログイン情報を削除する */
export async function clearSavedCredentials(): Promise<void> {
  await Promise.all([
    removeItem(KEYS.remember),
    removeItem(KEYS.email),
    removeItem(KEYS.password),
  ]);
}
