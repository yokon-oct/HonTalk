import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

interface RatingData {
  rating: number;
  count: number;
}

interface RatingDistributionProps {
  data: RatingData[];
}

export function RatingDistribution({ data }: RatingDistributionProps) {
  const totalRated = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const animValues = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((item, i) =>
      Animated.spring(animValues[i], {
        toValue: 1,
        useNativeDriver: false,
        delay: i * 80,
        damping: 12,
        stiffness: 100,
      })
    );
    Animated.stagger(60, animations).start();
  }, [data]);

  if (totalRated === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>評価データがありません</Text>
      </View>
    );
  }

  // ★5から降順に表示
  const sortedData = [...data].sort((a, b) => b.rating - a.rating);

  return (
    <View style={styles.container}>
      {sortedData.map((item, i) => {
        const animIdx = data.findIndex((d) => d.rating === item.rating);
        const ratio = item.count / maxCount;

        const animWidth = animValues[animIdx].interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${Math.max(ratio * 100, item.count > 0 ? 2 : 0)}%`],
        });

        return (
          <View key={item.rating} style={styles.row}>
            {/* 星 */}
            <View style={styles.stars}>
              {[...Array(5)].map((_, si) => (
                <Ionicons
                  key={si}
                  name={si < item.rating ? 'star' : 'star-outline'}
                  size={14}
                  color={si < item.rating ? colors.star : colors.neutral[300]}
                />
              ))}
            </View>
            {/* バー */}
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  { width: animWidth, opacity: item.count > 0 ? 1 : 0 },
                ]}
              />
            </View>
            {/* 冊数 */}
            <Text style={styles.count}>{item.count}冊</Text>
          </View>
        );
      })}
      <Text style={styles.total}>合計 {totalRated}冊に評価</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.neutral[100],
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent[400],
    borderRadius: 5,
  },
  count: {
    fontSize: 12,
    color: colors.neutral[600],
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  total: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: 4,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
  },
});
