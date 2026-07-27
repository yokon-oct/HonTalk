import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useShelves, useShelvesForBook, useCreateShelf, useUpdateBookShelves } from '@/hooks/useShelves';
import { ShelfNameModal } from './ShelfNameModal';
import type { GoogleBookItem } from '@/services/bookService';

interface AddToShelfModalProps {
  visible: boolean;
  book: GoogleBookItem;
  dbBookId?: string | null;
  onClose: () => void;
}

/**
 * 書籍を複数のカスタム本棚に追加/削除するためのモーダル
 */
export function AddToShelfModal({ visible, book, dbBookId, onClose }: AddToShelfModalProps) {
  const { data: shelves, isLoading: shelvesLoading } = useShelves();
  const { data: currentShelfIds, isLoading: membershipLoading } = useShelvesForBook(dbBookId);
  const { mutateAsync: createShelf, isPending: isCreating } = useCreateShelf();
  const { mutateAsync: updateBookShelves, isPending: isSaving } = useUpdateBookShelves();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set(currentShelfIds ?? []));
    }
  }, [visible, currentShelfIds]);

  const toggleShelf = (shelfId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shelfId)) {
        next.delete(shelfId);
      } else {
        next.add(shelfId);
      }
      return next;
    });
  };

  const handleCreateShelf = async (name: string) => {
    try {
      const newShelf = await createShelf(name);
      setSelectedIds((prev) => new Set(prev).add(newShelf.id));
      setCreateModalVisible(false);
    } catch (error: any) {
      Alert.alert('エラー', '本棚の作成に失敗しました: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      await updateBookShelves({ book, shelfIds: Array.from(selectedIds) });
      onClose();
    } catch (error: any) {
      Alert.alert('エラー', '本棚への追加に失敗しました: ' + error.message);
    }
  };

  const isLoading = shelvesLoading || membershipLoading;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.overlayPressable} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>本棚を選択</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loading} />
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {shelves && shelves.length > 0 ? (
                  shelves.map((shelf) => {
                    const isSelected = selectedIds.has(shelf.id);
                    return (
                      <TouchableOpacity
                        key={shelf.id}
                        style={styles.shelfRow}
                        onPress={() => toggleShelf(shelf.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.shelfInfo}>
                          <Text style={styles.shelfName}>{shelf.name}</Text>
                          <Text style={styles.shelfCount}>{shelf.bookCount}冊</Text>
                        </View>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? colors.primary[500] : colors.neutral[300]}
                        />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyText}>まだ本棚がありません。新しく作成しましょう。</Text>
                )}

                <TouchableOpacity
                  style={styles.createRow}
                  onPress={() => setCreateModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary[500]} />
                  <Text style={styles.createText}>新しい本棚を作成</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving || isLoading}
            >
              <Text style={styles.saveButtonText}>{isSaving ? '保存中...' : '保存する'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ShelfNameModal
        visible={createModalVisible}
        title="新しい本棚を作成"
        submitting={isCreating}
        onSubmit={handleCreateShelf}
        onClose={() => setCreateModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  loading: {
    paddingVertical: 32,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingBottom: 4,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  shelfInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  shelfName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  shelfCount: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  emptyText: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: 20,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  createText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  saveButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
