import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getSpendingByCategory, getSumByPeriod, CategorySpending } from '@/database/db';
import { DonutChart, DonutChartItem } from '@/components/DonutChart';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

type PeriodType = 'week' | 'month' | 'year';

export default function StatsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  const [period, setPeriod] = useState<PeriodType>('month');
  const [loading, setLoading] = useState(true);
  const [totalExpense, setTotalExpense] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);

  // Date range calculators
  const getDateRange = (type: PeriodType) => {
    const now = new Date();
    let startDate = '';
    let endDate = now.toISOString().split('T')[0];

    if (type === 'week') {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate = past.toISOString().split('T')[0];
    } else if (type === 'month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
    } else {
      const year = now.getFullYear();
      startDate = `${year}-01-01`;
    }
    return { startDate, endDate };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(period);

      // 1. Load total expense
      const total = await getSumByPeriod(db, 'expense', startDate, endDate);
      setTotalExpense(total);

      // 2. Load transactions count
      const countRes = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(DISTINCT t.id) as count 
         FROM transactions t
         INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
         WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?`,
        startDate, endDate
      );
      setTxCount(countRes?.count ?? 0);

      // 3. Load spending by category
      const spending = await getSpendingByCategory(db, startDate, endDate);
      setCategorySpending(spending);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  }, [db, period]);

  // Reload data when page gains focus or period changes
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Compute daily average
  const getDaysInPeriod = () => {
    const { startDate, endDate } = getDateRange(period);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff || 1;
  };
  const dailyAverage = totalExpense / getDaysInPeriod();

  // Prepare chart data
  const donutData: DonutChartItem[] = categorySpending.map((c) => ({
    key: String(c.categoryId),
    name: c.categoryNameKey,
    amount: c.amount,
    color: c.color || colors.primary,
    percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
  }));

  // Group by multi-dimensional spending structure (Daily, Fixed, Flexible)
  const dimensionAmounts = {
    daily: 0,
    fixed: 0,
    flexible: 0,
  };

  categorySpending.forEach((c) => {
    if (c.parentNameKey === 'category.parent.daily') {
      dimensionAmounts.daily += c.amount;
    } else if (c.parentNameKey === 'category.parent.fixed') {
      dimensionAmounts.fixed += c.amount;
    } else if (c.parentNameKey === 'category.parent.flexible') {
      dimensionAmounts.flexible += c.amount;
    }
  });

  const dimensionTotal = dimensionAmounts.daily + dimensionAmounts.fixed + dimensionAmounts.flexible;

  const translateCategoryName = (nameKey: string, isCustom = false) => {
    return isCustom ? nameKey : t(nameKey);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('stats.title')}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as PeriodType[]).map((p) => {
          const isActive = period === p;
          const label = t(`stats.${p === 'week' ? 'weekly' : p === 'month' ? 'monthly' : 'yearly'}`);
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  isActive
                    ? { color: colors.textOnPrimary, fontWeight: '700' }
                    : { color: colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Stats Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }, Shadows.card]}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('stats.total_expense')}
              </Text>
              <Text style={[styles.summaryVal, { color: colors.expense }]}>
                {currencySymbol}
                {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('stats.count')}
              </Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {txCount}
                <Text style={{ fontSize: 13, fontWeight: 'normal' }}> {t('stats.count_unit')}</Text>
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('stats.daily_avg')}
              </Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {currencySymbol}
                {dailyAverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Donut Chart */}
          <View style={[styles.chartContainer, { backgroundColor: colors.surface }, Shadows.card]}>
            <DonutChart
              data={donutData}
              total={totalExpense}
              currencySymbol={currencySymbol}
            />
          </View>

          {/* Category Breakdown */}
          {donutData.length > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface }, Shadows.card]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('stats.category_breakdown')}
              </Text>
              {donutData.map((item, index) => (
                <View key={item.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.breakdownName, { color: colors.text }]}>
                      {translateCategoryName(item.name)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={[styles.breakdownPercent, { color: colors.textSecondary }]}>
                      {item.percentage.toFixed(1)}%
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                      {currencySymbol}
                      {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Dimension Breakdown (Daily, Fixed, Flexible) */}
          {totalExpense > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface }, Shadows.card]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('stats.dimension_title')}
              </Text>

              {/* Daily Spending */}
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionInfo}>
                  <Text style={[styles.dimensionName, { color: colors.text }]}>
                    {t('stats.daily_spend')}
                  </Text>
                  <Text style={[styles.dimensionAmt, { color: colors.text }]}>
                    {currencySymbol}
                    {dimensionAmounts.daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: '#40916C',
                        width: `${dimensionTotal > 0 ? (dimensionAmounts.daily / dimensionTotal) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fixed Spending */}
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionInfo}>
                  <Text style={[styles.dimensionName, { color: colors.text }]}>
                    {t('stats.fixed_spend')}
                  </Text>
                  <Text style={[styles.dimensionAmt, { color: colors.text }]}>
                    {currencySymbol}
                    {dimensionAmounts.fixed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: '#2196F3',
                        width: `${dimensionTotal > 0 ? (dimensionAmounts.fixed / dimensionTotal) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Flexible Spending */}
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionInfo}>
                  <Text style={[styles.dimensionName, { color: colors.text }]}>
                    {t('stats.flexible_spend')}
                  </Text>
                  <Text style={[styles.dimensionAmt, { color: colors.text }]}>
                    {currencySymbol}
                    {dimensionAmounts.flexible.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: '#9C27B0',
                        width: `${dimensionTotal > 0 ? (dimensionAmounts.flexible / dimensionTotal) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  summaryCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  chartContainer: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  breakdownCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.two,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownPercent: {
    fontSize: 13,
    marginRight: Spacing.three,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  dimensionRow: {
    marginBottom: Spacing.three,
  },
  dimensionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  dimensionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dimensionAmt: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
