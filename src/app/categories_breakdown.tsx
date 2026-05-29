import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getSpendingByCategory, getSumByPeriod, CategorySpending } from '@/database/db';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

export default function CategoriesBreakdownScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  // Read date filters from search parameters
  const params = useLocalSearchParams<{ startDate: string; endDate: string; period: string }>();
  const startDate = params.startDate || new Date().toISOString().split('T')[0];
  const endDate = params.endDate || new Date().toISOString().split('T')[0];
  const period = params.period || 'month';

  const [loading, setLoading] = useState(true);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const total = await getSumByPeriod(db, 'expense', startDate, endDate);
      setTotalExpense(total);

      const list = await getSpendingByCategory(db, startDate, endDate);
      setCategorySpending(list);
    } catch (e) {
      console.error('Failed to load category breakdown details:', e);
    } finally {
      setLoading(false);
    }
  }, [db, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const translateCategoryName = (nameKey: string) => {
    return nameKey.startsWith('category.') ? t(nameKey) : nameKey;
  };

  const translateParentName = (parentKey: string | null) => {
    if (!parentKey) return '';
    return t(parentKey);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.view_all_categories') || '分类支出明细'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date Range Subheader */}
      <View style={[styles.subHeader, { backgroundColor: colors.surfaceElevated, borderColor: colors.divider }]}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {startDate} ~ {endDate}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : categorySpending.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('stats.no_data') || '此时间段内暂无数据'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Card */}
          <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              {t('stats.total_expense')}
            </Text>
            <Text style={[styles.totalVal, { color: colors.expense }]}>
              {currencySymbol}
              {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          {/* List Card */}
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            {categorySpending.map((item, index) => {
              const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
              const hasDivider = index < categorySpending.length - 1;

              return (
                <View key={item.categoryId}>
                  <View style={styles.itemRow}>
                    {/* Color indicator and names */}
                    <View style={styles.itemLeft}>
                      <View style={[styles.colorCircle, { backgroundColor: item.color || colors.primary }]}>
                        <View style={styles.colorInnerDot} />
                      </View>
                      <View style={styles.nameBlock}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>
                          {translateCategoryName(item.categoryNameKey)}
                        </Text>
                        {item.parentNameKey && (
                          <Text style={[styles.parentName, { color: colors.textSecondary }]}>
                            {translateParentName(item.parentNameKey)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Amount and percentage values */}
                    <View style={styles.itemRight}>
                      <Text style={[styles.amountText, { color: colors.text }]}>
                        {currencySymbol}
                        {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <View style={[styles.percentageBadge, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.percentageText, { color: colors.primary }]}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {hasDivider && (
                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                  )}
                </View>
              );
            })}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    padding: Spacing.one,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  totalCard: {
    padding: Spacing.four,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  totalVal: {
    fontSize: 24,
    fontWeight: '800',
  },
  listCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.four,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  colorInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  nameBlock: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  parentName: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  percentageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
