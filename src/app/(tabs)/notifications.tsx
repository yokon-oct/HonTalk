import React, { useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

import { colors } from '@/theme/colors';
import { useNotifications, useMarkAllAsRead } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: notifications, isLoading, refetch } = useNotifications();
  const { mutate: markAllAsRead } = useMarkAllAsRead();

  // 画面を開いた時に未読を既読にする
  useEffect(() => {
    if (currentUserId) {
      markAllAsRead();
    }
  }, [currentUserId, markAllAsRead]);

  const handleNotificationPress = (notification: any) => {
    if (notification.type === 'follow') {
      router.push(`/user/${notification.actor_id}`);
    } else if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.reference_id) {
        router.push(`/review/${notification.reference_id}`);
      }
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={16} color={colors.error} />;
      case 'comment':
        return <Ionicons name="chatbubble" size={16} color={colors.primary[500]} />;
      case 'follow':
        return <Ionicons name="person-add" size={16} color="#10B981" />; // success color
      default:
        return <Ionicons name="notifications" size={16} color={colors.neutral[500]} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !item.is_read;
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ja });

    return (
      <TouchableOpacity 
        style={[styles.notificationItem, isUnread && styles.unreadItem]} 
        onPress={() => handleNotificationPress(item)}
      >
        <TouchableOpacity onPress={() => router.push(`/user/${item.actor_id}`)}>
          {item.actor?.avatar_url ? (
            <Image source={{ uri: item.actor.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={colors.neutral[400]} />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.contentContainer}>
          <View style={styles.messageRow}>
            <Text style={styles.actorName}>{item.actor?.nickname || 'ユーザー'}</Text>
            <Text style={styles.messageText}>{item.type === 'follow' ? 'があなたをフォローしました' : `さんが${item.message}`}</Text>
          </View>
          <View style={styles.timeRow}>
            {renderIcon(item.type)}
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>
        
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (!currentUserId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>ログインしてください</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>通知</Text>
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>通知はありません</Text>
            </View>
          }
        />
      )}
    </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[900],
    paddingHorizontal: 16,
    paddingTop: 60, // SafeArea roughly
    paddingBottom: 16,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF', // 薄い青系
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    alignItems: 'baseline',
  },
  actorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  messageText: {
    fontSize: 15,
    color: colors.neutral[700],
    marginLeft: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginLeft: 8,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.neutral[500],
  },
});
