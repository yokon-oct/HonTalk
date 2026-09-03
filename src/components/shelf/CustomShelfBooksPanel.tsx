import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useRemoveBookFromShelf, useShelfBooks } from '@/hooks/useShelves';

interface CustomShelfBooksPanelProps {
  shelfId: string;
  shelfName: string;
  editable?: boolean;
}

/**
 * カスタム本棚の書籍一覧（本棚タブの横スワイプページ用）
 */
export function CustomShelfBooksPanel({
  shelfId,
  shelfName,
  editable = false,
}: CustomShelfBooksPanelProps) {
  const router = useRouter();
  const { data: books, isLoading, isError, refetch } = useShelfBooks(shelfId);
  const { mutate: removeBook } = useRemoveBookFromShelf();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if ((books?.length ?? 0) === 0 && isEditing) {
      setIsEditing(false);
    }
  }, [books?.length, isEditing]);

  const handleRemoveBook = (bookId: string, title: string) => {
    Alert.alert('本棚から削除', `「${title}」をこの本棚から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () =>
          removeBook(
            { shelfId, bookId },
            {
              onError: (error) => {
                Alert.alert('エラー', '削除に失敗しました: ' + error.message);
              },
            },
          ),
      },
    ]);
  };

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

  const canEdit = editable && (books?.length ?? 0) > 0;

  return (
    <FlatList
      data={books ?? []}
      keyExtractor={(item) => item.id}
      numColumns={3}
      nestedScrollEnabled
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.shelfTitle} numberOfLines={1}>
            {shelfName}
          </Text>
          {canEdit && (
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
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.bookItem}
          onPress={() => {
            if (editable && isEditing) {
              handleRemoveBook(item.book_id, item.book.title);
              return;
            }
            router.push(`/book/${item.book_id}`);
          }}
          onLongPress={
            editable ? () => handleRemoveBook(item.book_id, item.book.title) : undefined
          }
          delayLongPress={400}
          activeOpacity={0.8}
        >
          <View style={styles.bookCoverWrap}>
            <Image
              source={{
                uri:
                  item.book.cover_image_url ||
                  'https://via.placeholder.com/150x200.png?text=No+Cover',
              }}
              style={styles.bookCover}
            />
            {editable && isEditing && (
              <View style={styles.deleteBadge}>
                <Ionicons name="remove-circle" size={22} color="#EF4444" />
              </View>
            )}
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  shelfTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  editButtonTextActive: {
    color: colors.primary[500],
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
