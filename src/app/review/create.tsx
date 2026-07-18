import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { ReviewForm, ReviewFormData } from '@/components/review/ReviewForm';
import { useCreateReview } from '@/hooks/useReviews';

import { ensureBookExists } from '@/services/bookService';

export default function CreateReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId?: string; title?: string; author?: string; coverUrl?: string }>();
  const { mutateAsync: createReviewAsync, isPending } = useCreateReview();

  // 本の情報がない場合はフリーポスト（自由な投稿）として扱う
  const bookTitle = params.title;
  const bookAuthor = params.author;
  const bookId = params.bookId;
  const bookCoverUrl = params.coverUrl;

  const [postType, setPostType] = useState<'free' | 'book'>(bookId ? 'book' : 'free');
  const isFreePost = postType === 'free';

  const handleSubmit = async (data: ReviewFormData) => {
    try {
      let finalBookId: string | null = null;

      if (!isFreePost) {
        if (!bookId) {
          Alert.alert('エラー', 'レビューする本を選択してください');
          return;
        }
        // 1. まず書籍が public.books に存在することを確認（なければ登録）
        const dbBook = await ensureBookExists({
          google_books_id: bookId!,
          title: bookTitle || 'タイトル不明',
          author: bookAuthor || '著者不明',
          cover_image_url: bookCoverUrl,
        });
        finalBookId = dbBook.id;
      }

      // 2. 実際の UUID を使ってレビュー（または投稿）を作成
      await createReviewAsync({
        book_id: finalBookId,
        content: data.content,
        has_spoiler: data.hasSpoiler,
        is_public: data.isPublic,
      });

      Alert.alert('投稿完了', isFreePost ? '投稿しました' : 'レビューを投稿しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Review submission error:', err);
      Alert.alert('エラー', '投稿に失敗しました。\n(開発中: 認証が必要です)');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 投稿タイプの切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, isFreePost && styles.activeTab]} 
          onPress={() => setPostType('free')}
        >
          <Text style={[styles.tabText, isFreePost && styles.activeTabText]}>フリーポスト</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, !isFreePost && styles.activeTab]} 
          onPress={() => setPostType('book')}
        >
          <Text style={[styles.tabText, !isFreePost && styles.activeTabText]}>本のレビュー</Text>
        </TouchableOpacity>
      </View>

      {/* 書籍ヘッダー（フリーポスト時は非表示） */}
      {!isFreePost && bookId && (
        <View style={styles.bookHeader}>
          <Text style={styles.headerLabel}>レビューを書く本</Text>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{bookTitle}</Text>
            <Text style={styles.bookAuthor}>{bookAuthor}</Text>
          </View>
        </View>
      )}

      {/* 本が選択されていない場合 */}
      {!isFreePost && !bookId && (
        <View style={styles.selectBookContainer}>
          <Text style={styles.selectBookText}>レビューする本を選択してください</Text>
          <TouchableOpacity 
            style={styles.selectBookButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={20} color={colors.primary[600]} />
            <Text style={styles.selectBookButtonText}>本を探す</Text>
          </TouchableOpacity>
        </View>
      )}

      <ReviewForm 
        onSubmit={handleSubmit} 
        isSubmitting={isPending} 
        submitLabel={isFreePost ? "投稿する" : "レビューを投稿する"}
        isFreePost={isFreePost}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    paddingBottom: 40,
  },
  bookHeader: {
    backgroundColor: colors.neutral[0],
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
    fontWeight: 'bold',
  },
  bookInfo: {
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.neutral[0],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  activeTabText: {
    color: colors.neutral[900],
  },
  selectBookContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  selectBookText: {
    fontSize: 14,
    color: colors.neutral[600],
    marginBottom: 12,
  },
  selectBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  selectBookButtonText: {
    color: colors.primary[600],
    fontSize: 15,
    fontWeight: 'bold',
  },
});
