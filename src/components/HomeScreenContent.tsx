import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getTransactions, getSumByPeriod, Transaction } from '@/database/db';
import { MonthlySummaryCard } from '@/components/MonthlySummaryCard';
import { QuickEntryGrid } from '@/components/QuickEntryGrid';
import { TransactionItem } from '@/components/TransactionItem';
import { ManualAddModal } from '@/components/ManualAddModal';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

interface HomeScreenContentProps {
  isActive?: boolean;
  onNavigateToLedger?: () => void;
}

export default function HomeScreenContent({ isActive, onNavigateToLedger }: HomeScreenContentProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  // Home states
  const [loading, setLoading] = useState(true);
  const [monthExpense, setMonthExpense] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Manual modal states
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [editTxId, setEditTxId] = useState<number | null>(null);

  const loadHomeData = useCallback(async () => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const startOfMonth = `${currentMonthStr}-01`;
      const endOfMonth = `${currentMonthStr}-31`; // Approx end

      // 1. Fetch recent transactions (limit to 5)
      const txList = await getTransactions(db, 5, 0);
      setRecentTransactions(txList);

      // 2. Fetch monthly sum totals
      const sumExpense = await getSumByPeriod(db, 'expense', startOfMonth, endOfMonth);
      const sumIncome = await getSumByPeriod(db, 'income', startOfMonth, endOfMonth);
      setMonthExpense(sumExpense);
      setMonthIncome(sumIncome);
    } catch (e) {
      console.error('Failed to load home data:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isActive !== false) {
        loadHomeData();
      }
    }, [loadHomeData, isActive])
  );

  useEffect(() => {
    if (isActive) {
      loadHomeData();
    }
  }, [isActive, loadHomeData]);

  const handleTransactionAction = (tx: Transaction) => {
    router.navigate({ pathname: '/edit', params: { id: tx.id.toString() } } as any);
  };

  const handleVoicePress = () => {
    router.navigate('/ai' as any);
  };

  const handleAiPress = () => {
    router.navigate('/ai' as any);
  };

  const handleManualPress = () => {
    setEditTxId(null);
    setManualModalVisible(true);
  };

  const handleScanPress = () => {
    Alert.alert(t('common.coming_soon'), t('scan.coming_soon'));
  };

  const handleViewAll = () => {
    if (onNavigateToLedger) {
      onNavigateToLedger();
    } else {
      router.navigate('/ledger' as any);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Title (locked vertically) */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('home.my_bills')}
        </Text>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primarySurface }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gradient Monthly Summary */}
        <MonthlySummaryCard
          income={monthIncome}
          expense={monthExpense}
          currencySymbol={currencySymbol}
        />

        {/* Quick entry grid */}
        <QuickEntryGrid
          onVoice={handleVoicePress}
          onAi={handleAiPress}
          onManual={handleManualPress}
          onScan={handleScanPress}
        />

        {/* Recent Transactions List */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>
              {t('home.recent')}
            </Text>
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {t('home.view_all')} →
              </Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} style={{ marginBottom: Spacing.two }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('home.no_transactions')}
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                currencySymbol={currencySymbol}
                onPress={handleTransactionAction}
                onLongPress={handleTransactionAction}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Manual Add / Edit Modal */}
      <ManualAddModal
        visible={manualModalVisible}
        onClose={() => {
          setManualModalVisible(false);
          setEditTxId(null);
        }}
        onSave={() => {
          setManualModalVisible(false);
          setEditTxId(null);
          loadHomeData();
        }}
        defaultCurrency={defaultCurrency || 'CNY'}
        editTransactionId={editTxId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentContainer: {
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
