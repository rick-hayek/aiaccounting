import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { getCategories, addTransaction, updateTransaction, Category, Transaction } from '@/database/db';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getCurrencySymbol } from '@/utils/currency';

interface ManualAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  defaultCurrency: string;
  editTransactionId: number | null; // Pass ID if editing, otherwise null for new
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  visible,
  onClose,
  onSave,
  defaultCurrency,
  editTransactionId
}) => {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const themeColors = useThemeColors();
  const colors = {
    ...themeColors,
    backgroundElement: themeColors.surfaceElevated,
    backgroundSelected: themeColors.primarySurface,
  };

  // Forms state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);

  // Load all categories on open
  useEffect(() => {
    if (visible) {
      const loadCats = async () => {
        try {
          const data = await getCategories(db);
          setCategories(data);
        } catch (e) {
          console.error(e);
        }
      };
      loadCats();
    }
  }, [visible]);

  // Load transaction details if editing
  useEffect(() => {
    if (visible && editTransactionId) {
      const loadTx = async () => {
        try {
          // Fetch transaction using getTransactions
          const rows = await db.getAllAsync<any>(
            `SELECT * FROM transactions WHERE id = ?`,
            editTransactionId
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
              editTransactionId
            );
            setSelectedCategoryIds(catRows.map(c => c.category_id));
          }
        } catch (e) {
          console.error('Failed to load transaction for editing', e);
        }
      };
      loadTx();
    } else if (visible && !editTransactionId) {
      // Reset form for new transaction
      setType('expense');
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedCategoryIds([]);
    }
  }, [visible, editTransactionId]);

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
      Alert.alert(t('common.error'), '日期格式错误，请使用 YYYY-MM-DD');
      return;
    }

    try {
      if (editTransactionId) {
        await updateTransaction(db, editTransactionId, type, floatAmount, date, note || null, selectedCategoryIds);
      } else {
        await addTransaction(db, type, floatAmount, date, note || null, selectedCategoryIds);
      }
      onSave();
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  // Group child categories by their parent category
  const getGroupedCategories = () => {
    const parents = categories.filter(c => c.parent_id === null && c.type === type);
    const result: { parent: Category; children: Category[] }[] = [];

    for (const parent of parents) {
      const children = categories.filter(c => c.parent_id === parent.id);
      result.push({ parent, children });
    }

    // Include parentless categories (excluding the root parent categories themselves)
    const orphans = categories.filter(c => c.parent_id === null && c.is_custom === 1 && c.type === type);
    if (orphans.length > 0) {
      // Create a virtual group for other categories
      result.push({
        parent: { id: -99, name_key: 'Other', type, icon: 'list', color: '#9E9E9E', is_custom: 0, parent_id: null },
        children: orphans
      });
    }

    return result;
  };

  const groupedCategories = getGroupedCategories();

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.content, { backgroundColor: colors.backgroundElement }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {editTransactionId ? t('add_tx.title_edit') : t('add_tx.title_add')}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
              <Text style={[styles.saveText, { color: colors.text }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Expense / Income Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  type === 'expense' && { backgroundColor: colors.backgroundSelected }
                ]}
                onPress={() => {
                  setType('expense');
                  setSelectedCategoryIds([]);
                }}
              >
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('add_tx.type_expense')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  type === 'income' && { backgroundColor: colors.backgroundSelected }
                ]}
                onPress={() => {
                  setType('income');
                  setSelectedCategoryIds([]);
                }}
              >
                <Text style={[styles.toggleText, { color: colors.text }]}>{t('add_tx.type_income')}</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.amountContainer}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>
                {getCurrencySymbol(defaultCurrency)}
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
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chip,
                          { borderColor: cat.color || '#9E9E9E' },
                          isSelected && { backgroundColor: cat.color || '#9E9E9E' }
                        ]}
                        onPress={() => handleToggleCategory(cat.id)}
                      >
                        <Ionicons
                          name={(cat.icon || 'list') as any}
                          size={14}
                          color={isSelected ? '#FFF' : (cat.color || '#9E9E9E')}
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
            <View style={[styles.card, { backgroundColor: colors.backgroundSelected }]}>
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

              <View style={styles.divider} />

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
                  style={[styles.dateShortcutBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => setDate(new Date().toISOString().split('T')[0])}
                >
                  <Text style={[styles.dateShortcutText, { color: colors.text }]}>{t('common.today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateShortcutBtn, { backgroundColor: colors.backgroundElement }]}
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveHeaderBtn: {
    padding: Spacing.one,
  },
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 3,
    marginBottom: Spacing.four,
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
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
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
    backgroundColor: 'rgba(0,0,0,0.1)',
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
});
