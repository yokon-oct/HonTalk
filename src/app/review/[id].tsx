import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useReviewDetail, useReviewComments, useCreateComment, useDeleteComment } from '@/hooks/useReviews';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LikeButton } from '@/components/social/LikeButton';
import { SpoilerGuard } from '@/components/review/SpoilerGuard';
import { useAuthStore } from '@/stores/authStore';

export default function ReviewDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');

  const { data: review, isLoading: isReviewLoading, isError: isReviewError } = useReviewDetail(id as string);
  const { data: comments, isLoading: isCommentsLoading } = useReviewComments(id as string);
  const { mutate: createComment, isPending: isCreatingComment } = useCreateComment();
  const { mutate: deleteComment, isPending: isDeletingComment } = useDeleteComment();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const handleSendComment = () => {
    if (!commentText.trim() || isCreatingComment) return;
    createComment(
      { review_id: id as string, content: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText('');
        }
      }
    );
  };

  if (isReviewLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (isReviewError || !review) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>レビューの取得に失敗しました</Text>
      </View>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ja });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* ユーザー情報 */}
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={() => router.push(`/user/${review.user.id}`)}>
            {review.user.avatar_url ? (
              <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.userText}>
            <TouchableOpacity onPress={() => router.push(`/user/${review.user.id}`)}>
              <Text style={styles.userName}>{review.user.nickname}</Text>
            </TouchableOpacity>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>

        {/* 対象書籍 (フリーポストの場合は非表示) */}
        {review.book && (
          <TouchableOpacity 
            style={styles.bookContainer}
            onPress={() => router.push(`/book/${review.book!.id}`)}
          >
            {review.book.cover_image_url ? (
              <Image source={{ uri: review.book.cover_image_url }} style={styles.bookCover} />
            ) : (
              <View style={[styles.bookCover, styles.avatarPlaceholder]} />
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{review.book.title}</Text>
              <Text style={styles.bookAuthor}>{review.book.author}</Text>
              {review.reading_record?.rating && (
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.reading_record!.rating! ? 'star' : 'star-outline'}
                      size={16}
                      color={colors.star}
                    />
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* レビュー本文 */}
        <SpoilerGuard hasSpoiler={review.has_spoiler}>
          <Text style={styles.reviewText}>{review.content}</Text>
        </SpoilerGuard>

        {/* いいね */}
        <View style={styles.statsRow}>
          <LikeButton reviewId={review.id} initialLikeCount={review.like_count} />
        </View>

        {/* コメントセクション */}
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>コメント ({review.comment_count})</Text>
          
          {isCommentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : comments && comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  {comment.user.avatar_url ? (
                    <Image source={{ uri: comment.user.avatar_url }} style={styles.commentAvatar} />
                  ) : (
                    <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={14} color="#999" />
                    </View>
                  )}
                  <View style={styles.commentInfo}>
                    <View style={styles.commentHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={styles.commentUser}>{comment.user.nickname}</Text>
                        <Text style={styles.commentTime}>
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ja })}
                        </Text>
                      </View>
                      {currentUserId === comment.user.id && (
                        <TouchableOpacity 
                          onPress={() => deleteComment({ commentId: comment.id, reviewId: id as string })}
                          disabled={isDeletingComment}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noComments}>コメントはまだありません。</Text>
          )}
        </View>
      </ScrollView>

      {/* コメント入力エリア */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="コメントを入力..."
          placeholderTextColor={colors.neutral[400]}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!commentText.trim() || isCreatingComment) && styles.sendButtonDisabled]} 
          onPress={handleSendComment}
          disabled={!commentText.trim() || isCreatingComment}
        >
          {isCreatingComment ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  timeText: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  bookContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: 20,
  },
  bookCover: {
    width: 60,
    height: 84,
    borderRadius: 6,
  },
  bookInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.neutral[600],
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 16,
    color: colors.neutral[800],
    lineHeight: 24,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
    paddingVertical: 12,
    marginBottom: 20,
  },
  commentSection: {
    gap: 12,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  commentsList: {
    gap: 16,
  },
  commentCard: {
    flexDirection: 'row',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInfo: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  commentTime: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  commentText: {
    fontSize: 14,
    color: colors.neutral[800],
    lineHeight: 20,
  },
  noComments: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: 20,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    color: colors.neutral[900],
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
});
