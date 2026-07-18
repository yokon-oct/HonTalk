import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useBookPageData, useUpsertReadingRecord } from '@/hooks/useBooks';
import { BookCover } from '@/components/book/BookCover';
import { useReviewsByBook } from '@/hooks/useReviews';
import { ReviewCard } from '@/components/review/ReviewCard';

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: pageData, isLoading, isError } = useBookPageData(id || '');
  const book = pageData?.book;
  const readingRecord = pageData?.readingRecord;
  
  // 読書ステータスを取得・更新するためのフック
  const { mutateAsync: upsertRecord, isPending: isUpdatingStatus } = useUpsertReadingRecord();

  // レビュー一覧を取得するためのフック
  const { data: reviews, isLoading: reviewsLoading } = useReviewsByBook(id || '');

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>書籍情報を読み込み中...</Text>
      </View>
    );
  }

  if (isError || !book) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
        <Text style={styles.errorText}>書籍情報の取得に失敗しました</Text>
      </View>
    );
  }

  const { volumeInfo } = book;
  const coverUrl = volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || undefined;
  const author = volumeInfo.authors?.join(', ') || '著者不明';
  const publishedDate = volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : '';
  const currentStatus = readingRecord?.status;

  const handleStatusChange = async (status: 'want_to_read' | 'reading' | 'finished') => {
    try {
      await upsertRecord({ book, status });
    } catch (error: any) {
      Alert.alert('エラー', 'ステータスの更新に失敗しました: ' + error.message);
    }
  };

  const handleWriteReview = () => {
    router.push({
      pathname: '/review/create',
      params: {
        bookId: book.id,
        title: volumeInfo.title,
        author: author,
        coverUrl: coverUrl || '',
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* メイン書籍情報 */}
      <View style={styles.mainInfo}>
        <BookCover url={coverUrl} width={100} height={140} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{volumeInfo.title}</Text>
          <Text style={styles.author}>{author}</Text>
          <Text style={styles.metaText}>
            {volumeInfo.publisher || '出版社不明'} 
            {publishedDate ? ` • ${publishedDate}年` : ''}
          </Text>
        </View>
      </View>

      {/* 読書ステータス変更アクション */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>本棚に追加</Text>
        <View style={styles.statusButtons}>
          <TouchableOpacity 
            style={[styles.statusButton, currentStatus === 'want_to_read' && styles.activeStatus]}
            onPress={() => handleStatusChange('want_to_read')}
            disabled={isUpdatingStatus}
          >
            <Text style={[styles.statusButtonText, currentStatus === 'want_to_read' && styles.activeStatusText]}>読みたい</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statusButton, currentStatus === 'reading' && styles.activeStatus]}
            onPress={() => handleStatusChange('reading')}
            disabled={isUpdatingStatus}
          >
            <Text style={[styles.statusButtonText, currentStatus === 'reading' && styles.activeStatusText]}>読書中</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statusButton, currentStatus === 'finished' && styles.activeStatus]}
            onPress={() => handleStatusChange('finished')}
            disabled={isUpdatingStatus}
          >
            <Text style={[styles.statusButtonText, currentStatus === 'finished' && styles.activeStatusText]}>読了</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 詳細説明 */}
      <View style={styles.descriptionSection}>
        <Text style={styles.sectionTitle}>作品紹介</Text>
        <Text style={styles.descriptionText}>
          {volumeInfo.description || '作品紹介はありません。'}
        </Text>
      </View>

      {/* レビュー書くボタン */}
      <TouchableOpacity 
        style={styles.reviewButton}
        onPress={handleWriteReview}
      >
        <Ionicons name="create-outline" size={20} color="#ffffff" />
        <Text style={styles.reviewButtonText}>この本のレビューを書く</Text>
      </TouchableOpacity>

      {/* レビュー一覧 */}
      <View style={styles.reviewsSection}>
        <Text style={styles.sectionTitle}>みんなのレビュー</Text>
        {reviewsLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginTop: 20 }} />
        ) : reviews && reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onPressUser={(userId) => router.push(`/user/${userId}`)}
                onPress={(r) => router.push(`/review/${r.id}`)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.noReviewsText}>まだレビューがありません。</Text>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: colors.neutral[50],
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.neutral[500],
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: colors.neutral[500],
    fontSize: 16,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  mainInfo: {
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 6,
  },
  author: {
    fontSize: 16,
    color: colors.neutral[600],
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: colors.neutral[400],
  },
  statusSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
  },
  statusButtonText: {
    fontSize: 14,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  activeStatus: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  activeStatusText: {
    color: colors.primary[600],
  },
  descriptionSection: {
    gap: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 22,
  },
  reviewButton: {
    backgroundColor: colors.primary[500],
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsSection: {
    marginTop: 8,
    gap: 12,
  },
  reviewsList: {
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: 24,
  },
});
