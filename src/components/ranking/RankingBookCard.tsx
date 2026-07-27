import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { BookCover } from '../book/BookCover';
import { RankBadge } from './RankBadge';
import type { BookRankingItem } from '@/services/rankingService';

interface RankingBookCardProps {
  item: BookRankingItem;
  rank: number;
  onPress?: (bookId: string) => void;
}

export function RankingBookCard({ item, rank, onPress }: RankingBookCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item.book_id)}
      activeOpacity={0.8}
    >
      <RankBadge rank={rank} />
      <BookCover url={item.cover_image_url} width={52} height={78} style={styles.cover} />

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{item.author}</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="add-circle-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.metricText}>{item.new_registrations}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.metricText}>{item.new_reviews}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="heart-outline" size={14} color={colors.like} />
            <Text style={styles.metricText}>{item.period_likes}</Text>
          </View>
          {item.rating_count > 0 && (
            <View style={styles.metric}>
              <Ionicons name="star" size={14} color={colors.star} />
              <Text style={styles.metricText}>{item.average_rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
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
  cover: {
    borderRadius: 6,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  author: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
  },
});
