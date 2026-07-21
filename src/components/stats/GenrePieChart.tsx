import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/theme/colors';

interface GenreData {
  genre: string;
  count: number;
}

interface GenrePieChartProps {
  data: GenreData[];
}

// ジャンルごとのカラーパレット
const GENRE_COLORS = [
  colors.primary[500],
  colors.secondary[500],
  colors.accent[500],
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#F43F5E',
];

export function GenrePieChart({ data }: GenrePieChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const animValues = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((item, i) =>
      Animated.spring(animValues[i], {
        toValue: 1,
        useNativeDriver: false,
        delay: i * 60,
        damping: 14,
        stiffness: 120,
      })
    );
    Animated.stagger(40, animations).start();
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>ジャンルデータがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data.map((item, i) => {
        const ratio = total > 0 ? item.count / total : 0;
        const percent = Math.round(ratio * 100);
        const barColor = GENRE_COLORS[i % GENRE_COLORS.length];

        const animWidth = animValues[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${Math.max(ratio * 100, 1)}%`],
        });

        return (
          <View key={item.genre} style={styles.row}>
            {/* ジャンル名 */}
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: barColor }]} />
              <Text style={styles.genreLabel} numberOfLines={1}>
                {item.genre}
              </Text>
              <Text style={styles.countText}>{item.count}冊</Text>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>
            {/* バー */}
            <View style={styles.barTrack}>
              <Animated.View
                style={[styles.barFill, { backgroundColor: barColor, width: animWidth }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  genreLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[800],
    fontWeight: '500',
  },
  countText: {
    fontSize: 13,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  percentText: {
    fontSize: 12,
    color: colors.neutral[400],
    minWidth: 36,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
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
