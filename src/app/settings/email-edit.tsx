import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { useForm } from 'react-hook-form';

import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FormInput } from '@/components/ui/FormInput';

interface EmailFormValues {
  email: string;
}

export default function EmailEditScreen() {
  const router = useRouter();
  const { user, updateEmail } = useAuth();
  
  const { control, handleSubmit: hookFormSubmit, setError: setHookFormError } = useForm<EmailFormValues>({
    defaultValues: { email: '' },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  const onSubmit = async (data: EmailFormValues) => {
    const newEmail = data.email;
    if (!newEmail.trim()) {
      setErrorText('新しいメールアドレスを入力してください');
      return;
    }
    
    // 簡易的なメールアドレスのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setErrorText('正しいメールアドレスの形式で入力してください');
      return;
    }
    
    if (newEmail === user?.email) {
      setErrorText('現在のメールアドレスと同じです');
      return;
    }

    setErrorText('');
    setIsSubmitting(true);
    
    const result = await updateEmail(newEmail);
    
    setIsSubmitting(false);
    
    if (result.success) {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'メールアドレス変更',
          headerBackTitle: '戻る' 
        }} 
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>現在のメールアドレス</Text>
          <Text style={styles.currentEmail}>{user?.email || '未設定'}</Text>
          
          <View style={styles.divider} />
          
          <FormInput
            control={control}
            name="email"
            label="新しいメールアドレス"
            placeholder="new-email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            icon="mail-outline"
          />
          {!!errorText && <Text style={{ color: colors.error, marginTop: -spacing.md, marginBottom: spacing.sm, ...typography.preset.bodySmall }}>{errorText}</Text>}
          
          <Text style={styles.helpText}>
            新しいメールアドレスを入力して保存すると、そのアドレス宛に確認メールが送信されます。メール内のリンクをクリックするまで変更は完了しません。
          </Text>

          <PrimaryButton
            title="変更をリクエストする"
            onPress={hookFormSubmit(onSubmit)}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.neutral[0],
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    ...typography.preset.bodySmall,
    color: colors.neutral[500],
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  currentEmail: {
    ...typography.preset.body,
    color: colors.neutral[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.lg,
  },
  helpText: {
    ...typography.preset.bodySmall,
    color: colors.neutral[600],
    marginTop: spacing.md,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});
