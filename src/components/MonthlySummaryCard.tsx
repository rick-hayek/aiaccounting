import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

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
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, Shadows.elevated]}
      >
        <Text style={styles.title}>{t('home.total_expense')}</Text>
        <Text style={styles.amount}>
          {currencySymbol}
          {formatAmount(expense)}
        </Text>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          {/* Income Box */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('home.total_income')}</Text>
            <Text style={styles.statVal} numberOfLines={1}>
              +{currencySymbol}
              {formatAmount(income)}
            </Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* Expense Box */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('home.expense_label')}</Text>
            <Text style={styles.statVal} numberOfLines={1}>
              -{currencySymbol}
              {formatAmount(expense)}
            </Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* Balance Box */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('home.balance')}</Text>
            <Text
              style={[
                styles.statVal,
                { color: balance >= 0 ? '#FFFFFF' : '#FFCDD2' }
              ]}
              numberOfLines={1}
            >
              {balance >= 0 ? '+' : '-'}
              {currencySymbol}
              {formatAmount(Math.abs(balance))}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: Spacing.one,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
