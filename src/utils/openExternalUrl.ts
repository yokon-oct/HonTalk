import { Linking } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

/**
 * 外部 URL を開く（ネイティブはアプリ内ブラウザ、Web は新規タブ）
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch {
    await Linking.openURL(url);
  }
}
