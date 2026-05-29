import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { getCategories, addCategory, addTransaction } from '@/database/db';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

interface ImportItem {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  date: string;
  note: string;
  categories: string[];
}

export default function ImportScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const { defaultCurrency } = useSettings();
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedItems, setParsedItems] = useState<ImportItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. File picker trigger
  const handleFilePick = async () => {
    try {
      setPicking(true);
      setErrorMsg('');
      setParsedItems([]);
      setFileName('');

      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv', 'application/json'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setFileName(file.name);

        const response = await fetch(file.uri);
        const text = await response.text();

        const isJson = file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[');
        if (isJson) {
          parseJsonContent(text);
        } else {
          parseCsvContent(text);
        }
      }
    } catch (e) {
      console.error('File pick or read error:', e);
      setErrorMsg(t('settings.import_error'));
    } finally {
      setPicking(false);
    }
  };

  // 2. JSON Parser
  const parseJsonContent = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON root is not an array');
      }

      const items: ImportItem[] = parsed.map((item: any, idx) => {
        const type = item.type === 'income' ? 'income' : 'expense';
        const amount = Math.abs(parseFloat(item.amount)) || 0;
        const note = item.note ? String(item.note) : '';
        const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : new Date().toISOString().split('T')[0];

        const categories: string[] = [];
        if (Array.isArray(item.categories)) {
          item.categories.forEach((c: any) => categories.push(String(c).trim()));
        } else if (item.category) {
          categories.push(String(item.category).trim());
        }

        return {
          id: idx,
          type,
          amount,
          date,
          note,
          categories: categories.filter(Boolean),
        };
      });

      setParsedItems(items);
    } catch (e) {
      console.error('JSON parse error:', e);
      setErrorMsg(t('settings.import_error'));
    }
  };

  // 3. CSV Parser Helpers
  const parseCsvLines = (text: string) => {
    const lines = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF
        }
        row.push(currentValue.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (currentValue !== '' || row.length > 0) {
      row.push(currentValue.trim());
      lines.push(row);
    }
    return lines;
  };

  const parseCsvContent = (text: string) => {
    try {
      const rows = parseCsvLines(text);
      if (rows.length < 1) {
        throw new Error('CSV is empty');
      }

      // Detect header row mapping
      const firstRow = rows[0].map(h => h.toLowerCase());
      let dateIdx = 0;
      let typeIdx = 1;
      let amountIdx = 2;
      let catIdx = 3;
      let noteIdx = 4;

      const hasHeader = firstRow.some(h =>
        h.includes('date') || h.includes('type') || h.includes('amount') || h.includes('category') || h.includes('note')
      );

      let dataRows = rows;
      if (hasHeader) {
        dataRows = rows.slice(1);
        dateIdx = firstRow.findIndex(h => h.includes('date'));
        typeIdx = firstRow.findIndex(h => h.includes('type'));
        amountIdx = firstRow.findIndex(h => h.includes('amount'));
        catIdx = firstRow.findIndex(h => h.includes('category') || h.includes('cat'));
        noteIdx = firstRow.findIndex(h => h.includes('note'));

        // Fallbacks
        if (dateIdx === -1) dateIdx = 0;
        if (typeIdx === -1) typeIdx = 1;
        if (amountIdx === -1) amountIdx = 2;
        if (catIdx === -1) catIdx = 3;
        if (noteIdx === -1) noteIdx = 4;
      }

      const items: ImportItem[] = dataRows.map((row, idx) => {
        const rawDate = row[dateIdx] || '';
        const rawType = (row[typeIdx] || 'expense').toLowerCase();
        const type = rawType.includes('income') ? 'income' : 'expense';
        const amount = Math.abs(parseFloat(row[amountIdx])) || 0;
        const note = row[noteIdx] || '';
        const rawCats = row[catIdx] || '';
        
        const categories = rawCats
          ? rawCats.split(/[;/]/).map(c => c.trim()).filter(Boolean)
          : [];

        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
          ? rawDate
          : new Date().toISOString().split('T')[0];

        return {
          id: idx,
          type,
          amount,
          date,
          note,
          categories,
        };
      });

      setParsedItems(items);
    } catch (e) {
      console.error('CSV parse error:', e);
      setErrorMsg(t('settings.import_error'));
    }
  };

  // 4. Save to SQLite database
  const handleImportConfirm = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);

    try {
      // Load current categories
      const existingCats = await getCategories(db);

      // Build mapping for category lookup
      const categoryMap: Record<string, number> = {};
      existingCats.forEach(c => {
        // Map localized name key and custom category names
        const translatedName = c.is_custom === 0 ? t(c.name_key).toLowerCase() : c.name_key.toLowerCase();
        categoryMap[translatedName] = c.id;
        categoryMap[c.name_key.toLowerCase()] = c.id;
      });

      for (const item of parsedItems) {
        const categoryIds: number[] = [];

        for (const catName of item.categories) {
          const normName = catName.toLowerCase().trim();
          let catId = categoryMap[normName];

          if (!catId) {
            // Category doesn't exist, create it as user custom category
            const newId = await addCategory(db, catName.trim(), item.type, 'cash-outline', '#9CA3AF', null);
            catId = newId;
            categoryMap[normName] = catId;
          }
          categoryIds.push(catId);
        }

        // Save transaction record to SQLite
        await addTransaction(db, item.type, item.amount, item.date, item.note, categoryIds);
      }

      Alert.alert(t('common.success'), t('settings.import_success', { count: parsedItems.length }));
      router.back();
    } catch (e) {
      console.error('Database import error:', e);
      Alert.alert(t('common.error'), t('settings.import_error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Title Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.import_title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Picker Trigger */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.import_select_file')}
        </Text>
        <TouchableOpacity
          style={[styles.pickerArea, { borderColor: colors.primary, backgroundColor: colors.surfaceElevated }]}
          onPress={handleFilePick}
          disabled={picking || importing}
          activeOpacity={0.8}
        >
          {picking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} style={{ marginBottom: Spacing.one }} />
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {fileName ? t('settings.import_file_selected', { name: fileName }) : t('settings.import_select_file')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {errorMsg !== '' && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Preview Area */}
        {parsedItems.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
              {t('settings.import_preview')} ({parsedItems.length})
            </Text>
            <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <ScrollView nestedScrollEnabled style={styles.previewScroll}>
                {parsedItems.slice(0, 50).map((item) => (
                  <View key={item.id} style={[styles.previewRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.previewRowTop}>
                      <Text style={[styles.previewDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text
                        style={[
                          styles.previewAmount,
                          { color: item.type === 'expense' ? colors.expense : colors.income }
                        ]}
                      >
                        {item.type === 'expense' ? '-' : '+'}{currencySymbol}{item.amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.previewRowBot}>
                      <Text style={[styles.previewNote, { color: colors.text }]} numberOfLines={1}>
                        {item.note || '-'}
                      </Text>
                      <View style={styles.previewCats}>
                        {item.categories.map((cat, ci) => (
                          <View key={ci} style={[styles.catTag, { backgroundColor: colors.primarySurface }]}>
                            <Text style={[styles.catTagText, { color: colors.primary }]}>{cat}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
                {parsedItems.length > 50 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    ... and {parsedItems.length - 50} more items
                  </Text>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* Confirm Import Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.primary },
            (parsedItems.length === 0 || importing) && { opacity: 0.5 }
          ]}
          onPress={handleImportConfirm}
          disabled={parsedItems.length === 0 || importing}
          activeOpacity={0.8}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.textOnPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { color: colors.textOnPrimary }]}>
                {t('settings.import_confirm')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    paddingLeft: Spacing.one,
    letterSpacing: 0.5,
  },
  pickerArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.two,
    paddingLeft: Spacing.one,
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 300,
    overflow: 'hidden',
  },
  previewScroll: {
    flex: 1,
  },
  previewRow: {
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  previewRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 12,
  },
  previewAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewRowBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewNote: {
    fontSize: 13,
    flex: 1,
    marginRight: Spacing.three,
  },
  previewCats: {
    flexDirection: 'row',
    gap: 4,
  },
  catTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  catTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
