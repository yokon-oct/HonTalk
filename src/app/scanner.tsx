import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { searchBookByIsbn, upsertBook, normalizeIsbn, isValidIsbn, GoogleBooksRateLimitError } from '@/services/bookService';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'バーコードスキャン', headerBackTitle: '戻る' }} />
        <Ionicons name="camera-outline" size={64} color={colors.neutral[300]} />
        <Text style={styles.permissionText}>カメラへのアクセスを許可してください</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>許可する</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resetScan = () => {
    setScanned(false);
    setIsSearching(false);
  };

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || isSearching) return;

    const isbn = normalizeIsbn(data);
    if (!isValidIsbn(isbn)) {
      Alert.alert(
        '無効なバーコード',
        '本のISBNバーコード（10桁または13桁）をスキャンしてください。',
        [{ text: 'OK' }],
      );
      return;
    }

    setScanned(true);
    setIsSearching(true);

    try {
      const bookItem = await searchBookByIsbn(isbn);
      if (bookItem) {
        const savedBook = await upsertBook(bookItem);
        router.replace(`/book/${savedBook.id}`);
      } else {
        Alert.alert(
          '見つかりませんでした',
          `ISBN: ${isbn}\n\nGoogle Books・楽天ブックスの両方で該当する本が見つかりませんでした。`,
          [{ text: 'もう一度', onPress: resetScan }],
        );
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof GoogleBooksRateLimitError
          ? '書籍検索APIの利用上限に達しました。しばらく待ってから再度お試しください。\n\n.env に EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY を設定すると改善する場合があります。'
          : error instanceof Error
            ? error.message
            : '検索中にエラーが発生しました。';

      Alert.alert(
        error instanceof GoogleBooksRateLimitError ? 'API利用上限' : 'エラー',
        message,
        [{ text: 'もう一度', onPress: resetScan }],
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '本のバーコードをスキャン',
          headerShown: true,
          headerBackTitle: '戻る',
          headerTransparent: true,
          headerTintColor: '#fff',
        }} 
      />
      
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128'],
        }}
      >
        <View style={styles.overlay}>
          {/* スキャン枠周辺を暗くするためのマスク（簡易版） */}
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>
            {isSearching ? '検索中...' : '枠の中にバーコードを合わせてください'}
          </Text>
          {isSearching && (
            <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  scanText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 32,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: colors.neutral[700],
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
