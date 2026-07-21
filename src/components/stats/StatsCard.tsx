import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface StatsCardProps {
  label: string;
  value: number | string;
  unit?: string;
  accent?: boolean;
  icon?: string;
}

export function StatsCard({ label, value, unit = '冊', accent = false }: StatsCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.value, accent && styles.valueAccent]}>
        {value}
        <Text style={[styles.unit, accent && styles.unitAccent]}>{unit}</Text>
      </Text>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    backgroundColor: colors.primary[500],
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral[900],
    lineHeight: 34,
  },
  valueAccent: {
    color: '#fff',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  unitAccent: {
    color: 'rgba(255,255,255,0.8)',
  },
  label: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelAccent: {
    color: 'rgba(255,255,255,0.85)',
  },
});
