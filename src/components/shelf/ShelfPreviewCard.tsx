import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { BookCover } from '../book/BookCover';
import type { ShelfWithPreview } from '@/services/shelfService';

interface ShelfPreviewCardProps {
  shelf: ShelfWithPreview;
  editing?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

const COVER_SIZE = { width: 34, height: 50 };

export function ShelfPreviewCard({
  shelf,
  editing = false,
  isFirst = false,
  isLast = false,
  onPress,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
}: ShelfPreviewCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={editing}
    >
      {editing && (
        <>
          <TouchableOpacity style={styles.renameBadge} onPress={onRename} activeOpacity={0.7}>
            <Ionicons name="pencil" size={11} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBadge} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="close" size={12} color="#ffffff" />
          </TouchableOpacity>
        </>
      )}

      <View style={styles.coversRow}>
        {shelf.previewCovers.length > 0 ? (
          shelf.previewCovers.slice(0, 3).map((url, index) => (
            <BookCover
              key={`${shelf.id}-${index}`}
              url={url}
              width={COVER_SIZE.width}
              height={COVER_SIZE.height}
              style={[styles.cover, index > 0 && styles.coverOverlap]}
            />
          ))
        ) : (
          <View style={[styles.cover, styles.emptyCover]}>
            <Ionicons name="library-outline" size={20} color={colors.neutral[300]} />
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {shelf.name}
      </Text>
      <Text style={styles.count}>{shelf.bookCount}冊</Text>

      {editing && (
        <View style={styles.reorderRow}>
          <TouchableOpacity
            style={[styles.reorderButton, isFirst && styles.reorderButtonDisabled]}
            onPress={onMoveUp}
            disabled={isFirst}
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={isFirst ? colors.neutral[300] : colors.neutral[600]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reorderButton, isLast && styles.reorderButtonDisabled]}
            onPress={onMoveDown}
            disabled={isLast}
          >
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isLast ? colors.neutral[300] : colors.neutral[600]}
            />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CreateShelfTile({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.container, styles.createTile]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="add" size={28} color={colors.primary[400]} />
      <Text style={styles.createText}>本棚を作成</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 108,
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  renameBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[400],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coversRow: {
    flexDirection: 'row',
    height: COVER_SIZE.height,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    borderRadius: 4,
  },
  coverOverlap: {
    marginLeft: -14,
  },
  emptyCover: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  count: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  reorderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reorderButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.5,
  },
  createTile: {
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary[100],
    borderStyle: 'dashed',
    minHeight: 118,
  },
  createText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[500],
    textAlign: 'center',
  },
});
