import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import {
  useShelves,
  useCreateShelf,
  useRenameShelf,
  useDeleteShelf,
  useReorderShelves,
} from '@/hooks/useShelves';
import { ShelfPreviewCard, CreateShelfTile } from '@/components/shelf/ShelfPreviewCard';
import { ShelfNameModal } from '@/components/shelf/ShelfNameModal';
import type { ShelfWithPreview } from '@/services/shelfService';

type GridItem = { type: 'shelf'; shelf: ShelfWithPreview } | { type: 'create' };

/**
 * マイ本棚画面（ハンバーガーメニューから遷移）
 *
 * カスタム本棚の一覧・作成・名前変更・削除・並び替えを行う。
 */
export default function MyShelvesScreen() {
  const router = useRouter();
  const { data: shelves, isLoading, isError, refetch } = useShelves();
  const { mutateAsync: createShelf, isPending: isCreating } = useCreateShelf();
  const { mutateAsync: renameShelf, isPending: isRenaming } = useRenameShelf();
  const { mutate: deleteShelf } = useDeleteShelf();
  const { mutate: reorderShelves } = useReorderShelves();

  const [editing, setEditing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renamingShelf, setRenamingShelf] = useState<ShelfWithPreview | null>(null);

  const handleCreate = async (name: string) => {
    try {
      await createShelf(name);
      setCreateModalVisible(false);
    } catch (error: any) {
      Alert.alert('エラー', '本棚の作成に失敗しました: ' + error.message);
    }
  };

  const handleRename = async (name: string) => {
    if (!renamingShelf) return;
    try {
      await renameShelf({ shelfId: renamingShelf.id, name });
      setRenamingShelf(null);
    } catch (error: any) {
      Alert.alert('エラー', '本棚名の変更に失敗しました: ' + error.message);
    }
  };

  const handleDelete = (shelf: ShelfWithPreview) => {
    Alert.alert('本棚を削除', `「${shelf.name}」を削除しますか？本棚内の本は削除されません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteShelf(shelf.id) },
    ]);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (!shelves) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= shelves.length) return;

    const reordered = [...shelves];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    reorderShelves(reordered.map((shelf, i) => ({ id: shelf.id, sort_order: i })));
  };

  const gridData: GridItem[] = [
    ...(shelves ?? []).map((shelf) => ({ type: 'shelf' as const, shelf })),
    { type: 'create' as const },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'マイ本棚',
          headerShown: true,
          headerBackTitle: '戻る',
          headerRight: () =>
            shelves && shelves.length > 0 ? (
              <TouchableOpacity onPress={() => setEditing((prev) => !prev)}>
                <Text style={styles.editToggle}>{editing ? '完了' : '編集'}</Text>
              </TouchableOpacity>
            ) : null,
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
          data={gridData}
          keyExtractor={(item) => (item.type === 'shelf' ? item.shelf.id : 'create-tile')}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => {
            if (item.type === 'create') {
              return <CreateShelfTile onPress={() => setCreateModalVisible(true)} />;
            }
            return (
              <ShelfPreviewCard
                shelf={item.shelf}
                editing={editing}
                isFirst={index === 0}
                isLast={index === (shelves?.length ?? 1) - 1}
                onPress={() => router.push(`/shelf/custom/${item.shelf.id}`)}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
                onDelete={() => handleDelete(item.shelf)}
                onRename={() => setRenamingShelf(item.shelf)}
              />
            );
          }}
        />
      )}

      <ShelfNameModal
        visible={createModalVisible}
        title="新しい本棚を作成"
        submitting={isCreating}
        onSubmit={handleCreate}
        onClose={() => setCreateModalVisible(false)}
      />
      <ShelfNameModal
        visible={!!renamingShelf}
        initialName={renamingShelf?.name}
        title="本棚名を変更"
        submitting={isRenaming}
        onSubmit={handleRename}
        onClose={() => setRenamingShelf(null)}
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
  editToggle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[500],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 16,
  },
});
