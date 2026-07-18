import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SpoilerGuard } from './SpoilerGuard';
import { LikeButton } from '../social/LikeButton';
import { FollowButton } from '../social/FollowButton';
import type { ReviewWithDetails } from '@/services/reviewService';
import { BookCover } from '../book/BookCover';

interface ReviewCardProps {
  review: ReviewWithDetails;
  showBookInfo?: boolean;
  onPress?: (review: ReviewWithDetails) => void;
  onPressUser?: (userId: string) => void;
  onPressBook?: (bookId: string) => void;
  onPressComment?: (reviewId: string) => void;
}

export function ReviewCard({ 
  review, 
  showBookInfo = false, 
  onPress,
  onPressUser,
  onPressBook,
  onPressComment,
}: ReviewCardProps) {
  // 子ボタンのタッチが親の onPress に伝播しないようにする
  const stopPropagation = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };
  
  // 日付のフォーマット (例: 3時間前)
  const timeAgo = formatDistanceToNow(new Date(review.created_at), { 
    addSuffix: true,
    locale: ja 
  });

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(review)}
      activeOpacity={0.8}
    >
      {/* ユーザー情報と投稿時間 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo} 
          onPress={() => onPressUser?.(review.user.id)}
        >
          {review.user.avatar_url ? (
            <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#999" />
            </View>
          )}
          <Text style={styles.nickname}>{review.user.nickname}</Text>
        </TouchableOpacity>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      {/* 評価 (星) */}
      {review.reading_record?.rating && (
        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons 
              key={i} 
              name={i < (review.reading_record?.rating || 0) ? 'star' : 'star-outline'} 
              size={16} 
              color="#F59E0B" 
            />
          ))}
        </View>
      )}

      {/* 本の情報 (オプション: タイムライン等で表示) */}
      {showBookInfo && review.book && (
        <TouchableOpacity 
          style={styles.bookInfo}
          onPress={() => onPressBook?.(review.book!.id)}
        >
          <BookCover url={review.book.cover_image_url} width={40} height={60} />
          <View style={styles.bookDetails}>
            <Text style={styles.bookTitle} numberOfLines={2}>{review.book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{review.book.author}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* レビュー本文 (ネタバレガード付き) */}
      <SpoilerGuard hasSpoiler={review.has_spoiler}>
        <Text style={styles.content}>{review.content}</Text>
      </SpoilerGuard>

      {/* アクション (いいね、コメント、フォロー) */}
      <View style={styles.actions}>
        <View style={styles.interactionButtons}>
          {/* いいねボタン: 親への伝播を止める */}
          <Pressable onPress={stopPropagation}>
            <LikeButton reviewId={review.id} initialLikeCount={review.like_count} />
          </Pressable>
          {/* コメントボタン: レビュー詳細へ遷移 */}
          <TouchableOpacity
            style={styles.commentAction}
            onPress={(e) => { e.stopPropagation(); onPressComment?.(review.id); }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionCount}>{review.comment_count}</Text>
          </TouchableOpacity>
        </View>
        {/* フォローボタン: 親への伝播を止める */}
        <Pressable onPress={stopPropagation}>
          <FollowButton targetUserId={review.user.id} />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nickname: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  timeAgo: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookInfo: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  bookDetails: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
  },
  actionCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666666',
  },
});
