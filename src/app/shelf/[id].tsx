import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useReadingRecords, useDeleteReadingRecord } from '@/hooks/useBooks';
import { useAuthStore } from '@/stores/authStore';
import { Database } from '@/types/database.types';

type ReadingStatus = Database['public']['Tables']['reading_records']['Row']['status'];
type FilterOption = ReadingStatus | 'all';

export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isEditing, setIsEditing] = useState(false);

  const { data: records, isLoading, isError } = useReadingRecords(id);
  const { mutate: deleteRecord } = useDeleteReadingRecord();
  const isOwnShelf = !!user?.id && user.id === id;

  useEffect(() => {
    if ((records?.length ?? 0) === 0 && isEditing) {
      setIsEditing(false);
    }
  }, [records?.length, isEditing]);

  const filteredRecords = records?.filter((r) => filter === 'all' || r.status === filter) || [];

  const handleDeleteBook = useCallback((bookId: string, title: string) => {
    Alert.alert('本棚から削除', `「${title}」を本棚から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () =>
          deleteRecord(
            { bookId },
            {
              onError: (error) => {
                Alert.alert('エラー', '削除に失敗しました: ' + error.message);
              },
            },
          ),
      },
    ]);
  }, [deleteRecord]);

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
      <View style={styles.filterRow}>
        <View style={styles.filterContainer}>
          {renderFilterButton('すべて', 'all')}
          {renderFilterButton('読了', 'finished')}
          {renderFilterButton('読書中', 'reading')}
          {renderFilterButton('読みたい', 'want_to_read')}
        </View>
        {isOwnShelf && (records?.length ?? 0) > 0 && (
          <TouchableOpacity
            onPress={() => setIsEditing((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.editButtonText, isEditing && styles.editButtonTextActive]}>
              {isEditing ? '完了' : '編集'}
            </Text>
          </TouchableOpacity>
        )}
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
            onPress={() => {
              if (isOwnShelf && isEditing) {
                handleDeleteBook(item.book_id, item.book.title);
                return;
              }
              router.push(`/book/${item.book_id}`);
            }}
            onLongPress={
              isOwnShelf ? () => handleDeleteBook(item.book_id, item.book.title) : undefined
            }
            delayLongPress={400}
          >
            <View style={styles.bookCoverWrap}>
              <Image
                source={{ uri: item.book.cover_image_url || 'https://via.placeholder.com/150x200.png?text=No+Cover' }}
                style={styles.bookCover}
              />
              {isOwnShelf && isEditing && (
                <View style={styles.deleteBadge}>
                  <Ionicons name="remove-circle" size={22} color="#EF4444" />
                </View>
              )}
            </View>
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 8,
  },
  filterContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  editButtonTextActive: {
    color: colors.primary[500],
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
  bookCoverWrap: {
    width: '100%',
    marginBottom: 8,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.neutral[0],
    borderRadius: 11,
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
