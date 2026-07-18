import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { searchBookByIsbn, upsertBook } from '@/services/bookService';

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

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // 連続でスキャンしないようにガード
    if (scanned || isSearching) return;
    
    setScanned(true);
    setIsSearching(true);

    try {
      const bookItem = await searchBookByIsbn(data);
      if (bookItem) {
        // 見つかったらDBに保存（upsert）して詳細画面へ
        const savedBook = await upsertBook(bookItem);
        // replace を使うことで、戻るボタンでスキャン画面に戻らず検索画面等に戻れる
        router.replace(`/book/${savedBook.id}`);
      } else {
        Alert.alert(
          '見つかりませんでした',
          'このバーコードに一致する本が見つかりませんでした。',
          [{ text: 'もう一度', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'エラー',
        '検索中にエラーが発生しました。',
        [{ text: 'もう一度', onPress: () => setScanned(false) }]
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
          barcodeTypes: ['ean13', 'ean8'],
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
