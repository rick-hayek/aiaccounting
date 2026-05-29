import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';

import { useSettings } from '@/context/SettingsContext';
import { getCategories, addCategory, deleteCategory, Category } from '@/database/db';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SettingsRow } from '@/components/SettingsRow';
import { BorderRadius, Spacing } from '@/constants/theme';

const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  CNY: { CNY: 1.0, USD: 0.14, EUR: 0.13, GBP: 0.11 },
  USD: { CNY: 7.15, USD: 1.0, EUR: 0.92, GBP: 0.79 },
  EUR: { CNY: 7.75, USD: 1.09, EUR: 1.0, GBP: 0.86 },
  GBP: { CNY: 9.05, USD: 1.27, EUR: 1.16, GBP: 1.0 }
};

const PRESET_COLORS = [
  '#FF5722', '#E91E63', '#9C27B0', '#3F51B5',
  '#03A9F4', '#009688', '#8BC34A', '#FFC107',
  '#795548', '#607D8B', '#E040FB', '#00E676'
];

const PRESET_ICONS = [
  'fast-food-outline', 'car-outline', 'basket-outline', 'play-outline',
  'business-outline', 'water-outline', 'phone-portrait-outline', 'tv-outline',
  'people-outline', 'book-outline', 'shirt-outline', 'airplane-outline',
  'cash-outline', 'trending-up-outline', 'gift-outline', 'card-outline',
  'home-outline', 'shield-checkmark-outline', 'medical-outline', 'construct-outline'
];

interface SettingsScreenProps {
  isActive?: boolean;
}

export default function SettingsScreen({ isActive }: SettingsScreenProps) {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const colors = useThemeColors();

  const {
    language,
    defaultCurrency,
    aiProvider,
    aiApiKey,
    aiApiUrl,
    aiModel,
    themeMode,
    themeColor,
    customThemeColor,
    loading: settingsLoading,
    updateAppSetting
  } = useSettings();

  const colorScheme = useColorScheme();
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  // Custom Categories list
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);

  // Modals visibility
  const [aiModalVisible, setAiModalVisible] = useState<boolean>(false);
  const [catModalVisible, setCatModalVisible] = useState<boolean>(false);
  const [themeColorModalVisible, setThemeColorModalVisible] = useState<boolean>(false);

  // Custom Category Form state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatParentId, setNewCatParentId] = useState<number | null>(null);
  const [newCatIcon, setNewCatIcon] = useState<string>(PRESET_ICONS[0]);
  const [newCatColor, setNewCatColor] = useState<string>(PRESET_COLORS[0]);

  // AI Form states
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [tempApiUrl, setTempApiUrl] = useState<string>('');
  const [tempModel, setTempModel] = useState<string>('');
  const [tempProvider, setTempProvider] = useState<string>('');

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories(db);
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setCategoriesLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isActive !== false) {
        loadCategories();
      }
    }, [loadCategories, isActive])
  );

  useEffect(() => {
    if (isActive) {
      loadCategories();
    }
  }, [isActive, loadCategories]);

  // Sync AI states when opening modal
  const openAiModal = () => {
    setTempApiKey(aiApiKey || '');
    setTempApiUrl(aiApiUrl || '');
    setTempModel(aiModel || '');
    setTempProvider(aiProvider || 'openai');
    setAiModalVisible(true);
  };

  const handleSaveAiSettings = async () => {
    try {
      await updateAppSetting('ai_api_key', tempApiKey);
      await updateAppSetting('ai_api_url', tempApiUrl);
      await updateAppSetting('ai_model', tempModel);
      await updateAppSetting('ai_provider', tempProvider);
      setAiModalVisible(false);
      Alert.alert(t('common.success'), t('settings.settings_saved'));
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to save settings');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert(t('common.error'), 'Category name cannot be empty');
      return;
    }
    try {
      await addCategory(db, newCatName.trim(), newCatType, newCatIcon, newCatColor, newCatParentId);
      setNewCatName('');
      setCatModalVisible(false);
      loadCategories();
      Alert.alert(t('common.success'), 'Category added successfully');
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to add category');
    }
  };

  const handleDeleteCategory = (id: number) => {
    Alert.alert(
      t('common.warning'),
      'Are you sure you want to delete this category?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(db, id);
              loadCategories();
            } catch (e) {
              Alert.alert(t('common.error'), 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  // Cycle Currencies: CNY -> USD -> EUR -> GBP -> CNY
  const cycleCurrency = async () => {
    const currencies = ['CNY', 'USD', 'EUR', 'GBP'];
    const prevCurr = defaultCurrency || 'CNY';
    const currentIndex = currencies.indexOf(prevCurr);
    const nextIndex = (currentIndex + 1) % currencies.length;
    const nextCurr = currencies[nextIndex];

    try {
      await updateAppSetting('default_currency', nextCurr);
    } catch (e) {
      console.error('Failed to update currency setting', e);
      Alert.alert(t('common.error'), 'Failed to update currency setting');
    }
  };

  // Toggle language zh/en
  const toggleLanguage = async () => {
    const nextLang = language === 'zh' ? 'en' : 'zh';
    await updateAppSetting('language', nextLang);
  };

  // Purge data
  const handleClearData = () => {
    Alert.alert(
      t('common.warning'),
      t('settings.clear_data_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM transaction_categories');
              await db.runAsync('DELETE FROM transactions');
              Alert.alert(t('common.success'), 'All transactions cleared');
            } catch (e) {
              Alert.alert(t('common.error'), 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    router.push('/export' as any);
  };

  // Mask API key: sk-...xxxx
  const maskKey = (key: string) => {
    if (!key) return 'None';
    if (key.length <= 8) return '••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  // Parent Categories based on selected category type in modal
  const parentCategories = categories.filter(c => c.parent_id === null && c.type === newCatType);

  if (settingsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Section 1: Account & Preferences */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.section_account')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <SettingsRow
            iconName="globe-outline"
            label={t('settings.language')}
            value={language === 'zh' ? '中文' : 'English'}
            onPress={toggleLanguage}
            showDivider={true}
          />
          <SettingsRow
            iconName="wallet-outline"
            label={t('settings.currency')}
            value={defaultCurrency || 'CNY'}
            onPress={cycleCurrency}
            showDivider={false}
          />
        </View>

        {/* Section 2: Appearance */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.section_appearance')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <SettingsRow
            iconName="moon-outline"
            label={t('settings.dark_mode')}
            showChevron={false}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={(val) => updateAppSetting('theme_mode', val ? 'dark' : 'light')}
                trackColor={{ true: colors.primary, false: colors.divider }}
                thumbColor={Platform.OS === 'android' ? (isDark ? colors.primary : '#f4f3f4') : undefined}
              />
            }
            showDivider={true}
          />
          <SettingsRow
            iconName="color-palette-outline"
            label={t('settings.theme_color')}
            onPress={() => setThemeColorModalVisible(true)}
            showChevron={true}
            showDivider={false}
            rightElement={
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: colors.primary,
                  marginRight: 6,
                  borderWidth: 1.5,
                  borderColor: colors.divider,
                }}
              />
            }
          />
        </View>

        {/* Section 3: AI Configuration */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.section_ai')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <SettingsRow
            iconName="cube-outline"
            label={t('settings.ai_provider')}
            value={aiProvider || 'openai'}
            onPress={openAiModal}
            showDivider={false}
          />
        </View>

        {/* Section 3: Data Management */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          {t('settings.section_data')}
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <SettingsRow
            iconName="cloud-upload-outline"
            label={t('settings.import_data')}
            value="CSV / JSON"
            onPress={() => router.push('/import' as any)}
            showDivider={true}
          />
          <SettingsRow
            iconName="download-outline"
            label={t('settings.export_data')}
            value="CSV / JSON"
            onPress={handleExportData}
            showDivider={false}
          />
        </View>

        {/* Section 4: Category Management */}
        <View style={styles.categorySectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginBottom: 0 }]}>
            {t('settings.section_category')}
          </Text>
          <TouchableOpacity style={styles.addCategoryHeaderBtn} onPress={() => setCatModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.four }} />
          ) : categories.filter(c => c.is_custom === 1).length === 0 ? (
            <Text style={[styles.noCustomCatText, { color: colors.textSecondary }]}>
              {t('settings.no_custom_categories')}
            </Text>
          ) : (
            categories.filter(c => c.is_custom === 1).map((cat, idx, arr) => (
              <View key={cat.id}>
                <View style={styles.customCatItem}>
                  <View style={styles.catLeftInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: cat.color || '#9E9E9E' }]}>
                      <Ionicons name={(cat.icon || 'list-outline') as any} size={16} color="#FFF" />
                    </View>
                    <View>
                      <Text style={[styles.catName, { color: colors.text }]}>{cat.name_key}</Text>
                      <Text style={[styles.catSubName, { color: colors.textSecondary }]}>
                        {cat.type === 'expense' ? t('add_tx.type_expense') : t('add_tx.type_income')} | {t('settings.category_parent')}: {cat.parent_name_key ? t(cat.parent_name_key) : 'None'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
                {idx < arr.length - 1 && <View style={[styles.innerDivider, { backgroundColor: colors.divider }]} />}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- AI Config Bottom Sheet Modal --- */}
      <Modal animationType="slide" transparent={true} visible={aiModalVisible} onRequestClose={() => setAiModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.ai_config')}</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Provider Selection */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.ai_provider')}</Text>
              <View style={styles.optionContainerSmall}>
                {['openai', 'deepseek', 'custom'].map((prov) => {
                  const isSel = tempProvider === prov;
                  return (
                    <TouchableOpacity
                      key={prov}
                      style={[
                        styles.optionBtn,
                        isSel
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceElevated, borderColor: colors.divider },
                      ]}
                      onPress={() => {
                        setTempProvider(prov);
                        if (prov === 'openai') {
                          setTempApiUrl('https://api.openai.com/v1');
                          setTempModel('gpt-4o-mini');
                        } else if (prov === 'deepseek') {
                          setTempApiUrl('https://api.deepseek.com/v1');
                          setTempModel('deepseek-chat');
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSel ? colors.textOnPrimary : colors.text,
                            textTransform: 'capitalize',
                          },
                        ]}
                      >
                        {prov}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* API Key */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.ai_key')}</Text>
              <TextInput
                secureTextEntry
                value={tempApiKey}
                onChangeText={setTempApiKey}
                placeholder={t('settings.placeholder_key')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.surfaceElevated }]}
              />

              {/* Base URL */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.ai_url')}</Text>
              <TextInput
                value={tempApiUrl}
                onChangeText={setTempApiUrl}
                placeholder={t('settings.placeholder_url')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.surfaceElevated }]}
              />

              {/* Model */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.ai_model')}</Text>
              <TextInput
                value={tempModel}
                onChangeText={setTempModel}
                placeholder="Model Name"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.surfaceElevated }]}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAiSettings}
              >
                <Text style={[styles.primaryBtnText, { color: colors.textOnPrimary }]}>
                  {t('settings.save_settings')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- Theme Color Bottom Sheet Modal --- */}
      <Modal animationType="slide" transparent={true} visible={themeColorModalVisible} onRequestClose={() => setThemeColorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.theme_color')}</Text>
              <TouchableOpacity onPress={() => setThemeColorModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: Spacing.two }}>
               {[
                { key: 'green', label: t('settings.grass_green'), color: '#66AA22' },
                { key: 'sage', label: t('settings.sage_green'), color: '#527954' },
                { key: 'blue', label: t('settings.slate_blue'), color: '#4A6D8C' },
                { key: 'skyblue', label: t('settings.sky_blue'), color: '#70C4FF' },
                { key: 'gold', label: t('settings.sand_gold'), color: '#8C7355' },
                { key: 'black', label: t('settings.charcoal_black'), color: '#1A1A1A' },
                { key: 'red', label: t('settings.berry_red'), color: '#B34766' },
                { key: 'purple', label: t('settings.aurora_purple'), color: '#6366F1' },
                { key: 'custom', label: t('settings.custom_theme') || '自定义色', color: customThemeColor },
              ].map((themeOpt) => {
                const isSelected = themeColor === themeOpt.key;
                return (
                  <TouchableOpacity
                    key={themeOpt.key}
                    style={[
                      styles.themeOptionRow,
                      { borderColor: colors.divider }
                    ]}
                    onPress={async () => {
                      await updateAppSetting('theme_color', themeOpt.key);
                      if (themeOpt.key !== 'custom') {
                        setThemeColorModalVisible(false);
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: themeOpt.color,
                          marginRight: Spacing.three,
                          borderWidth: 1.5,
                          borderColor: colors.divider,
                        }}
                      />
                      <Text style={[styles.themeOptionLabel, { color: colors.text, fontWeight: isSelected ? '600' : '400' }]}>
                        {themeOpt.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Custom Color Input Editor */}
              {themeColor === 'custom' && (
                <View style={styles.customColorInputContainer}>
                  <Text style={[styles.customColorInputLabel, { color: colors.textSecondary }]}>
                    {t('settings.custom_color_hex') || '自定义色值 (HEX)'}
                  </Text>
                  <View style={styles.customColorInputRow}>
                    <View style={[styles.customColorPreview, { backgroundColor: customThemeColor }]} />
                    <TextInput
                      value={customThemeColor}
                      onChangeText={async (val) => {
                        if (val.startsWith('#') && val.length <= 7) {
                          await updateAppSetting('custom_theme_color', val);
                        } else if (!val.startsWith('#') && val.length <= 6) {
                          await updateAppSetting('custom_theme_color', '#' + val);
                        }
                      }}
                      placeholder="#6366F1"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.customColorInput, { color: colors.text, borderColor: colors.divider }]}
                      maxLength={7}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.swatchesRow}>
                    {['#FF5722', '#E91E63', '#9C27B0', '#3F51B5', '#03A9F4', '#009688', '#FFC107', '#E040FB'].map((swatch) => (
                      <TouchableOpacity
                        key={swatch}
                        style={[styles.swatchCircle, { backgroundColor: swatch }]}
                        onPress={async () => {
                          await updateAppSetting('custom_theme_color', swatch);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Add Category Modal --- */}
      <Modal animationType="slide" transparent={true} visible={catModalVisible} onRequestClose={() => setCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.add_category')}</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Name */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.category_name')}</Text>
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="如：猫粮、下午茶"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.surfaceElevated }]}
              />

              {/* Category Type */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.category_type')}</Text>
              <View style={styles.optionContainerSmall}>
                {(['expense', 'income'] as const).map((type) => {
                  const isSel = newCatType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionBtn,
                        isSel
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceElevated, borderColor: colors.divider },
                      ]}
                      onPress={() => {
                        setNewCatType(type);
                        setNewCatParentId(null); // reset parent
                      }}
                    >
                      <Text style={[styles.optionText, { color: isSel ? colors.textOnPrimary : colors.text }]}>
                        {type === 'expense' ? t('add_tx.type_expense') : t('add_tx.type_income')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Parent Category Choice */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.category_parent')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentSlider}>
                <TouchableOpacity
                  style={[
                    styles.parentSelectBtn,
                    newCatParentId === null
                      ? { backgroundColor: colors.primarySurface, borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceElevated, borderColor: colors.divider },
                  ]}
                  onPress={() => setNewCatParentId(null)}
                >
                  <Text style={{ color: newCatParentId === null ? colors.primary : colors.text, fontSize: 13, fontWeight: '500' }}>
                    None
                  </Text>
                </TouchableOpacity>
                {parentCategories.map((p) => {
                  const isSel = newCatParentId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.parentSelectBtn,
                        isSel
                          ? { backgroundColor: colors.primarySurface, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceElevated, borderColor: colors.divider },
                      ]}
                      onPress={() => setNewCatParentId(p.id)}
                    >
                      <Text style={{ color: isSel ? colors.primary : colors.text, fontSize: 13, fontWeight: '500' }}>
                        {t(p.name_key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Icon Choice */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.category_icon')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionSlider}>
                {PRESET_ICONS.map((ic) => {
                  const isSel = newCatIcon === ic;
                  return (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        styles.iconCircleItem,
                        { backgroundColor: colors.surfaceElevated },
                        isSel && { borderWidth: 2, borderColor: colors.primary },
                      ]}
                      onPress={() => setNewCatIcon(ic)}
                    >
                      <Ionicons name={ic as any} size={18} color={isSel ? colors.primary : colors.text} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Color Choice */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('settings.category_color')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionSlider}>
                {PRESET_COLORS.map((col) => {
                  const isSel = newCatColor === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[
                        styles.colorCircleItem,
                        { backgroundColor: col },
                        isSel && { borderWidth: 3, borderColor: colors.surface },
                      ]}
                      onPress={() => setNewCatColor(col)}
                    />
                  );
                })}
              </ScrollView>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.divider }]}
                  onPress={() => setCatModalVisible(false)}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddCategory}
                >
                  <Text style={{ color: colors.textOnPrimary, fontWeight: '600' }}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    paddingLeft: Spacing.two,
    letterSpacing: 0.5,
  },
  categorySectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  addCategoryHeaderBtn: {
    paddingRight: Spacing.two,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  noCustomCatText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.five,
    fontSize: 14,
  },
  customCatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  catLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
  },
  catSubName: {
    fontSize: 11,
    marginTop: 2,
  },
  innerDivider: {
    height: 1,
    marginLeft: 34 + Spacing.three * 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  optionContainerSmall: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  parentSlider: {
    marginVertical: Spacing.one,
    flexDirection: 'row',
  },
  parentSelectBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionSlider: {
    marginVertical: Spacing.one,
  },
  iconCircleItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  colorCircleItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  primaryBtn: {
    height: 46,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeOptionLabel: {
    fontSize: 16,
  },
  customColorInputContainer: {
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  customColorInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  customColorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  customColorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  customColorInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  swatchCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
});
