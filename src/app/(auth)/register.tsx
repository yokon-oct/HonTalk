/**
 * 新規登録画面
 *
 * - react-hook-form + zod バリデーション（registerSchema）
 * - Supabase Auth 連携（useAuth フック経由）
 * - パスワード確認フィールド
 * - パスワード強度インジケーター
 * - ローディング・エラー表示
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { registerSchema, type RegisterFormData } from '@/validators/auth';
import { useAuth } from '@/hooks/useAuth';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

/** パスワード強度を 0–4 のスコアで計算 */
function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['', '弱い', '普通', '良い', '強い'] as const;
const STRENGTH_COLORS = [
  colors.neutral[200],
  colors.error,
  colors.warning,
  colors.secondary[400],
  colors.secondary[500],
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, isLoading } = useAuth();

  const { control, handleSubmit, watch } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      nickname: '',
    },
  });

  const watchedPassword = watch('password');
  const strength = useMemo(
    () => getPasswordStrength(watchedPassword ?? ''),
    [watchedPassword],
  );

  const onSubmit = async (data: RegisterFormData) => {
    const result = await signUpWithEmail(data.email, data.password, data.nickname);
    if (result.success) {
      if ((result as any).needsEmailConfirmation) {
        Alert.alert(
          '確認メールを送信しました',
          'ご登録いただいたメールアドレスに確認リンクを送信しました。メールをご確認の上、ログインしてください。',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.neutral[700]} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>アカウント作成</Text>
              <Text style={styles.subtitle}>
                HonTalk で読書の世界を広げましょう
              </Text>
            </View>
          </View>

          {/* フォーム */}
          <View style={styles.formCard}>
            <FormInput
              control={control}
              name="nickname"
              label="ニックネーム"
              icon="person-outline"
              placeholder="2〜20文字"
              autoComplete="nickname"
              textContentType="nickname"
              returnKeyType="next"
            />

            <FormInput
              control={control}
              name="email"
              label="メールアドレス"
              icon="mail-outline"
              placeholder="example@email.com"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <FormInput
              control={control}
              name="password"
              label="パスワード"
              icon="lock-closed-outline"
              placeholder="英字と数字を含む8文字以上"
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />

            {/* パスワード強度インジケーター */}
            {watchedPassword ? (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strength >= level
                              ? STRENGTH_COLORS[strength]
                              : colors.neutral[200],
                        },
                      ]}
                    />
                  ))}
                </View>
                {strength > 0 && (
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: STRENGTH_COLORS[strength] },
                    ]}
                  >
                    {STRENGTH_LABELS[strength]}
                  </Text>
                )}
              </View>
            ) : null}

            <FormInput
              control={control}
              name="confirmPassword"
              label="パスワード（確認）"
              icon="lock-closed-outline"
              placeholder="もう一度入力してください"
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
            />

            <PrimaryButton
              title="アカウントを作成"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={styles.submitButton}
            />

            {/* 利用規約 */}
            <Text style={styles.termsText}>
              アカウントを作成すると、
              <Text style={styles.termsLink}>利用規約</Text>
              および
              <Text style={styles.termsLink}>プライバシーポリシー</Text>
              に同意したことになります。
            </Text>
          </View>

          {/* フッター */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkText}>
                既にアカウントをお持ちの方は
                <Text style={styles.loginLinkTextBold}> ログイン</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },

  // ヘッダー
  header: {
    marginBottom: spacing['3xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  headerContent: {},
  title: {
    ...typography.preset.h1,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.preset.body,
    color: colors.neutral[500],
  },

  // フォーム
  formCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  submitButton: {
    marginTop: spacing.sm,
  },

  // パスワード強度
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    ...typography.preset.caption,
    fontWeight: typography.fontWeight.semibold,
    minWidth: 28,
    textAlign: 'right',
  },

  // 利用規約
  termsText: {
    ...typography.preset.caption,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },

  // フッター
  footer: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  loginLink: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  loginLinkText: {
    ...typography.preset.bodySmall,
    color: colors.neutral[600],
  },
  loginLinkTextBold: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
});
