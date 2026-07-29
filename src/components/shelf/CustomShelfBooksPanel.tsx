import React from 'react';
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
import { useShelfBooks } from '@/hooks/useShelves';

interface CustomShelfBooksPanelProps {
  shelfId: string;
  shelfName: string;
}

/**
 * カスタム本棚の書籍一覧（本棚タブの横スワイプページ用）
 */
export function CustomShelfBooksPanel({ shelfId, shelfName }: CustomShelfBooksPanelProps) {
  const router = useRouter();
  const { data: books, isLoading, isError, refetch } = useShelfBooks(shelfId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>本棚の取得に失敗しました</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={books ?? []}
      keyExtractor={(item) => item.id}
      numColumns={3}
      nestedScrollEnabled
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <Text style={styles.shelfTitle} numberOfLines={1}>
          {shelfName}
        </Text>
      }
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
          <Text style={styles.emptyTitle}>この本棚にはまだ本がありません</Text>
          <Text style={styles.emptyText}>
            書籍詳細ページから「カスタム本棚に追加」で本を追加できます。
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shelfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 16,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});
