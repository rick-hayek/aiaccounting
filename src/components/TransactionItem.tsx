import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';
import type { Transaction, Category } from '@/database/db';

interface TransactionItemProps {
  transaction: Transaction;
  currencySymbol: string;
  onPress: (tx: Transaction) => void;
  onLongPress?: (tx: Transaction) => void;
}

export function TransactionItem({ transaction, currencySymbol, onPress, onLongPress }: TransactionItemProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const tx = transaction;
  const firstCat = tx.categories?.[0];
  const iconName = (firstCat?.icon || 'receipt-outline') as keyof typeof Ionicons.glyphMap;
  const iconColor = firstCat?.color || colors.primary;

  const translateName = (c: Category) => c.is_custom === 1 ? c.name_key : t(c.name_key);

  const title = tx.note || tx.categories?.map(translateName).join(', ') || t('add_tx.title_add');
  const isExpense = tx.type === 'expense';
  const amountColor = isExpense ? colors.expense : colors.income;
  const amountPrefix = isExpense ? '-' : '+';

  // Format time from date
  const formatTime = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return t('common.today');
    if (dateStr === yesterday) return t('common.yesterday');
    return dateStr;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: colors.divider,
          backgroundColor: colors.surface,
        }
      ]}
      onPress={() => onPress(tx)}
      onLongPress={() => onLongPress?.(tx)}
      activeOpacity={0.6}
    >
      {/* Category Icon */}
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      {/* Title + Category Tags */}
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {tx.categories && tx.categories.length > 0 && (
          <View style={styles.tagsRow}>
            {tx.categories.slice(0, 3).map(c => {
              const catColor = c.color || colors.primary;
              return (
                <View key={c.id} style={[styles.tag, { backgroundColor: catColor + '18' }]}>
                  <Text style={[styles.tagText, { color: catColor }]}>
                    {translateName(c)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Amount + Time */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatTime(tx.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  center: {
    flex: 1,
    marginRight: Spacing.two,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
  },
});
