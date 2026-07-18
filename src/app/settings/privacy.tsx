import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import type { Database } from '@/types/database.types';

type PrivacySetting = Database['public']['Tables']['profiles']['Row']['privacy_setting'];

export default function PrivacySettingsScreen() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [setting, setSetting] = useState<PrivacySetting>('public');

  useEffect(() => {
    if (profile?.privacy_setting) {
      setSetting(profile.privacy_setting);
    }
  }, [profile]);

  const handleSelect = (value: PrivacySetting) => {
    setSetting(value);
    updateProfile({ privacy_setting: value });
  };

  const renderOption = (
    value: PrivacySetting,
    title: string,
    description: string,
    iconName: keyof typeof Ionicons.glyphMap
  ) => {
    const isSelected = setting === value;

    return (
      <TouchableOpacity
        style={[styles.optionContainer, isSelected && styles.optionContainerSelected]}
        onPress={() => handleSelect(value)}
        disabled={isPending}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
          <Ionicons 
            name={iconName} 
            size={24} 
            color={isSelected ? colors.primary[600] : colors.neutral[400]} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
            {title}
          </Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
        <View style={styles.radioContainer}>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
          )}
          {!isSelected && (
            <View style={styles.radioUnselected} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'プライバシーとセキュリティ',
          headerBackTitle: '戻る' 
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>アカウントの公開設定</Text>
        <Text style={styles.description}>
          あなたのプロフィールや本棚、レビューを誰が見ることができるかを設定します。
        </Text>

        <View style={styles.optionsList}>
          {renderOption(
            'public',
            '公開（パブリック）',
            'すべてのユーザーがあなたのプロフィールや投稿を見ることができます。',
            'earth-outline'
          )}
          
          <View style={styles.divider} />
          
          {renderOption(
            'followers_only',
            'フォロワーのみ',
            'あなたをフォローしているユーザーだけがプロフィールや投稿を見ることができます。',
            'people-outline'
          )}

          <View style={styles.divider} />

          {renderOption(
            'private',
            '非公開（プライベート）',
            '自分だけが記録を見ることができます。他のユーザーには公開されません。',
            'lock-closed-outline'
          )}
        </View>

        {isPending && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.savingText}>設定を保存中...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.preset.h3,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.preset.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  optionsList: {
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.neutral[0],
  },
  optionContainerSelected: {
    backgroundColor: colors.primary[50],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary[100],
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  optionTitle: {
    ...typography.preset.body,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: colors.primary[800],
  },
  optionDescription: {
    ...typography.preset.caption,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  radioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 48 + spacing.lg + spacing.md,
  },
  savingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  savingText: {
    ...typography.preset.bodySmall,
    color: colors.primary[500],
    marginLeft: spacing.sm,
  },
});
