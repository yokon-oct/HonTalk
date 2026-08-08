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
import { useMutedUsers, useUnmute } from '@/hooks/useMute';
import type { MutedUserInfo } from '@/services/muteService';

export default function MutedUsersScreen() {
  const router = useRouter();
  const { data: mutedUsers, isLoading, isError, refetch } = useMutedUsers();
  const { mutate: unmute, isPending: isUnmuting } = useUnmute();

  const handleUnmute = (user: MutedUserInfo) => {
    Alert.alert(
      'ミュートを解除',
      `${user.nickname}のミュートを解除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除する',
          onPress: () => unmute({ targetId: user.user_id }),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: MutedUserInfo }) => (
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
        style={[styles.unmuteButton, isUnmuting && styles.unmuteButtonDisabled]}
        onPress={() => handleUnmute(item)}
        disabled={isUnmuting}
      >
        <Text style={styles.unmuteText}>解除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'ミュートしたユーザー', headerBackTitle: '戻る' }} />
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
            data={mutedUsers}
            keyExtractor={(item) => item.mute_id}
            renderItem={renderItem}
            contentContainerStyle={
              mutedUsers && mutedUsers.length === 0
                ? styles.emptyContainer
                : styles.listContent
            }
            refreshing={false}
            onRefresh={refetch}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="volume-mute-outline" size={64} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>ミュートしているユーザーはいません</Text>
                <Text style={styles.emptyText}>
                  ユーザーをミュートすると、{'\n'}
                  タイムラインに投稿が表示されなくなります。{'\n'}
                  プロフィールは引き続き閲覧できます。
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
  unmuteButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[0],
  },
  unmuteButtonDisabled: {
    opacity: 0.5,
  },
  unmuteText: {
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
