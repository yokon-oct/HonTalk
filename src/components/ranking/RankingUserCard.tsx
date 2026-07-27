import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { RankBadge } from './RankBadge';
import { FollowButton } from '../social/FollowButton';
import type { UserRankingItem } from '@/services/rankingService';

interface RankingUserCardProps {
  item: UserRankingItem;
  rank: number;
  onPress?: (userId: string) => void;
}

export function RankingUserCard({ item, rank, onPress }: RankingUserCardProps) {
  const stopPropagation = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item.user_id)}
      activeOpacity={0.8}
    >
      <RankBadge rank={rank} />

      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color="#999" />
        </View>
      )}

      <View style={styles.details}>
        <Text style={styles.nickname} numberOfLines={1}>{item.nickname}</Text>
        {!!item.bio && (
          <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
        )}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="person-add-outline" size={13} color={colors.neutral[500]} />
            <Text style={styles.metricText}>+{item.new_followers}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.neutral[500]} />
            <Text style={styles.metricText}>{item.new_reviews}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="heart-outline" size={13} color={colors.like} />
            <Text style={styles.metricText}>{item.period_likes_received}</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={stopPropagation}>
        <FollowButton targetUserId={item.user_id} />
      </Pressable>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  bio: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[600],
  },
});
