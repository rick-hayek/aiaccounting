import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
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
import { getTransactions, deleteTransaction, Transaction, Category } from '@/database/db';
import { TransactionItem } from '@/components/TransactionItem';
import { ManualAddModal } from '@/components/ManualAddModal';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

type FilterType = 'all' | 'expense' | 'income';

interface HeaderItem {
  isHeader: true;
  date: string;
  totalExpense: number;
  totalIncome: number;
}

interface TransactionRowItem {
  isHeader: false;
  transaction: Transaction;
}

type ListItem = HeaderItem | TransactionRowItem;

export default function LedgerScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  // Page state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editTxId, setEditTxId] = useState<number | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getTransactions(db, 1000, 0);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions in ledger:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  // Load on mount and on page focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Perform filtering and search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter by type
      if (filterType === 'expense' && tx.type !== 'expense') return false;
      if (filterType === 'income' && tx.type !== 'income') return false;

      // 2. Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(query) ?? false;
        
        const catMatch = tx.categories?.some((cat) => {
          const catName = cat.is_custom === 1 ? cat.name_key : t(cat.name_key);
          return catName.toLowerCase().includes(query);
        }) ?? false;

        return noteMatch || catMatch;
      }

      return true;
    });
  }, [transactions, filterType, searchQuery, t]);

  // Group by date and flat-map for FlatList rendering
  const listData = useMemo(() => {
    const groups: Record<string, { txs: Transaction[]; expenseTotal: number; incomeTotal: number }> = {};

    filteredTransactions.forEach((tx) => {
      const date = tx.date;
      if (!groups[date]) {
        groups[date] = { txs: [], expenseTotal: 0, incomeTotal: 0 };
      }
      groups[date].txs.push(tx);
      if (tx.type === 'expense') {
        groups[date].expenseTotal += tx.amount;
      } else {
        groups[date].incomeTotal += tx.amount;
      }
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const result: ListItem[] = [];
    sortedDates.forEach((date) => {
      const group = groups[date];
      result.push({
        isHeader: true,
        date,
        totalExpense: group.expenseTotal,
        totalIncome: group.incomeTotal,
      });

      group.txs.forEach((tx) => {
        result.push({
          isHeader: false,
          transaction: tx,
        });
      });
    });

    return result;
  }, [filteredTransactions]);

  const handleTransactionAction = (tx: Transaction) => {
    router.navigate({ pathname: '/edit', params: { id: tx.id.toString() } } as any);
  };

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return t('common.today');
    if (dateStr === yesterday) return t('common.yesterday');
    return dateStr;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.isHeader) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionDate, { color: colors.textSecondary }]}>
            {formatDateHeader(item.date)}
          </Text>
          <View style={styles.sectionTotals}>
            {item.totalIncome > 0 && (
              <Text style={[styles.sectionTotalText, { color: colors.income }]}>
                +{currencySymbol}{item.totalIncome.toFixed(2)}
              </Text>
            )}
            {item.totalExpense > 0 && (
              <Text style={[styles.sectionTotalText, { color: colors.expense }]}>
                -{currencySymbol}{item.totalExpense.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.itemPadding}>
        <TransactionItem
          transaction={item.transaction}
          currencySymbol={currencySymbol}
          onPress={handleTransactionAction}
          onLongPress={handleTransactionAction}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('ledger.title')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('ledger.search_placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {(['all', 'expense', 'income'] as FilterType[]).map((f) => {
          const isActive = filterType === f;
          const label = t(`ledger.${f === 'all' ? 'all' : f === 'expense' ? 'expense_only' : 'income_only'}`);
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={() => setFilterType(f)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
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

      {/* Transactions List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('ledger.no_results')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => (item.isHeader ? `h-${item.date}` : `tx-${item.transaction.id}`)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

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
          loadData();
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTotals: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionTotalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemPadding: {
    marginVertical: 2,
  },
});
