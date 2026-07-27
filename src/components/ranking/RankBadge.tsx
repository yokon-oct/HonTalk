import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

interface RankBadgeProps {
  rank: number;
  size?: number;
}

/** 1〜3位のメダルカラー（金・銀・銅相当） */
const MEDAL_COLORS: Record<number, { background: string; foreground: string }> = {
  1: { background: '#FFD700', foreground: '#7A5B00' },
  2: { background: '#D6DEE6', foreground: '#4A5568' },
  3: { background: '#E8B98A', foreground: '#7A4A1E' },
};

export function RankBadge({ rank, size = 32 }: RankBadgeProps) {
  const medal = MEDAL_COLORS[rank];

  if (medal) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: medal.background },
        ]}
      >
        <Ionicons name="trophy" size={size * 0.55} color={medal.foreground} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        styles.plainBadge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.plainText}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainBadge: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  plainText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral[600],
  },
});
