import React, { useState } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import {
  useShelf,
  useShelfBooks,
  useRenameShelf,
  useDeleteShelf,
  useRemoveBookFromShelf,
} from '@/hooks/useShelves';
import { ShelfNameModal } from '@/components/shelf/ShelfNameModal';

export default function CustomShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: shelf, isLoading: shelfLoading } = useShelf(id ?? '');
  const { data: books, isLoading: booksLoading, isError, refetch } = useShelfBooks(id ?? '');
  const { mutateAsync: renameShelf, isPending: isRenaming } = useRenameShelf();
  const { mutate: deleteShelf } = useDeleteShelf();
  const { mutate: removeBook } = useRemoveBookFromShelf();

  const [renameModalVisible, setRenameModalVisible] = useState(false);

  const handleRename = async (name: string) => {
    if (!id) return;
    try {
      await renameShelf({ shelfId: id, name });
      setRenameModalVisible(false);
    } catch (error: any) {
      Alert.alert('エラー', '本棚名の変更に失敗しました: ' + error.message);
    }
  };

  const handleDeleteShelf = () => {
    if (!id) return;
    Alert.alert('本棚を削除', `「${shelf?.name}」を削除しますか？本棚内の本は削除されません。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          deleteShelf(id);
          router.back();
        },
      },
    ]);
  };

  const handleRemoveBook = (bookId: string, title: string) => {
    if (!id) return;
    Alert.alert('本棚から削除', `「${title}」をこの本棚から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => removeBook({ shelfId: id, bookId }) },
    ]);
  };

  const handleMenu = () => {
    Alert.alert(shelf?.name ?? '本棚', undefined, [
      { text: '名前を変更', onPress: () => setRenameModalVisible(true) },
      { text: '本棚を削除', style: 'destructive', onPress: handleDeleteShelf },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const isLoading = shelfLoading || booksLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: shelf?.name ?? '本棚',
          headerShown: true,
          headerBackTitle: '戻る',
          headerRight: () => (
            <TouchableOpacity onPress={handleMenu} style={styles.headerMenuButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.neutral[700]} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>本棚の取得に失敗しました</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={books ?? []}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookItem}
              onPress={() => router.push(`/book/${item.book_id}`)}
              onLongPress={() => handleRemoveBook(item.book_id, item.book.title)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: item.book.cover_image_url || 'https://via.placeholder.com/150x200.png?text=No+Cover',
                }}
                style={styles.bookCover}
              />
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.book.title}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>この本棚にはまだ本がありません</Text>
              <Text style={styles.emptyText}>
                書籍詳細ページから「カスタム本棚に追加」で本を追加できます。
              </Text>
            </View>
          }
        />
      )}

      <ShelfNameModal
        visible={renameModalVisible}
        initialName={shelf?.name}
        title="本棚名を変更"
        submitting={isRenaming}
        onSubmit={handleRename}
        onClose={() => setRenameModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  headerMenuButton: {
    padding: 4,
    marginRight: 4,
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
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
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
