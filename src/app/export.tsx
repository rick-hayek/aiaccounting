import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { getTransactions, Transaction } from '@/database/db';
import { BorderRadius, Spacing } from '@/constants/theme';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type ExportFormat = 'csv' | 'json';

export default function ExportScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataText, setDataText] = useState('');
  const [previewText, setPreviewText] = useState('');

  // 1. Fetch transactions from database
  const loadTransactions = useCallback(async () => {
    try {
      // Fetch up to 100,000 transactions for a complete export
      const list = await getTransactions(db, 100000, 0);
      setTransactions(list);
    } catch (e) {
      console.error('Failed to load transactions for export:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 2. Format CSV
  const generateCsv = useCallback((list: Transaction[]) => {
    const headers = 'Date,Type,Amount,Category,Note';
    const rows = list.map(tx => {
      const categoriesStr = tx.categories
        ? tx.categories.map(c => (c.is_custom === 1 ? c.name_key : t(c.name_key))).join('; ')
        : '';
      const noteStr = tx.note || '';

      const date = tx.date;
      const type = tx.type;
      const amount = tx.amount.toFixed(2);
      
      // Escape columns containing commas, quotes or semicolons
      const catEscaped = categoriesStr.includes(';') || categoriesStr.includes(',') || categoriesStr.includes('"')
        ? `"${categoriesStr.replace(/"/g, '""')}"`
        : categoriesStr;
      const noteEscaped = noteStr.includes(',') || noteStr.includes('"') || noteStr.includes('\n')
        ? `"${noteStr.replace(/"/g, '""')}"`
        : noteStr;

      return `${date},${type},${amount},${catEscaped},${noteEscaped}`;
    });
    return [headers, ...rows].join('\n');
  }, [t]);

  // 3. Format JSON
  const generateJson = useCallback((list: Transaction[]) => {
    const exportList = list.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      note: tx.note,
      categories: tx.categories
        ? tx.categories.map(c => (c.is_custom === 1 ? c.name_key : t(c.name_key)))
        : [],
      created_at: tx.created_at
    }));
    return JSON.stringify(exportList, null, 2);
  }, [t]);

  // Update data texts when format or transactions update
  useEffect(() => {
    if (transactions.length === 0) {
      setDataText('');
      setPreviewText(t('settings.export_empty'));
      return;
    }

    let text = '';
    if (format === 'csv') {
      text = generateCsv(transactions);
    } else {
      text = generateJson(transactions);
    }
    setDataText(text);

    // Create 20 lines preview
    const lines = text.split('\n');
    const firstLines = lines.slice(0, 20).join('\n');
    const suffix = lines.length > 20 ? '\n...' : '';
    setPreviewText(firstLines + suffix);
  }, [format, transactions, generateCsv, generateJson, t]);

  // 4. Handle Export Trigger
  const handleExportShare = async () => {
    if (transactions.length === 0) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const blob = new Blob([dataText], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aia_export_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const filename = `aia_export_${new Date().toISOString().split('T')[0]}.${format}`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        await FileSystem.writeAsStringAsync(fileUri, dataText, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'csv' ? 'text/csv' : 'application/json',
            dialogTitle: `AIAccounting Export (${format.toUpperCase()})`,
            UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
          });
        } else {
          await Share.share({
            message: dataText,
            title: `AIAccounting Export (${format.toUpperCase()})`,
          });
        }
      }
    } catch (e) {
      console.error('Export failed:', e);
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
      {/* Pinned Title Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.export_title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Format Selector */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.export_format')}
        </Text>
        <View style={[styles.formatSelector, { backgroundColor: colors.surfaceElevated, borderColor: colors.divider }]}>
          {(['csv', 'json'] as ExportFormat[]).map((f) => {
            const isActive = format === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.formatBtn,
                  isActive && { backgroundColor: colors.primary }
                ]}
                onPress={() => setFormat(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.formatBtnText,
                    { color: isActive ? colors.textOnPrimary : colors.textSecondary }
                  ]}
                >
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preview Area */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.export_preview')}
        </Text>
        <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <ScrollView nestedScrollEnabled style={styles.previewScroll}>
            <Text style={[styles.previewText, { color: colors.text }]}>
              {previewText}
            </Text>
          </ScrollView>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn, 
            { backgroundColor: colors.primary },
            transactions.length === 0 && { opacity: 0.5 }
          ]}
          onPress={handleExportShare}
          disabled={transactions.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={20} color={colors.textOnPrimary} style={{ marginRight: 8 }} />
          <Text style={[styles.actionBtnText, { color: colors.textOnPrimary }]}>
            {t('settings.export_share')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  formatSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    height: 250,
  },
  previewScroll: {
    flex: 1,
  },
  previewText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
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
