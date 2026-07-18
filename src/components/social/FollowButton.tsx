import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useIsFollowing, useToggleFollow } from '@/hooks/useFollow';
import { useAuthStore } from '@/stores/authStore';

interface FollowButtonProps {
  targetUserId: string;
}

export function FollowButton({ targetUserId }: FollowButtonProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: isFollowing, isLoading: isChecking } = useIsFollowing(targetUserId);
  const { mutate: toggleFollow, isPending } = useToggleFollow();

  // 自分自身へのフォローボタンは表示しない
  if (currentUserId === targetUserId) {
    return null;
  }

  const handlePress = () => {
    if (isPending || isChecking) return;
    toggleFollow({ targetId: targetUserId, isFollowing: !!isFollowing });
  };

  if (isChecking) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color="#999" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing ? styles.followingButton : styles.notFollowingButton
      ]}
      onPress={handlePress}
      disabled={isPending}
      activeOpacity={0.8}
    >
      {isPending ? (
        <ActivityIndicator size="small" color={isFollowing ? '#333' : '#FFF'} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFollowing ? styles.followingText : styles.notFollowingText
          ]}
        >
          {isFollowing ? 'フォロー中' : 'フォローする'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  loadingButton: {
    backgroundColor: '#F3F4F6',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notFollowingButton: {
    backgroundColor: '#000000',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  followingText: {
    color: '#374151',
  },
  notFollowingText: {
    color: '#FFFFFF',
  },
});
