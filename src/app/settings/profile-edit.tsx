import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { profileSchema, type ProfileFormData } from '@/validators/auth';
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfile';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending: updatePending } = useUpdateProfile();
  const { mutateAsync: uploadAvatar, isPending: uploadPending } = useUploadAvatar();

  const isPending = updatePending || uploadPending;

  const { control, handleSubmit } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: profile?.nickname || '',
      bio: profile?.bio || '',
      favoriteGenres: profile?.favorite_genres || [],
    },
    values: {
      nickname: profile?.nickname || '',
      bio: profile?.bio || '',
      favoriteGenres: profile?.favorite_genres || [],
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile({
        nickname: data.nickname,
        bio: data.bio,
        favorite_genres: data.favoriteGenres,
      });
      Alert.alert('更新完了', 'プロフィールを更新しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('エラー', error.message || '更新に失敗しました');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const asset = result.assets[0];
        await uploadAvatar({
          uri: asset.uri,
          type: asset.mimeType,
          name: asset.fileName || 'avatar.jpg',
        });
        Alert.alert('完了', 'プロフィール画像を更新しました');
      } catch (error: any) {
        Alert.alert('エラー', error.message || '画像のアップロードに失敗しました');
      }
    }
  };

  if (isProfileLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Stack.Screen 
          options={{ 
            headerShown: true, 
            title: 'プロフィールの編集',
            headerBackTitle: '戻る' 
          }} 
        />

        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handlePickImage}
            disabled={uploadPending}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.neutral[400]} />
              </View>
            )}
            <View style={styles.avatarEditIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>タップして画像を変更</Text>
        </View>

        <View style={styles.formCard}>
          <FormInput
            control={control}
            name="nickname"
            label="ニックネーム"
            icon="person-outline"
            placeholder="2〜20文字"
          />

          <FormInput
            control={control}
            name="bio"
            label="自己紹介"
            icon="document-text-outline"
            placeholder="200文字以内で自己紹介を入力"
            multiline
            style={styles.bioInput}
          />

          <PrimaryButton
            title="保存する"
            onPress={handleSubmit(onSubmit)}
            isLoading={isPending}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...typography.preset.body,
    color: colors.neutral[500],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing.xs,
    width: 40,
  },
  title: {
    ...typography.preset.h3,
    color: colors.neutral[900],
  },
  formCard: {
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.neutral[50],
  },
  avatarHint: {
    ...typography.preset.caption,
    color: colors.neutral[500],
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});
