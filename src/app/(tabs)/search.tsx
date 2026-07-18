import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSearchBooks } from '@/hooks/useBooks';
import { BookSearchResult } from '@/components/book/BookSearchResult';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 検索クエリのデバウンス（入力が終わってから500ms後に検索実行）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isError, error } = useSearchBooks(debouncedQuery);

  return (
    <View style={styles.container}>
      {/* 検索バー */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={colors.neutral[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="書籍名、著者名、ISBNで検索"
          placeholderTextColor={colors.neutral[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.iconButton}>
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/scanner')} style={styles.iconButton}>
            <Ionicons name="barcode-outline" size={22} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* 検索結果リスト */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>検索中...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            検索中にエラーが発生しました: {error instanceof Error ? error.message : String(error)}
          </Text>
        </View>
      ) : debouncedQuery.length > 0 ? (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BookSearchResult
              item={item}
              onPress={(selectedItem) => {
                // 書籍詳細画面に遷移する。必要ならクエリパラメータで初期情報を渡すことも可能
                router.push(`/book/${selectedItem.id}`);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>該当する書籍が見つかりませんでした</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="book-outline" size={64} color={colors.neutral[300]} />
          <Text style={styles.promptText}>読みたい本や探している本を検索しましょう</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.neutral[900],
  },
  iconButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.neutral[600],
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  emptyText: {
    color: colors.neutral[500],
    fontSize: 15,
  },
  promptText: {
    color: colors.neutral[500],
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
});
