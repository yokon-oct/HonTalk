import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useBookRanking, useReviewRanking, useUserRanking } from '@/hooks/useRanking';
import type { RankingPeriod } from '@/services/rankingService';
import { RankingBookCard } from '@/components/ranking/RankingBookCard';
import { RankingUserCard } from '@/components/ranking/RankingUserCard';
import { RankingReviewCard } from '@/components/ranking/RankingReviewCard';

type RankingCategory = 'book' | 'review' | 'user';

const CATEGORIES: { label: string; value: RankingCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: '人気の本', value: 'book', icon: 'book-outline' },
  { label: '話題のレビュー', value: 'review', icon: 'flame-outline' },
  { label: '注目のユーザー', value: 'user', icon: 'people-outline' },
];

const PERIODS: { label: string; value: RankingPeriod }[] = [
  { label: '週間', value: 'week' },
  { label: '月間', value: 'month' },
];

export default function RankingScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<RankingCategory>('book');
  const [period, setPeriod] = useState<RankingPeriod>('week');

  const bookRanking = useBookRanking(period, category === 'book');
  const reviewRanking = useReviewRanking(period, category === 'review');
  const userRanking = useUserRanking(period, category === 'user');

  const current =
    category === 'book' ? bookRanking : category === 'review' ? reviewRanking : userRanking;

  const { isLoading, isError, refetch } = current;
  const data = current.data ?? [];

  return (
    <View style={styles.container}>
      {/* カテゴリタブ */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => {
          const isActive = category === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={c.icon}
                size={16}
                color={isActive ? colors.neutral[0] : colors.neutral[500]}
              />
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 期間タブ */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const isActive = period === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodTab, isActive && styles.periodTabActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>ランキングを集計中...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.errorText}>ランキングの取得に失敗しました</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>まだランキング対象のデータがありません</Text>
          <Text style={styles.emptySubText}>
            {PERIODS.find((p) => p.value === period)?.label}のアクティビティが増えると表示されます
          </Text>
        </View>
      ) : category === 'book' ? (
        <FlatList
          data={bookRanking.data ?? []}
          keyExtractor={(item) => item.book_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <RankingBookCard
              item={item}
              rank={index + 1}
              onPress={(bookId) => router.push(`/book/${bookId}`)}
            />
          )}
        />
      ) : category === 'review' ? (
        <FlatList
          data={reviewRanking.data ?? []}
          keyExtractor={(item) => item.review_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <RankingReviewCard
              item={item}
              rank={index + 1}
              onPress={(review) => router.push(`/review/${review.id}`)}
              onPressUser={(userId) => router.push(`/user/${userId}`)}
              onPressBook={(bookId) => router.push(`/book/${bookId}`)}
              onPressComment={(reviewId) => router.push(`/review/${reviewId}`)}
            />
          )}
        />
      ) : (
        <FlatList
          data={userRanking.data ?? []}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <RankingUserCard
              item={item}
              rank={index + 1}
              onPress={(userId) => router.push(`/user/${userId}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.neutral[0],
  },
  categoryTabActive: {
    backgroundColor: colors.primary[500],
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  categoryTextActive: {
    color: colors.neutral[0],
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  periodTabActive: {
    backgroundColor: colors.accent[100],
    borderColor: colors.accent[300],
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  periodTextActive: {
    color: colors.accent[700],
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorText: {
    fontSize: 15,
    color: colors.neutral[600],
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary[500],
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[600],
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
