import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useBlockedUsers, useUnblock } from '@/hooks/useBlock';
import type { BlockedUserInfo } from '@/services/blockService';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { data: blockedUsers, isLoading, isError, refetch } = useBlockedUsers();
  const { mutate: unblock, isPending: isUnblocking } = useUnblock();

  const handleUnblock = (user: BlockedUserInfo) => {
    Alert.alert(
      'ブロックを解除',
      `${user.nickname}のブロックを解除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除する',
          onPress: () => unblock({ targetId: user.user_id }),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BlockedUserInfo }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/user/${item.user_id}`)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={22} color={colors.neutral[400]} />
          </View>
        )}
        <View style={styles.userText}>
          <Text style={styles.nickname}>{item.nickname}</Text>
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
        onPress={() => handleUnblock(item)}
        disabled={isUnblocking}
      >
        <Text style={styles.unblockText}>解除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'ブロックしたユーザー', headerBackTitle: '戻る' }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.errorText}>読み込みに失敗しました</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>再試行</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.block_id}
            renderItem={renderItem}
            contentContainerStyle={
              blockedUsers && blockedUsers.length === 0
                ? styles.emptyContainer
                : styles.listContent
            }
            refreshing={false}
            onRefresh={refetch}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={64} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>ブロックしているユーザーはいません</Text>
                <Text style={styles.emptyText}>
                  問題のあるユーザーをブロックすると、{'\n'}
                  タイムラインに投稿が表示されなくなります。
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    flex: 1,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[0],
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 16 + 48 + 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[700],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
});
