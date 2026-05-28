import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getCategories, updateTransaction, deleteTransaction, Category } from '@/database/db';
import { Spacing, BorderRadius } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

export default function EditTransactionScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const colors = useThemeColors();
  const { defaultCurrency, themeMode } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = id ? parseInt(id, 10) : null;

  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!transactionId) {
      Alert.alert(t('common.error'), 'Invalid Transaction ID', [
        { text: t('common.confirm'), onPress: () => router.back() }
      ]);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        // Load categories
        const cats = await getCategories(db);
        setCategories(cats);

        // Load transaction details
        const rows = await db.getAllAsync<any>(
          `SELECT * FROM transactions WHERE id = ?`,
          transactionId
        );
        if (rows.length > 0) {
          const tx = rows[0];
          setType(tx.type);
          setAmount(tx.amount.toString());
          setNote(tx.note || '');
          setDate(tx.date);

          // Fetch categories for this transaction
          const catRows = await db.getAllAsync<{ category_id: number }>(
            `SELECT category_id FROM transaction_categories WHERE transaction_id = ?`,
            transactionId
          );
          setSelectedCategoryIds(catRows.map(c => c.category_id));
        } else {
          Alert.alert(t('common.error'), 'Transaction not found', [
            { text: t('common.confirm'), onPress: () => router.back() }
          ]);
        }
      } catch (e) {
        console.error('Failed to load transaction data', e);
        Alert.alert(t('common.error'), 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [db, transactionId]);

  const handleToggleCategory = (id: number) => {
    const targetCat = categories.find(c => c.id === id);
    if (!targetCat) return;

    setSelectedCategoryIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        // Enforce the rule: at most one subcategory under the same parent category
        const parentIdOfTarget = targetCat.parent_id;

        const filtered = prev.filter(x => {
          const cat = categories.find(c => c.id === x);
          if (!cat) return true;
          if (parentIdOfTarget !== null && cat.parent_id === parentIdOfTarget) {
            return false;
          }
          return true;
        });

        return [...filtered, id];
      }
    });
  };

  const handleSave = async () => {
    if (!transactionId) return;

    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      Alert.alert(t('common.error'), t('add_tx.empty_amount_error'));
      return;
    }
    if (selectedCategoryIds.length === 0) {
      Alert.alert(t('common.error'), t('add_tx.empty_category_error'));
      return;
    }
    // Verify date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert(t('common.error'), t('add_tx.date_format_error') || '日期格式错误，请使用 YYYY-MM-DD');
      return;
    }

    try {
      await updateTransaction(db, transactionId, type, floatAmount, date, note || null, selectedCategoryIds);
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  const handleDelete = () => {
    if (!transactionId) return;

    Alert.alert(
      t('common.warning'),
      t('home.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(db, transactionId);
              router.back();
            } catch (e) {
              Alert.alert(t('common.error'), 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  // Group child categories by their parent category
  const getGroupedCategories = () => {
    const parents = categories.filter(c => c.parent_id === null && c.type === type);
    const result: { parent: Category; children: Category[] }[] = [];

    for (const parent of parents) {
      const children = categories.filter(c => c.parent_id === parent.id);
      result.push({ parent, children });
    }

    // Include parentless categories
    const orphans = categories.filter(c => c.parent_id === null && c.is_custom === 1 && c.type === type);
    if (orphans.length > 0) {
      result.push({
        parent: { id: -99, name_key: 'Other', type, icon: 'list', color: '#9E9E9E', is_custom: 0, parent_id: null },
        children: orphans
      });
    }

    return result;
  };

  const groupedCategories = getGroupedCategories();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('add_tx.title_edit')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Expense / Income Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === 'expense' && { backgroundColor: colors.primarySurface }
              ]}
              onPress={() => {
                setType('expense');
                setSelectedCategoryIds([]);
              }}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? colors.primary : colors.text }]}>
                {t('add_tx.type_expense')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === 'income' && { backgroundColor: colors.primarySurface }
              ]}
              onPress={() => {
                setType('income');
                setSelectedCategoryIds([]);
              }}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? colors.primary : colors.text }]}>
                {t('add_tx.type_income')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>
              {currencySymbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('add_tx.amount_placeholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.amountInput, { color: colors.text }]}
            />
          </View>

          {/* Categories Chooser */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('add_tx.select_categories')}
          </Text>

          {groupedCategories.map(group => (
            <View key={group.parent.id} style={styles.groupContainer}>
              {group.parent.id !== -99 && (
                <Text style={[styles.groupTitle, { color: colors.text }]}>
                  {t(group.parent.name_key)}
                </Text>
              )}
              <View style={styles.chipsContainer}>
                {group.children.map(cat => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  const labelName = cat.is_custom === 1 ? cat.name_key : t(cat.name_key);
                  
                  const chipColor = cat.color || '#9E9E9E';
                  let chipBg = 'transparent';
                  let chipBorder = chipColor;
                  
                  if (isSelected) {
                    chipBg = chipColor;
                    chipBorder = chipColor;
                  } else {
                    if (!isDark) {
                      chipBg = chipColor + '12'; // Light mode pastel background
                      chipBorder = chipColor;
                    } else {
                      chipBg = 'transparent';
                      chipBorder = chipColor;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        { borderColor: chipBorder, backgroundColor: chipBg }
                      ]}
                      onPress={() => handleToggleCategory(cat.id)}
                    >
                      <Ionicons
                        name={(cat.icon || 'list') as any}
                        size={14}
                        color={isSelected ? '#FFF' : chipColor}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFF' : colors.text }
                        ]}
                      >
                        {labelName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Note & Date Fields */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.inputRow}>
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('add_tx.note_placeholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.noteInput, { color: colors.text }]}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('add_tx.date_label')}</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                style={[styles.dateInput, { color: colors.text }]}
              />
            </View>

            {/* Relative Date Shortcut Chips */}
            <View style={styles.dateShortcutRow}>
              <TouchableOpacity
                style={[styles.dateShortcutBtn, { backgroundColor: colors.background }]}
                onPress={() => setDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[styles.dateShortcutText, { color: colors.text }]}>{t('common.today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateShortcutBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDate(yesterday.toISOString().split('T')[0]);
                }}
              >
                <Text style={[styles.dateShortcutText, { color: colors.text }]}>{t('common.yesterday')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: colors.textOnPrimary }]}>
              {t('common.save')}
            </Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.expense }]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteBtnText, { color: colors.expense }]}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backBtn: {
    padding: Spacing.one,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 3,
    marginVertical: Spacing.three,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: Spacing.two,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    width: 200,
    textAlign: 'left',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  groupContainer: {
    marginVertical: Spacing.two,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 0.8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    marginTop: Spacing.five,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.two,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 'auto',
  },
  dateInput: {
    fontSize: 15,
    textAlign: 'right',
    width: 120,
  },
  dateShortcutRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingLeft: Spacing.six,
  },
  dateShortcutBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
  },
  dateShortcutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.six,
    marginBottom: Spacing.three,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: Spacing.six,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
