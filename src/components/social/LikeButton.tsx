import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsReviewLiked, useToggleLikeReview } from '@/hooks/useReviews';

interface LikeButtonProps {
  reviewId: string;
  initialLikeCount: number;
}

export function LikeButton({ reviewId, initialLikeCount }: LikeButtonProps) {
  const { data: serverIsLiked, isLoading: isChecking } = useIsReviewLiked(reviewId);
  const { mutate: toggleLike, isPending } = useToggleLikeReview();

  // ローカルステートで optimistic update
  const [localIsLiked, setLocalIsLiked] = useState<boolean | undefined>(undefined);
  const [localLikeCount, setLocalLikeCount] = useState<number>(initialLikeCount);
  
  // サーバーのいいね状態が取得できたら反映（最初のみ、または外部から変更があった場合）
  useEffect(() => {
    if (serverIsLiked !== undefined) {
      setLocalIsLiked(serverIsLiked);
    }
  }, [serverIsLiked]);

  // 親から渡される initialLikeCount が変わったら反映する
  useEffect(() => {
    setLocalLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  const displayCount = localIsLiked === undefined ? initialLikeCount : localLikeCount;
  const isLikedDisplay = localIsLiked === undefined ? false : localIsLiked;

  const handlePress = () => {
    if (isPending || isChecking || localIsLiked === undefined) return;
    
    // 楽観的更新
    const nextIsLiked = !localIsLiked;
    setLocalIsLiked(nextIsLiked);
    setLocalLikeCount(prev => Math.max(0, prev + (nextIsLiked ? 1 : -1)));

    // APIリクエスト
    toggleLike({ reviewId, isLiked: localIsLiked });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={isPending || isChecking}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isLikedDisplay ? 'heart' : 'heart-outline'}
        size={20}
        color={isLikedDisplay ? '#EF4444' : '#666666'}
      />
      <Text style={[styles.count, isLikedDisplay && styles.likedCount]}>
        {displayCount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  count: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666666',
  },
  likedCount: {
    color: '#EF4444',
  },
});
