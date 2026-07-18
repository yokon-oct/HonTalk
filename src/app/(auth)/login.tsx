/**
 * ログイン画面
 *
 * - react-hook-form + zod バリデーション
 * - Supabase Auth 連携（useAuth フック経由）
 * - パスワード表示切替
 * - ローディング・エラー表示
 * - 読書アプリらしい温かみのあるプレミアムUI
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { loginSchema, type LoginFormData } from '@/validators/auth';
import { useAuth } from '@/hooks/useAuth';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, isLoading } = useAuth();

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await signInWithEmail(data.email, data.password);
    if (result.success) {
      router.replace('/(tabs)');
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
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>📚</Text>
            </View>
            <Text style={styles.title}>HonTalk</Text>
            <Text style={styles.subtitle}>本でつながる、読書コミュニティ</Text>
          </View>

          {/* フォーム */}
          <View style={styles.formCard}>
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
              placeholder="8文字以上"
              isPassword
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
            />

            <PrimaryButton
              title="ログイン"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={styles.submitButton}
            />
          </View>

          {/* フッター */}
          <View style={styles.footer}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
            >
              <Text style={styles.registerButtonText}>
                アカウントをお持ちでない方は
                <Text style={styles.registerButtonTextBold}> 新規登録</Text>
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
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },

  // ヘッダー
  header: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    ...typography.preset.h1,
    fontSize: typography.fontSize['4xl'],
    color: colors.primary[500],
    marginBottom: spacing.xs,
    letterSpacing: 1,
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

  // フッター
  footer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    ...typography.preset.caption,
    color: colors.neutral[400],
    marginHorizontal: spacing.lg,
  },
  registerButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  registerButtonText: {
    ...typography.preset.bodySmall,
    color: colors.neutral[600],
  },
  registerButtonTextBold: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
});
