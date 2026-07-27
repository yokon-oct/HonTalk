import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { ReviewCard } from '../review/ReviewCard';
import { RankBadge } from './RankBadge';
import type { ReviewRankingItem } from '@/services/rankingService';
import type { ReviewWithDetails } from '@/services/reviewService';

interface RankingReviewCardProps {
  item: ReviewRankingItem;
  rank: number;
  onPress?: (review: ReviewWithDetails) => void;
  onPressUser?: (userId: string) => void;
  onPressBook?: (bookId: string) => void;
  onPressComment?: (reviewId: string) => void;
}

/** ランキングRPCのフラットな結果を ReviewCard が要求する構造にマッピングする */
function toReviewWithDetails(item: ReviewRankingItem): ReviewWithDetails {
  return {
    id: item.review_id,
    user_id: item.user_id,
    book_id: item.book_id,
    reading_record_id: null,
    content: item.content,
    is_public: true,
    has_spoiler: item.has_spoiler,
    like_count: item.like_count,
    comment_count: item.comment_count,
    created_at: item.created_at,
    updated_at: item.created_at,
    user: {
      id: item.user_id,
      nickname: item.user_nickname,
      avatar_url: item.user_avatar_url,
    },
    book: item.book_id
      ? {
          id: item.book_id,
          title: item.book_title ?? '',
          author: item.book_author ?? '',
          cover_image_url: item.book_cover_url,
        }
      : null,
    reading_record: item.rating !== null ? { rating: item.rating } : null,
  };
}

export function RankingReviewCard({
  item,
  rank,
  onPress,
  onPressUser,
  onPressBook,
  onPressComment,
}: RankingReviewCardProps) {
  const review = toReviewWithDetails(item);

  return (
    <View style={styles.container}>
      <View style={styles.badgeWrapper}>
        <RankBadge rank={rank} size={28} />
      </View>
      <View style={styles.cardWrapper}>
        <ReviewCard
          review={review}
          showBookInfo
          onPress={onPress}
          onPressUser={onPressUser}
          onPressBook={onPressBook}
          onPressComment={onPressComment}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeWrapper: {
    paddingTop: 4,
  },
  cardWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
