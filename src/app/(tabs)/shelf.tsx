import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { colors } from '@/theme/colors';
import { useReadingRecords } from '@/hooks/useBooks';
import { useShelves } from '@/hooks/useShelves';
import { useAuthStore } from '@/stores/authStore';
import { CustomShelfBooksPanel } from '@/components/shelf/CustomShelfBooksPanel';
import { Database } from '@/types/database.types';

type ReadingStatus = Database['public']['Tables']['reading_records']['Row']['status'];
type FilterOption = ReadingStatus | 'all';

type ShelfPage =
  | { type: 'main'; id: 'main' }
  | { type: 'custom'; id: string; name: string };

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'すべて', value: 'all' },
  { label: '読了', value: 'finished' },
  { label: '読書中', value: 'reading' },
  { label: '読みたい', value: 'want_to_read' },
];

export default function ShelfTabScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width: pageWidth } = useWindowDimensions();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<FlatList<ShelfPage>>(null);

  const { data: records, isLoading, isError, refetch } = useReadingRecords(user?.id ?? '');
  const { data: customShelves } = useShelves();

  const filteredRecords =
    records?.filter((r) => filter === 'all' || r.status === filter) ?? [];

  const pages = useMemo<ShelfPage[]>(() => {
    const list: ShelfPage[] = [{ type: 'main', id: 'main' }];
    for (const shelf of customShelves ?? []) {
      list.push({ type: 'custom', id: shelf.id, name: shelf.name });
    }
    return list;
  }, [customShelves]);

  const hasCustomShelves = pages.length > 1;

  useEffect(() => {
    if (currentPage >= pages.length) {
      setCurrentPage(0);
      pagerRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [pages.length, currentPage]);

  useEffect(() => {
    const page = pages[currentPage];
    navigation.setOptions({
      title: page?.type === 'custom' ? page.name : '本棚',
    });
  }, [currentPage, pages, navigation]);

  const handlePageChange = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextPage = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setCurrentPage(nextPage);
    },
    [pageWidth],
  );

  const renderMainShelf = () => (
    <FlatList
      data={filteredRecords}
      keyExtractor={(item) => item.id}
      numColumns={3}
      nestedScrollEnabled
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      refreshing={false}
      onRefresh={refetch}
      ListHeaderComponent={
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
  );

  const renderPage = ({ item }: { item: ShelfPage }) => (
    <View style={[styles.page, { width: pageWidth }]}>
      {item.type === 'main' ? (
        renderMainShelf()
      ) : (
        <CustomShelfBooksPanel shelfId={item.id} shelfName={item.name} />
      )}
    </View>
  );

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
      <FlatList
        ref={pagerRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        data={pages}
        keyExtractor={(item) => item.id}
        renderItem={renderPage}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={hasCustomShelves}
        onMomentumScrollEnd={handlePageChange}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
      />

      {hasCustomShelves && (
        <View style={styles.pageIndicator} pointerEvents="none">
          {pages.map((page, index) => (
            <View
              key={page.id}
              style={[styles.dot, index === currentPage && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  page: {
    flex: 1,
  },
  pager: {
    flex: 1,
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
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.neutral[0],
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
  pageIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[300],
  },
  dotActive: {
    backgroundColor: colors.primary[500],
    width: 16,
  },
});
