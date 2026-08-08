import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';

import { useAuth } from '@/hooks/useAuth';
import { isAppleSignInAvailable } from '@/services/oauthService';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface SocialAuthButtonsProps {
  disabled?: boolean;
  onSuccess?: () => void;
}

export function SocialAuthButtons({ disabled, onSuccess }: SocialAuthButtonsProps) {
  const { signInWithGoogle, signInWithApple, isLoading } = useAuth();
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | null>(null);

  const handleGoogle = async () => {
    if (Platform.OS === 'ios' && !Device.isDevice) {
      Alert.alert(
        'シミュレータでの Google ログイン',
        'QR コードは使わず、Safari で開いた Google 画面からメール/パスワードでログインしてください。\n\nうまくいかない場合は実機、またはメールログインをお試しください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '続ける', onPress: () => void runGoogleSignIn() },
        ],
      );
      return;
    }

    await runGoogleSignIn();
  };

  const runGoogleSignIn = async () => {
    setActiveProvider('google');
    try {
      const result = await signInWithGoogle();
      if (result.success) onSuccess?.();
    } finally {
      setActiveProvider(null);
    }
  };

  const handleApple = async () => {
    setActiveProvider('apple');
    try {
      const result = await signInWithApple();
      if (result.success) onSuccess?.();
    } finally {
      setActiveProvider(null);
    }
  };

  const isBusy = isLoading || activeProvider !== null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={handleGoogle}
        disabled={disabled || isBusy}
        activeOpacity={0.7}
      >
        {activeProvider === 'google' ? (
          <ActivityIndicator size="small" color={colors.neutral[700]} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>Google で続ける</Text>
          </>
        )}
      </TouchableOpacity>

      {isAppleSignInAvailable() && (
        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={handleApple}
          disabled={disabled || isBusy}
          activeOpacity={0.7}
        >
          {activeProvider === 'apple' ? (
            <ActivityIndicator size="small" color={colors.neutral[0]} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={22} color={colors.neutral[0]} />
              <Text style={styles.appleButtonText}>Apple で続ける</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS === 'ios' && !Device.isDevice && (
        <Text style={styles.hint}>
          シミュレータでは QR コードを使わず、Safari 上でメール/パスワード入力してください
        </Text>
      )}

      {Platform.OS === 'android' && (
        <Text style={styles.hint}>Apple ログインは iOS アプリでご利用いただけます</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 48,
  },
  googleButton: {
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  googleButtonText: {
    ...typography.preset.body,
    color: colors.neutral[800],
    fontWeight: typography.fontWeight.semibold,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleButtonText: {
    ...typography.preset.body,
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.semibold,
  },
  hint: {
    ...typography.preset.caption,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
