import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useProfileWithStats } from '@/hooks/useProfile';
import { useReadingRecords } from '@/hooks/useBooks';
import { useReviewsByUser } from '@/hooks/useReviews';
import { ReviewCard } from '@/components/review/ReviewCard';
import type { ReviewWithDetails } from '@/services/reviewService';

const DUMMY_PROFILE = {
  id: '',
  nickname: '名無しさん',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  bio: '自己紹介はまだありません。',
  stats: {
    followers_count: 0,
    following_count: 0,
    read_count: 0,
    want_to_read_count: 0,
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const { 
    data: profileData, 
    isLoading: profileLoading, 
    isError: profileError,
    refetch: refetchProfile,
    isFetching: profileFetching
  } = useProfileWithStats();
  
  // profileData?.id がある場合のみ実際の読書記録と投稿を取得する
  const { 
    data: readingRecords, 
    isLoading: recordsLoading,
    refetch: refetchRecords,
    isFetching: recordsFetching
  } = useReadingRecords(profileData?.id);
  
  const { 
    data: reviews, 
    isLoading: reviewsLoading,
    refetch: refetchReviews,
    isFetching: reviewsFetching
  } = useReviewsByUser(profileData?.id);

  const isRefreshing = profileFetching || recordsFetching || reviewsFetching;

  const handleRefresh = useCallback(() => {
    refetchProfile();
    refetchRecords();
    refetchReviews();
  }, [refetchProfile, refetchRecords, refetchReviews]);

  const handlePressReview = useCallback((review: ReviewWithDetails) => {
    router.push(`/review/${review.id}`);
  }, [router]);

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const profile = profileData || DUMMY_PROFILE;
  const stats = profileData?.stats || DUMMY_PROFILE.stats;
  
  // 最新の読書記録を最大6件だけ取得して本棚に表示
  const recentRecords = readingRecords?.slice(0, 6) || [];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* プロフィールヘッダー */}
      <View style={styles.header}>
        <Image 
          source={{ uri: profile.avatar_url || DUMMY_PROFILE.avatar_url }} 
          style={styles.avatar} 
        />
        <View style={styles.headerRight}>
          <Text style={styles.name}>{profile.nickname || '名無しさん'}</Text>
          {/* 設定ボタン */}
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={18} color={colors.neutral[600]} />
            <Text style={styles.settingsButtonText}>設定</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 自己紹介 */}
      <Text style={styles.bio}>{profile.bio || '自己紹介はまだありません。'}</Text>

      {/* フォロー・フォロワー・スタッツ */}
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
          <Text style={styles.sectionTitle}>マイ本棚（最近追加した本）</Text>
          {profileData?.id && (
            <TouchableOpacity onPress={() => router.push(`/shelf/${profileData.id}`)}>
              <Text style={styles.seeAllText}>すべて見る</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {recordsLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginTop: 20 }} />
        ) : recentRecords.length > 0 ? (
          <View style={styles.shelfGrid}>
            {recentRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.bookItem}
                onPress={() => router.push(`/book/${record.book_id}`)}
              >
                <Image 
                  source={{ uri: record.book.cover_image_url || 'https://via.placeholder.com/150x200.png?text=No+Cover' }} 
                  style={styles.bookCover} 
                />
                <Text style={styles.bookTitle} numberOfLines={1}>{record.book.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.neutral[500], marginTop: 12, marginBottom: 8 }}>まだ本棚に本がありません</Text>
        )}
      </View>

      {/* タイムラインセクションのヘッダー */}
      <View style={styles.timelineHeaderRow}>
        <Text style={styles.sectionTitle}>最新の投稿</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (reviewsLoading) return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>まだ投稿がありません</Text>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={reviews || []}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary[500]}
          colors={[colors.primary[500]]}
        />
      }
      renderItem={({ item }) => (
        <ReviewCard 
          review={item} 
          showBookInfo={true} 
          onPress={handlePressReview}
          onPressUser={(userId) => router.push(`/user/${userId}`)}
          onPressBook={(bookId) => router.push(`/book/${bookId}`)}
          onPressComment={(reviewId) => router.push(`/review/${reviewId}`)}
        />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerContainer: {
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
  headerRight: {
    marginLeft: 20,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  settingsButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  bio: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
  },
  shelfSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
  },
  shelfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bookItem: {
    width: '29%',
    gap: 6,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  bookTitle: {
    fontSize: 12,
    color: colors.neutral[800],
    textAlign: 'center',
  },
  timelineHeaderRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    marginBottom: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.neutral[500],
    fontSize: 15,
  },
});
