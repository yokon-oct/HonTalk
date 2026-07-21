import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { colors } from '@/theme/colors';

interface MonthlyData {
  year: number;
  month: number;
  count: number;
}

interface BarChartProps {
  data: MonthlyData[];
  /** グラフの最大高さ(px) */
  maxBarHeight?: number;
}

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export function BarChart({ data, maxBarHeight = 140 }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const animValues = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((item, index) =>
      Animated.spring(animValues[index], {
        toValue: item.count / maxCount,
        useNativeDriver: false,
        delay: index * 40,
        damping: 12,
        stiffness: 100,
      })
    );
    Animated.stagger(30, animations).start();
  }, [data]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      {/* Y軸ラベル */}
      <View style={styles.yAxis}>
        {[maxCount, Math.round(maxCount / 2), 0].map((v, i) => (
          <Text key={i} style={styles.yLabel}>{v}</Text>
        ))}
      </View>

      {/* バー */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((item, index) => {
          const isCurrentMonth = item.month === currentMonth && item.year === currentYear;
          const heightRatio = animValues[index];
          const animatedHeight = heightRatio.interpolate({
            inputRange: [0, 1],
            outputRange: [0, maxBarHeight],
          });

          return (
            <View key={`${item.year}-${item.month}`} style={styles.barColumn}>
              {/* カウント表示 */}
              {item.count > 0 && (
                <Text style={[styles.barCount, isCurrentMonth && styles.barCountAccent]}>
                  {item.count}
                </Text>
              )}
              {/* バー本体 */}
              <View style={[styles.barWrapper, { height: maxBarHeight }]}>
                <Animated.View
                  style={[
                    styles.bar,
                    isCurrentMonth && styles.barAccent,
                    { height: animatedHeight },
                  ]}
                />
              </View>
              {/* 月ラベル */}
              <Text style={[styles.xLabel, isCurrentMonth && styles.xLabelAccent]}>
                {MONTH_LABELS[(item.month - 1) % 12]}
              </Text>
              {/* 年が変わる部分はサブラベル表示 */}
              {item.month === 1 && (
                <Text style={styles.yearLabel}>{item.year}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxis: {
    height: 170,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 20,
  },
  yLabel: {
    fontSize: 11,
    color: colors.neutral[400],
    minWidth: 20,
    textAlign: 'right',
  },
  scrollContent: {
    alignItems: 'flex-end',
    paddingRight: 8,
    gap: 4,
  },
  barColumn: {
    width: 28,
    alignItems: 'center',
  },
  barCount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[600],
    marginBottom: 2,
  },
  barCountAccent: {
    color: colors.primary[600],
  },
  barWrapper: {
    justifyContent: 'flex-end',
    width: 20,
  },
  bar: {
    width: 20,
    backgroundColor: colors.neutral[300],
    borderRadius: 4,
    minHeight: 2,
  },
  barAccent: {
    backgroundColor: colors.primary[500],
  },
  xLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 4,
    fontWeight: '500',
  },
  xLabelAccent: {
    color: colors.primary[600],
    fontWeight: '700',
  },
  yearLabel: {
    fontSize: 9,
    color: colors.neutral[400],
    marginTop: 1,
  },
});
