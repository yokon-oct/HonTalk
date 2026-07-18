/**
 * FormInput — react-hook-form 統合済みフォーム入力コンポーネント
 *
 * - ラベル + TextInput + エラーメッセージをまとめた再利用可能コンポーネント
 * - フォーカス時のアニメーション付きボーダー
 * - パスワード表示切替ボタン内蔵
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface FormInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** react-hook-form の control */
  control: Control<T>;
  /** フィールド名 */
  name: Path<T>;
  /** ラベルテキスト */
  label: string;
  /** パスワード入力かどうか（表示切替ボタンを表示） */
  isPassword?: boolean;
  /** アイコン名（Ionicons） */
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  isPassword = false,
  icon,
  ...textInputProps
}: FormInputProps<T>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.neutral[200], colors.primary[400]],
  });

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.container}>
          <Text style={styles.label}>{label}</Text>
          <Animated.View
            style={[
              styles.inputWrapper,
              { borderColor: error ? colors.error : borderColor },
              isFocused && styles.inputWrapperFocused,
              error && styles.inputWrapperError,
            ]}
          >
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={isFocused ? colors.primary[500] : colors.neutral[400]}
                style={styles.icon}
              />
            )}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              onFocus={handleFocus}
              onBlur={() => {
                handleBlur();
                onBlur();
              }}
              placeholderTextColor={colors.neutral[400]}
              secureTextEntry={isPassword && !isPasswordVisible}
              autoCapitalize="none"
              {...textInputProps}
            />
            {isPassword && (
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.neutral[400]}
                />
              </TouchableOpacity>
            )}
          </Animated.View>
          {error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.preset.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
    marginLeft: spacing['2xs'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  inputWrapperFocused: {
    backgroundColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.preset.body,
    color: colors.neutral[900],
    paddingVertical: spacing.md,
  },
  eyeButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginLeft: spacing['2xs'],
    gap: 4,
  },
  errorText: {
    ...typography.preset.caption,
    color: colors.error,
  },
});
