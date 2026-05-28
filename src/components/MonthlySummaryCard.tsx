import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';

interface MonthlySummaryCardProps {
  income: number;
  expense: number;
  currencySymbol: string;
}

export function MonthlySummaryCard({ income, expense, currencySymbol }: MonthlySummaryCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const balance = income - expense;

  const formatAmount = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.primary }]}>
        <Text style={styles.label}>{t('home.total_balance')}</Text>
        <Text style={styles.amount}>
          {currencySymbol}
          {formatAmount(income - expense >= 0 ? income - expense : expense - income)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('home.expense_label')}</Text>
            <Text style={styles.statVal} numberOfLines={1}>
              {currencySymbol}
              {formatAmount(expense)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('home.total_income')}</Text>
            <Text style={styles.statVal} numberOfLines={1}>
              {currencySymbol}
              {formatAmount(income)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: 20,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
