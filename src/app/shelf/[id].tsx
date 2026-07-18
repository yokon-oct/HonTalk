import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { useReadingRecords } from '@/hooks/useBooks';
import { Database } from '@/types/database.types';

type ReadingStatus = Database['public']['Tables']['reading_records']['Row']['status'];
type FilterOption = ReadingStatus | 'all';

export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterOption>('all');

  const { data: records, isLoading, isError } = useReadingRecords(id);

  const filteredRecords = records?.filter((r) => filter === 'all' || r.status === filter) || [];

  const renderFilterButton = (label: string, value: FilterOption) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setFilter(value)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Stack.Screen options={{ title: '本棚', headerShown: true, headerBackTitle: '戻る' }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Stack.Screen options={{ title: '本棚', headerShown: true, headerBackTitle: '戻る' }} />
        <Text style={styles.errorText}>本棚の取得に失敗しました</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '本棚', headerShown: true, headerBackTitle: '戻る' }} />
      
      {/* フィルタータブ */}
      <View style={styles.filterContainer}>
        {renderFilterButton('すべて', 'all')}
        {renderFilterButton('読了', 'finished')}
        {renderFilterButton('読書中', 'reading')}
        {renderFilterButton('読みたい', 'want_to_read')}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookItem}
            onPress={() => router.push(`/book/${item.book_id}`)}
          >
            <Image 
              source={{ uri: item.book.cover_image_url || 'https://via.placeholder.com/150x200.png?text=No+Cover' }} 
              style={styles.bookCover} 
            />
            <Text style={styles.bookTitle} numberOfLines={2}>{item.book.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>該当する本がありません</Text>
          </View>
        }
      />
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
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral[0],
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
  activeFilterButton: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  filterText: {
    fontSize: 13,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  activeFilterText: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
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
  emptyText: {
    color: colors.neutral[500],
    fontSize: 15,
  },
});
