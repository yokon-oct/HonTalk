import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '@/components/review/ReviewCard';
import { useTimeline, useRecentReviews } from '@/hooks/useTimeline';
import type { ReviewWithDetails } from '@/services/reviewService';

type TabType = 'following' | 'recent';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('following');

  const followingQuery = useTimeline();
  const recentQuery = useRecentReviews();

  const currentQuery = activeTab === 'following' ? followingQuery : recentQuery;
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isFetching } = currentQuery;

  const reviews = data?.pages.flatMap(page => page.items) ?? [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      );
    }

    if (activeTab === 'following') {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color={colors.neutral[300]} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>タイムラインがありません</Text>
          <Text style={styles.emptyText}>他のユーザーをフォローすると、ここに感想が流れてきます。</Text>
          <TouchableOpacity 
            style={styles.suggestionButton}
            onPress={() => setActiveTab('recent')}
          >
            <Text style={styles.suggestionButtonText}>「新着」から本やユーザーを探す</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="book-outline" size={64} color={colors.neutral[300]} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>新着の感想はまだありません。</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </View>
      );
    }
    return <View style={{ height: 80 }} />; // FABの裏に隠れないように余白
  };

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={styles.errorText}>タイムラインの取得に失敗しました</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* タブ切り替え（セグメントコントロール） */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'following' && styles.tabButtonActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            フォロー中
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'recent' && styles.tabButtonActive]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
            新着（すべて）
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: ReviewWithDetails }) => (
          <ReviewCard
            review={item}
            showBookInfo={true}
            onPress={(r) => router.push(`/review/${r.id}`)}
            onPressUser={(userId) => router.push(`/user/${userId}`)}
            onPressBook={(bookId) => router.push(`/book/${bookId}`)}
            onPressComment={(reviewId) => router.push(`/review/${reviewId}`)}
          />
        )}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={refetch}
      />

      {/* FAB - レビュー作成へ */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/review/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="create" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
  },
  tabButtonActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingVertical: 12,
    gap: 12,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: 8,
  },
  retryText: {
    color: colors.neutral[700],
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  emptyText: {
    color: colors.neutral[500],
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  suggestionButton: {
    backgroundColor: colors.primary[50],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  suggestionButtonText: {
    color: colors.primary[600],
    fontWeight: 'bold',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary[500],
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
