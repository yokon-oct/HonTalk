import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useReadingStats } from '@/hooks/useBooks';
import { StatsCard } from '@/components/stats/StatsCard';
import { BarChart } from '@/components/stats/BarChart';
import { GenrePieChart } from '@/components/stats/GenrePieChart';
import { RatingDistribution } from '@/components/stats/RatingDistribution';

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrapper}>
          <Ionicons name={icon} size={18} color={colors.primary[500]} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const { data: stats, isLoading, isError, refetch } = useReadingStats();

  const currentYear = new Date().getFullYear();

  return (
    <>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>統計を集計中...</Text>
        </View>
      ) : isError || !stats ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.errorText}>統計の取得に失敗しました</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダーバナー */}
          <View style={styles.heroBanner}>
            <View style={styles.heroIconWrapper}>
              <Ionicons name="bar-chart" size={32} color={colors.primary[500]} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>あなたの読書記録</Text>
              <Text style={styles.heroSubtitle}>{currentYear}年の読書ライフを振り返ろう</Text>
            </View>
          </View>

          {/* サマリーカード */}
          <View style={styles.summaryRow}>
            <StatsCard
              label={`${currentYear}年の読了`}
              value={stats.summary.year_finished}
              accent
            />
            <StatsCard label="読書中" value={stats.summary.total_reading} />
            <StatsCard label="読みたい" value={stats.summary.total_want} />
          </View>

          {/* 通算読了冊数 */}
          <View style={styles.totalRow}>
            <Ionicons name="book" size={20} color={colors.primary[500]} />
            <Text style={styles.totalText}>
              通算読了:{' '}
              <Text style={styles.totalValue}>{stats.summary.total_finished}冊</Text>
            </Text>
          </View>

          {/* 月別棒グラフ */}
          <SectionCard title="月別読了冊数（過去12ヶ月）" icon="calendar-outline">
            {stats.monthly.every((m) => m.count === 0) ? (
              <View style={styles.emptyChart}>
                <Ionicons name="book-outline" size={40} color={colors.neutral[300]} />
                <Text style={styles.emptyChartText}>まだ読書記録がありません</Text>
                <Text style={styles.emptyChartSub}>本を読み終えると月別グラフが表示されます</Text>
              </View>
            ) : (
              <BarChart data={stats.monthly} />
            )}
          </SectionCard>

          {/* ジャンル分布 */}
          <SectionCard title="ジャンル別冊数" icon="layers-outline">
            <GenrePieChart data={stats.by_genre} />
          </SectionCard>

          {/* 評価分布 */}
          <SectionCard title="評価の分布" icon="star-outline">
            <RatingDistribution data={stats.ratings} />
          </SectionCard>

          {/* 読書傾向メッセージ */}
          {stats.summary.total_finished > 0 && (
            <View style={styles.insightCard}>
              <Ionicons name="bulb-outline" size={20} color={colors.accent[600]} />
              <Text style={styles.insightText}>
                {generateInsight(stats.summary)}
              </Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </>
  );
}

/** 読書傾向から一言メッセージを生成 */
function generateInsight(summary: {
  total_finished: number;
  year_finished: number;
  total_reading: number;
}) {
  const { total_finished, year_finished, total_reading } = summary;
  const monthsPassed = new Date().getMonth() + 1;
  const avgPerMonth = year_finished / monthsPassed;

  if (total_finished >= 100) {
    return `読了${total_finished}冊！読書家の称号に相応しい素晴らしい記録です 📚`;
  }
  if (avgPerMonth >= 4) {
    return `今年は月平均${avgPerMonth.toFixed(1)}冊ペースで読書しています。素晴らしい読書習慣ですね！`;
  }
  if (total_reading > 0) {
    return `現在${total_reading}冊を読んでいます。読了したら記録を忘れずに！`;
  }
  if (year_finished > 0) {
    return `今年は${year_finished}冊を読了しました。引き続き読書を楽しみましょう！`;
  }
  return `読書記録をつけて、あなたの読書ライフを可視化しましょう！`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  content: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: colors.neutral[600],
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary[500],
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ヒーローバナー
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary[800],
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.primary[600],
    lineHeight: 18,
  },

  // サマリーカード
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  totalText: {
    fontSize: 14,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral[900],
  },

  // セクションカード
  sectionCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // 空状態
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyChartText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  emptyChartSub: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
  },

  // インサイトカード
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.accent[50],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.accent[200],
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 21,
    fontWeight: '500',
  },
});
