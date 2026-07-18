/**
 * PrimaryButton — ローディングスピナー内蔵のプライマリボタン
 *
 * - disabled 時のスタイル自動変更
 * - ローディング中は ActivityIndicator 表示
 * - プレスアニメーション
 */

import React, { useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface PrimaryButtonProps {
  /** ボタンのテキスト */
  title: string;
  /** 押下時のコールバック */
  onPress: () => void;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** 無効化 */
  disabled?: boolean;
  /** スタイルバリアント */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 追加スタイル */
  style?: ViewStyle;
  /** テキストスタイル上書き */
  textStyle?: TextStyle;
}

export function PrimaryButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: PrimaryButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || isLoading;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    isDisabled && styles.buttonDisabled,
    style,
  ];

  const labelStyles = [
    styles.buttonText,
    variant === 'outline' && styles.buttonTextOutline,
    isDisabled && styles.buttonTextDisabled,
    textStyle,
  ];

  const spinnerColor =
    variant === 'outline' ? colors.primary[500] : colors.neutral[0];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyles}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <Text style={labelStyles}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPrimary: {
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary[500],
    shadowColor: colors.secondary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
    shadowOpacity: 0,
    elevation: 0,
    borderColor: colors.neutral[300],
  },
  buttonText: {
    ...typography.preset.button,
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.bold,
  },
  buttonTextOutline: {
    color: colors.primary[500],
  },
  buttonTextDisabled: {
    color: colors.neutral[500],
  },
});
