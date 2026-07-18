import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useReadingRecords } from '@/hooks/useBooks';
import { useAuthStore } from '@/stores/authStore';
import { Database } from '@/types/database.types';

type ReadingStatus = Database['public']['Tables']['reading_records']['Row']['status'];
type FilterOption = ReadingStatus | 'all';

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'すべて', value: 'all' },
  { label: '読了', value: 'finished' },
  { label: '読書中', value: 'reading' },
  { label: '読みたい', value: 'want_to_read' },
];

export default function ShelfTabScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterOption>('all');

  const { data: records, isLoading, isError, refetch } = useReadingRecords(user?.id ?? '');

  const filteredRecords =
    records?.filter((r) => filter === 'all' || r.status === filter) ?? [];

  if (!user?.id || isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>本棚の取得に失敗しました</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* フィルタータブ */}
      <View style={styles.filterContainer}>
        {FILTERS.map(({ label, value }) => {
          const isActive = filter === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshing={false}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookItem}
            onPress={() => router.push(`/book/${item.book_id}`)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri:
                  item.book.cover_image_url ||
                  'https://via.placeholder.com/150x200.png?text=No+Cover',
              }}
              style={styles.bookCover}
            />
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.book.title}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>本棚はまだ空です</Text>
            <Text style={styles.emptyText}>
              本を検索して本棚に追加してみましょう。
            </Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.searchButtonText}>本を探す</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral[200],
    borderRadius: 8,
  },
  retryText: {
    color: colors.neutral[700],
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterButtonActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  filterText: {
    fontSize: 13,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  bookItem: {
    width: '30%',
    alignItems: 'center',
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 12,
    color: colors.neutral[800],
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  searchButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
