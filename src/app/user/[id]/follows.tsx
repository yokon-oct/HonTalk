import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

import { useFollowers, useFollowing, useToggleFollow, useIsFollowing } from '@/hooks/useFollow';
import { useAuthStore } from '@/stores/authStore';
import type { FollowUser } from '@/services/followService';

type TabType = 'following' | 'followers';

export default function FollowsScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: TabType }>();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>(tab || 'following');
  const currentUserId = useAuthStore((state) => state.user?.id);

  const { data: following, isLoading: followingLoading } = useFollowing(id);
  const { data: followers, isLoading: followersLoading } = useFollowers(id);

  // 初回レンダリング時のみ、URLパラメータからタブを設定
  useEffect(() => {
    if (tab && (tab === 'following' || tab === 'followers')) {
      setActiveTab(tab);
    }
  }, [tab]);

  const renderTab = (type: TabType, label: string) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => setActiveTab(type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }: { item: FollowUser }) => {
    return <UserListItem user={item} currentUserId={currentUserId} />;
  };

  const currentData = activeTab === 'following' ? following : followers;
  const isLoading = activeTab === 'following' ? followingLoading : followersLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: activeTab === 'following' ? 'フォロー' : 'フォロワー',
          headerBackTitle: '戻る' 
        }} 
      />

      <View style={styles.tabContainer}>
        {renderTab('following', 'フォロー')}
        {renderTab('followers', 'フォロワー')}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>
                {activeTab === 'following' 
                  ? 'フォローしているユーザーがいません' 
                  : 'フォロワーがいません'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function UserListItem({ user, currentUserId }: { user: FollowUser; currentUserId?: string }) {
  const router = useRouter();
  const isSelf = currentUserId === user.id;

  const { data: isFollowing, isLoading: followCheckLoading } = useIsFollowing(user.id);
  const { mutate: toggleFollow, isPending: followPending } = useToggleFollow();

  const handleToggleFollow = () => {
    if (followPending) return;
    toggleFollow({ targetId: user.id, isFollowing: !!isFollowing });
  };

  const handlePress = () => {
    // 自分の場合はマイページへ、他人の場合はユーザープロフィールへ
    if (isSelf) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/user/${user.id}`);
    }
  };

  return (
    <TouchableOpacity style={styles.userItem} onPress={handlePress}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color={colors.neutral[400]} />
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{user.nickname}</Text>
        {user.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>{user.bio}</Text>
        ) : null}
      </View>

      {!isSelf && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingActiveButton]}
          onPress={handleToggleFollow}
          disabled={followPending || followCheckLoading}
        >
          {followPending || followCheckLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.neutral[700] : '#ffffff'} />
          ) : (
            <Text style={[styles.followButtonText, isFollowing && styles.followingActiveText]}>
              {isFollowing ? 'フォロー中' : 'フォロー'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...typography.preset.body,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary[600],
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  userName: {
    ...typography.preset.body,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  userBio: {
    ...typography.preset.caption,
    color: colors.neutral[600],
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    minWidth: 80,
    alignItems: 'center',
  },
  followingActiveButton: {
    backgroundColor: colors.neutral[200],
  },
  followButtonText: {
    ...typography.preset.caption,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  followingActiveText: {
    color: colors.neutral[700],
  },
  emptyContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    ...typography.preset.body,
    color: colors.neutral[500],
  },
});
