import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

import { colors } from '@/theme/colors';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import type { NotificationWithActor } from '@/services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading, isError, refetch, isFetching } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead();

  const handleNotificationPress = (notification: NotificationWithActor) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.reference_type === 'review' && notification.reference_id) {
      router.push(`/review/${notification.reference_id}`);
    } else if (notification.type === 'follow' && notification.actor_id) {
      router.push(`/user/${notification.actor_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Ionicons name="heart" size={20} color={colors.error} />;
      case 'comment': return <Ionicons name="chatbubble" size={20} color={colors.primary[500]} />;
      case 'follow': return <Ionicons name="person-add" size={20} color={colors.secondary[500]} />;
      default: return <Ionicons name="notifications" size={20} color={colors.neutral[500]} />;
    }
  };

  const getNotificationText = (notification: NotificationWithActor) => {
    const actorName = notification.actor?.nickname || '誰か';
    switch (notification.type) {
      case 'like': return `${actorName}さんがあなたの投稿にいいねしました`;
      case 'comment': return `${actorName}さんがあなたの投稿にコメントしました`;
      case 'follow': return `${actorName}さんがあなたをフォローしました`;
      case 'system': return notification.message || 'システムからのお知らせがあります';
      default: return notification.message || '新しい通知があります';
    }
  };

  const renderItem = ({ item }: { item: NotificationWithActor }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.actor ? (
          <Image 
            source={item.actor.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            {getNotificationIcon(item.type)}
          </View>
        )}
        <View style={styles.typeIconBadge}>
          {getNotificationIcon(item.type)}
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.messageText, !item.is_read && styles.unreadText]}>
          {getNotificationText(item)}
        </Text>
        <Text style={styles.timeText}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ja })}
        </Text>
      </View>
      
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '通知', 
          headerShown: true, 
          headerBackTitle: '戻る',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => markAllAsRead()} 
              disabled={isMarkingAll || !notifications?.some(n => !n.is_read)}
            >
              <Text style={[
                styles.markAllReadText, 
                (!notifications?.some(n => !n.is_read) || isMarkingAll) && styles.disabledText
              ]}>
                すべて既読
              </Text>
            </TouchableOpacity>
          )
        }} 
      />

      {isLoading && !isFetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>通知の取得に失敗しました</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isFetching}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.neutral[300]} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>新しい通知はありません</Text>
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
    padding: 20,
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  unreadItem: {
    backgroundColor: colors.primary[50],
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  typeIconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[0],
  },
  contentContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    color: colors.neutral[800],
    lineHeight: 20,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
    color: colors.neutral[900],
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
    marginLeft: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  emptyText: {
    color: colors.neutral[500],
    fontSize: 15,
  },
  markAllReadText: {
    color: colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: colors.neutral[400],
  },
});
