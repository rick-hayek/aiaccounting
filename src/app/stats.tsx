import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getSpendingByCategory, getSumByPeriod, CategorySpending } from '@/database/db';
import { DonutChart, DonutChartItem } from '@/components/DonutChart';
import { TrendChart, TrendChartPoint } from '@/components/TrendChart';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

type PeriodType = 'week' | 'month' | 'year' | 'custom';

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  const [period, setPeriod] = useState<PeriodType>('month');
  const [loading, setLoading] = useState(true);
  const [totalExpense, setTotalExpense] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [trendPoints, setTrendPoints] = useState<TrendChartPoint[]>([]);
  const [previousTotal, setPreviousTotal] = useState(0);

  // Custom date selection states
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

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
    } else if (type === 'year') {
      const year = now.getFullYear();
      startDate = `${year}-01-01`;
    } else {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    return { startDate, endDate };
  };

  const getPreviousDateRange = (type: PeriodType, startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    let prevStartDate = '';
    let prevEndDate = '';

    if (type === 'week') {
      const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevEnd = new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000);
      prevStartDate = prevStart.toISOString().split('T')[0];
      prevEndDate = prevEnd.toISOString().split('T')[0];
    } else if (type === 'month') {
      let year = start.getFullYear();
      let month = start.getMonth(); // previous month (0-indexed, so -1 month implicitly)
      if (month === 0) {
        year -= 1;
        month = 12;
      }
      const prevMonthStr = String(month).padStart(2, '0');
      prevStartDate = `${year}-${prevMonthStr}-01`;
      
      const lastDay = new Date(year, month, 0).getDate();
      prevEndDate = `${year}-${prevMonthStr}-${String(lastDay).padStart(2, '0')}`;
    } else if (type === 'year') {
      const prevYear = start.getFullYear() - 1;
      prevStartDate = `${prevYear}-01-01`;
      prevEndDate = `${prevYear}-12-31`;
    } else {
      const rangeMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - rangeMs - 24 * 60 * 60 * 1000);
      const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      prevStartDate = prevStart.toISOString().split('T')[0];
      prevEndDate = prevEnd.toISOString().split('T')[0];
    }

    return { prevStartDate, prevEndDate };
  };

  const isCustomDateRangeValid = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(customStartDate) || !dateRegex.test(customEndDate)) {
      return false;
    }
    return customStartDate <= customEndDate;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(period);

      if (period === 'custom' && !isCustomDateRangeValid()) {
        setTotalExpense(0);
        setTxCount(0);
        setCategorySpending([]);
        setTrendPoints([]);
        setPreviousTotal(0);
        return;
      }

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

      // 4. Load previous period spending total
      const { prevStartDate, prevEndDate } = getPreviousDateRange(period, startDate, endDate);
      const prevTotal = await getSumByPeriod(db, 'expense', prevStartDate, prevEndDate);
      setPreviousTotal(prevTotal);

      // 5. Load trend points
      let trendRows: { dateOrMonth: string; total: number }[] = [];
      if (period === 'year') {
        const rawTrend = await db.getAllAsync<{ month: string; total: number }>(
          `SELECT strftime('%Y-%m', t.date) as month, SUM(t.amount) as total 
           FROM transactions t
           INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
           WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
           GROUP BY month
           ORDER BY month ASC`,
          startDate, endDate
        );
        trendRows = rawTrend.map(r => ({ dateOrMonth: r.month, total: r.total }));
      } else {
        const rawTrend = await db.getAllAsync<{ date: string; total: number }>(
          `SELECT t.date, SUM(t.amount) as total 
           FROM transactions t
           INNER JOIN transaction_categories tc ON tc.transaction_id = t.id
           WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
           GROUP BY t.date
           ORDER BY t.date ASC`,
          startDate, endDate
        );
        trendRows = rawTrend.map(r => ({ dateOrMonth: r.date, total: r.total }));
      }

      // Fill in zero-spending gaps
      const trendDataMap: Record<string, number> = {};
      trendRows.forEach(row => {
        trendDataMap[row.dateOrMonth] = row.total;
      });

      const tempPoints: TrendChartPoint[] = [];
      if (period === 'year') {
        const year = new Date(startDate).getFullYear();
        const labelMappingEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let m = 1; m <= 12; m++) {
          const monthKey = `${year}-${String(m).padStart(2, '0')}`;
          const currentLabel = i18n.language === 'en' ? labelMappingEn[m - 1] : `${m}月`;
          tempPoints.push({
            label: currentLabel,
            value: trendDataMap[monthKey] ?? 0
          });
        }
      } else {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const loopDate = new Date(start);
        
        let iterations = 0;
        // Cap range loop iterations to 90 to prevent performance lag on very long intervals
        while (loopDate <= end && iterations < 90) {
          const dateStr = loopDate.toISOString().split('T')[0];
          const parts = dateStr.split('-');
          const label = `${parts[1]}-${parts[2]}`; // MM-DD
          tempPoints.push({
            label,
            value: trendDataMap[dateStr] ?? 0
          });
          loopDate.setDate(loopDate.getDate() + 1);
          iterations++;
        }
      }
      setTrendPoints(tempPoints);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  }, [db, period, customStartDate, customEndDate, i18n.language]);

  // Reload data when page gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Trigger reloading for custom dates changes
  useEffect(() => {
    if (period === 'custom') {
      if (isCustomDateRangeValid()) {
        loadData();
      }
    } else {
      loadData();
    }
  }, [period, customStartDate, customEndDate]);

  // Compute daily average
  const getDaysInPeriod = () => {
    const { startDate, endDate } = getDateRange(period);
    if (period === 'custom' && !isCustomDateRangeValid()) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff || 1;
  };
  const dailyAverage = totalExpense / getDaysInPeriod();

  // Prepare donut chart data
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

  // Comparative change calculator
  const getPeriodChange = () => {
    if (previousTotal === 0) return null;
    const diff = totalExpense - previousTotal;
    return (diff / previousTotal) * 100;
  };

  const percentChange = getPeriodChange();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('stats.title')}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {([
          { key: 'week', label: t('stats.weekly') },
          { key: 'month', label: t('stats.monthly') },
          { key: 'year', label: t('stats.yearly') },
          { key: 'custom', label: t('stats.custom_range') },
        ] as { key: PeriodType; label: string }[]).map((p) => {
          const isActive = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodButton,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => setPeriod(p.key)}
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
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom Date Picker Inputs */}
      {period === 'custom' && (
        <View style={[styles.customDateContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <View style={styles.customDateCol}>
            <Text style={[styles.customDateLabel, { color: colors.textSecondary }]}>
              {t('stats.select_start_date')}
            </Text>
            <TextInput
              value={customStartDate}
              onChangeText={setCustomStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              style={[styles.customDateInput, { color: colors.text }]}
            />
          </View>
          <View style={[styles.customDateLine, { backgroundColor: colors.divider }]} />
          <View style={styles.customDateCol}>
            <Text style={[styles.customDateLabel, { color: colors.textSecondary }]}>
              {t('stats.select_end_date')}
            </Text>
            <TextInput
              value={customEndDate}
              onChangeText={setCustomEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              style={[styles.customDateInput, { color: colors.text }]}
            />
          </View>
        </View>
      )}
      {period === 'custom' && !isCustomDateRangeValid() && (
        <Text style={styles.dateWarningText}>
          日期格式不合法，开始日期不能晚于结束日期 (格式: YYYY-MM-DD)
        </Text>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Stats Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.statsRow}>
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

            {/* Previous Period Comparative Indicator */}
            {percentChange !== null && (
              <View style={[styles.comparisonRow, { borderTopColor: colors.divider }]}>
                <Ionicons 
                  name={percentChange > 0 ? "trending-up-outline" : "trending-down-outline"} 
                  size={16} 
                  color={percentChange > 0 ? colors.expense : colors.income} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.comparisonText, { color: colors.textSecondary }]}>
                  {t('stats.compare_previous')}
                </Text>
                <View style={[
                  styles.percentBadge, 
                  { backgroundColor: percentChange > 0 ? `${colors.expense}15` : `${colors.income}15` }
                ]}>
                  <Text style={[
                    styles.percentText, 
                    { color: percentChange > 0 ? colors.expense : colors.income }
                  ]}>
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}
            {percentChange === null && previousTotal === 0 && totalExpense > 0 && (
              <View style={[styles.comparisonRow, { borderTopColor: colors.divider }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.comparisonText, { color: colors.textSecondary }]}>
                  {t('stats.no_previous_data')}
                </Text>
              </View>
            )}
          </View>

          {/* SVG Trend Area Chart */}
          {totalExpense > 0 && (
            <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, alignSelf: 'flex-start', marginBottom: Spacing.two }]}>
                {t('stats.trend_title')}
              </Text>
              <TrendChart
                data={trendPoints}
                currencySymbol={currencySymbol}
              />
            </View>
          )}

          {/* Donut Chart (Category Breakdown Ratio) */}
          <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, alignSelf: 'flex-start', marginBottom: Spacing.two }]}>
              {t('stats.category_breakdown')}
            </Text>
            <DonutChart
              data={donutData}
              total={totalExpense}
              currencySymbol={currencySymbol}
            />
          </View>

          {/* Category List Details */}
          {donutData.length > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
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
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
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
    fontWeight: '700',
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
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  customDateCol: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  customDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customDateInput: {
    fontSize: 14,
    height: 32,
    padding: 0,
  },
  customDateLine: {
    width: 1,
    height: 30,
  },
  dateWarningText: {
    color: '#DC3545',
    fontSize: 12,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    textAlign: 'center',
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
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  comparisonText: {
    fontSize: 13,
    marginRight: Spacing.two,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartContainer: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1,
  },
  breakdownCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
    borderWidth: 1,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
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
