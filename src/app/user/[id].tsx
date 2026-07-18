import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { useProfileWithStats } from '@/hooks/useProfile';
import { useReadingRecords } from '@/hooks/useBooks';
import { useReviewsByUser } from '@/hooks/useReviews';
import { useIsFollowing, useToggleFollow } from '@/hooks/useFollow';
import { ReviewCard } from '@/components/review/ReviewCard';
import { useAuthStore } from '@/stores/authStore';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  
  const isOwnProfile = currentUserId === id;

  const { data: profileData, isLoading: profileLoading } = useProfileWithStats(id);
  const { data: isFollowing, isLoading: followCheckLoading } = useIsFollowing(id || '');
  const { mutate: toggleFollow, isPending: followPending } = useToggleFollow();

  const handleToggleFollow = () => {
    if (!id || followPending) return;
    toggleFollow({ targetId: id, isFollowing: !!isFollowing });
  };

  const { data: readingRecords, isLoading: recordsLoading } = useReadingRecords(id);
  const { data: reviews, isLoading: reviewsLoading } = useReviewsByUser(id || '');

  if (profileLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
        <Text style={styles.errorText}>ユーザーが見つかりません</Text>
      </View>
    );
  }

  const profile = profileData;
  const stats = profileData.stats || {
    following_count: 0,
    followers_count: 0,
    read_count: 0,
    want_to_read_count: 0
  };
  const recentRecords = readingRecords?.slice(0, 6) || [];

  // プライバシー設定に基づく表示制御
  const isPrivate = profile.privacy_setting === 'private' && !isOwnProfile;
  const isFollowersOnly = profile.privacy_setting === 'followers_only' && !isFollowing && !isOwnProfile;
  const canViewContent = !isPrivate && !isFollowersOnly;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: profile.nickname,
          headerBackTitle: '戻る' 
        }} 
      />

      {/* プロフィールヘッダー */}
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={colors.neutral[400]} />
          </View>
        )}
        
        <View style={styles.headerRight}>
          <Text style={styles.name}>{profile.nickname}</Text>
          {/* フォローボタン (自分のプロフィールでない場合のみ表示) */}
          {!isOwnProfile && (
            <TouchableOpacity 
              style={[styles.followButton, isFollowing && styles.followingActiveButton]}
              onPress={handleToggleFollow}
              disabled={followPending || followCheckLoading}
            >
              {followPending || followCheckLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.neutral[700] : '#ffffff'} />
              ) : (
                <>
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add-outline'}
                    size={16}
                    color={isFollowing ? colors.neutral[700] : '#ffffff'}
                  />
                  <Text style={[styles.followButtonText, isFollowing && styles.followingActiveText]}>
                    {isFollowing ? 'フォロー中' : 'フォローする'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {canViewContent ? (
        <>
          {/* 自己紹介 */}
          <Text style={styles.bio}>{profile.bio || '自己紹介はまだありません。'}</Text>

          {/* スタッツ */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.read_count}</Text>
              <Text style={styles.statLabel}>読了</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.want_to_read_count}</Text>
              <Text style={styles.statLabel}>読みたい</Text>
            </View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/user/${profile.id}/follows?tab=following`)}
            >
              <Text style={styles.statNumber}>{stats.following_count}</Text>
              <Text style={styles.statLabel}>フォロー</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/user/${profile.id}/follows?tab=followers`)}
            >
              <Text style={styles.statNumber}>{stats.followers_count}</Text>
              <Text style={styles.statLabel}>フォロワー</Text>
            </TouchableOpacity>
          </View>

          {/* 本棚セクション */}
          <View style={styles.shelfSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{profile.nickname}の本棚</Text>
              <TouchableOpacity onPress={() => router.push(`/shelf/${profile.id}`)}>
                <Text style={styles.seeAllText}>すべて見る</Text>
              </TouchableOpacity>
            </View>
            
            {recentRecords && recentRecords.length > 0 ? (
              <View style={styles.shelfGrid}>
                {recentRecords.map((record: any) => (
                  <TouchableOpacity
                    key={record.id}
                    style={styles.bookItem}
                    onPress={() => router.push(`/book/${record.book_id}`)}
                  >
                    {record.book?.cover_image_url ? (
                      <Image source={{ uri: record.book.cover_image_url }} style={styles.bookCover} />
                    ) : (
                      <View style={styles.bookCoverPlaceholder}>
                        <Ionicons name="book" size={24} color={colors.neutral[400]} />
                      </View>
                    )}
                    <Text style={styles.bookTitle} numberOfLines={1}>{record.book?.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noBooks}>本棚にはまだ本が登録されていません。</Text>
            )}
          </View>

          {/* レビュー一覧セクション */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>最近のレビュー</Text>
            {reviewsLoading ? (
              <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginTop: 20 }} />
            ) : reviews && reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showBookInfo={true}
                    onPressBook={(bookId) => router.push(`/book/${bookId}`)}
                    onPress={(r) => router.push(`/review/${r.id}`)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.noReviewsText}>まだレビューがありません。</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.privateContainer}>
          <Ionicons name="lock-closed" size={48} color={colors.neutral[300]} />
          <Text style={styles.privateTitle}>このアカウントは非公開です</Text>
          <Text style={styles.privateText}>
            {profile.privacy_setting === 'followers_only' 
              ? 'フォローすると、プロフィールや本棚、レビューを見ることができます。'
              : 'このユーザーはプロフィールを非公開に設定しています。'}
          </Text>
        </View>
      )}
    </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[200],
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  followingActiveButton: {
    backgroundColor: colors.neutral[200],
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followingActiveText: {
    color: colors.neutral[700],
  },
  bio: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 22,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.neutral[0],
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  shelfSection: {
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  seeAllText: {
    ...typography.preset.bodySmall,
    color: colors.primary[500],
    fontWeight: 'bold',
  },
  shelfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookItem: {
    width: '30%',
    marginBottom: 16,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: colors.neutral[200],
    marginBottom: 8,
  },
  bookCoverPlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 12,
    color: colors.neutral[800],
  },
  noBooks: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: 32,
  },
  errorText: {
    marginTop: spacing.md,
    ...typography.preset.body,
    color: colors.neutral[500],
  },
  reviewsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  reviewsList: {
    marginTop: 16,
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: 24,
    marginTop: 16,
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
  },
  privateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  privateText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
