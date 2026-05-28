import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useSettings } from '@/context/SettingsContext';
import { getCategories, addTransaction, Category } from '@/database/db';
import { parseTransactionWithAi, ParsedTransaction } from '@/utils/ai';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

// Safe dynamic import for expo-speech-recognition to prevent crashes in Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let isSpeechAvailable = false;

try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  isSpeechAvailable = !!ExpoSpeechRecognitionModule;
} catch (e) {
  console.warn('[AI Accounting] expo-speech-recognition native module is not available in Expo Go.');
}

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  language: string;
  colors: any;
  t: any;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onResult,
  isRecording,
  setIsRecording,
  language,
  colors,
  t,
}) => {
  if (!isSpeechAvailable || !useSpeechRecognitionEvent) {
    return null;
  }

  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => setIsRecording(false));
  useSpeechRecognitionEvent('result', (event: any) => {
    const text = event.results[0]?.transcript || '';
    onResult(text);
  });
  useSpeechRecognitionEvent('error', (event: any) => {
    console.error('Speech Recognition error', event.error, event.message);
    setIsRecording(false);
  });

  const startSpeech = async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(t('common.error'), t('ai.stt_error'));
        return;
      }
      onResult('');
      const sttLanguage = language === 'zh' ? 'zh-CN' : 'en-US';
      ExpoSpeechRecognitionModule.start({
        lang: sttLanguage,
        continuous: false,
      });
    } catch (e) {
      console.error('Failed to start speech recognition', e);
      Alert.alert(t('common.error'), t('ai.stt_error'));
    }
  };

  const stopSpeech = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View style={styles.voiceSection}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.voiceButton,
          { backgroundColor: isRecording ? colors.expense : colors.primary },
        ]}
        onPressIn={startSpeech}
        onPressOut={stopSpeech}
      >
        <Ionicons
          name={isRecording ? 'mic' : 'mic-outline'}
          size={36}
          color="#FFF"
        />
      </TouchableOpacity>
      <Text style={[styles.voiceLabel, { color: colors.textSecondary }]}>
        {isRecording ? t('ai.voice_recording') : t('ai.voice_btn')}
      </Text>
    </View>
  );
};

export default function AiScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const colors = useThemeColors();

  const settings = useSettings();
  const { language, defaultCurrency, aiProvider, aiApiKey, aiApiUrl, aiModel } = settings;
  const currencySymbol = getCurrencySymbol(defaultCurrency || 'CNY');

  // UI state
  const [inputText, setInputText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsedResults, setParsedResults] = useState<ParsedTransaction[] | null>(null);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories(db);
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      // Reset form states on focus
      setInputText('');
      setParsedResults(null);
      setIsRecording(false);
      setIsParsing(false);
    }, [loadCategories])
  );

  const handleParse = async (textToParse = inputText) => {
    if (!textToParse.trim()) {
      return;
    }
    if (!aiApiKey) {
      Alert.alert(t('common.warning'), t('ai.no_key_warning'));
      return;
    }

    setIsParsing(true);
    setParsedResults(null);

    try {
      const result = await parseTransactionWithAi(db, textToParse, categories, {
        provider: aiProvider,
        apiKey: aiApiKey,
        apiUrl: aiApiUrl,
        model: aiModel,
        defaultCurrency,
      });

      if (result.success && result.transactions && result.transactions.length > 0) {
        setParsedResults(result.transactions);
      } else {
        Alert.alert(t('common.error'), t('ai.parse_failed'));
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('ai.parse_failed'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveParsed = async () => {
    if (!parsedResults || parsedResults.length === 0) {
      return;
    }

    try {
      for (const tx of parsedResults) {
        if (tx.matched_category_ids.length === 0) {
          Alert.alert(t('common.error'), t('add_tx.empty_category_error'));
          return;
        }
        await addTransaction(db, tx.type, tx.amount, tx.date, tx.note, tx.matched_category_ids);
      }
      Alert.alert(t('common.success'), 'AI Transaction saved successfully!', [
        {
          text: t('common.confirm'),
          onPress: () => {
            router.replace('/');
          },
        },
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  // Preset phrase shortcuts
  const phrases = [
    { text: t('ai.phrase_lunch'), raw: '中午吃了25块钱快餐' },
    { text: t('ai.phrase_taxi'), raw: '打车去机场花了120元' },
    { text: t('ai.phrase_clothes'), raw: '买了一件外套299' },
    { text: t('ai.phrase_salary'), raw: '发工资15000' },
  ];

  const handlePhrasePress = (rawText: string) => {
    setInputText(rawText);
    handleParse(rawText);
  };

  const getCategoryName = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return '';
    return cat.is_custom === 1 ? cat.name_key : t(cat.name_key);
  };

  const getCategoryColor = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.color || '#9E9E9E';
  };

  const getCategoryIcon = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    return (cat?.icon || 'list-outline') as any;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('ai.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Natural Language Box */}
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <TextInput
              multiline
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('ai.text_placeholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.textInput, { color: colors.text }]}
            />
            {inputText.trim().length > 0 && !isParsing && (
              <TouchableOpacity
                style={[styles.parseBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleParse()}
              >
                <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* AI Warning if API Key is empty */}
          {!aiApiKey && (
            <View style={[styles.warningBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.warning }]}>
              <Ionicons name="warning" size={18} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={[styles.warningText, { color: colors.text }]}>{t('ai.no_key_warning')}</Text>
            </View>
          )}

          {/* Loading parsing */}
          {isParsing && (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('ai.processing')}</Text>
            </View>
          )}

          {/* Preset common phrases */}
          {!parsedResults && !isParsing && (
            <View style={styles.phrasesSection}>
              <Text style={[styles.phrasesTitle, { color: colors.textSecondary }]}>
                {t('ai.common_phrases')}
              </Text>
              <View style={styles.phrasesGrid}>
                {phrases.map((phrase, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.phraseChip, { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => handlePhrasePress(phrase.raw)}
                  >
                    <Text style={[styles.phraseText, { color: colors.text }]}>{phrase.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Hold to speak section */}
          {!parsedResults && !isParsing && isSpeechAvailable && (
            <VoiceInputButton
              onResult={(text) => {
                setInputText(text);
                if (text.trim()) handleParse(text);
              }}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              language={language}
              colors={colors}
              t={t}
            />
          )}

          {/* AI Parsing Results Card */}
          {parsedResults && parsedResults.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {t('ai.parsed_title')}
              </Text>

              {parsedResults.map((tx, index) => (
                <View key={index} style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                      {t('common.type')}
                    </Text>
                    <Text
                      style={[
                        styles.previewVal,
                        {
                          color: tx.type === 'expense' ? colors.expense : colors.income,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {tx.type === 'expense' ? t('add_tx.type_expense') : t('add_tx.type_income')}
                    </Text>
                  </View>

                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                      {t('common.amount')}
                    </Text>
                    <Text style={[styles.previewVal, { color: colors.text, fontWeight: '700', fontSize: 16 }]}>
                      {currencySymbol}
                      {tx.amount.toFixed(2)}
                    </Text>
                  </View>

                  {tx.note && (
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                        {t('common.note')}
                      </Text>
                      <Text style={[styles.previewVal, { color: colors.text }]}>{tx.note}</Text>
                    </View>
                  )}

                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                      {t('common.date')}
                    </Text>
                    <Text style={[styles.previewVal, { color: colors.text }]}>{tx.date}</Text>
                  </View>

                  <View style={[styles.previewRow, { alignItems: 'flex-start' }]}>
                    <Text style={[styles.previewLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                      {t('ai.matched_categories')}
                    </Text>
                    <View style={styles.previewChips}>
                      {tx.matched_category_ids.length === 0 ? (
                        <Text style={{ color: colors.expense, fontSize: 13 }}>
                          {t('common.no_match')}
                        </Text>
                      ) : (
                        tx.matched_category_ids.map((id) => (
                          <View
                            key={id}
                            style={[
                              styles.previewChip,
                              { backgroundColor: getCategoryColor(id) + '15' },
                            ]}
                          >
                            <Ionicons
                              name={getCategoryIcon(id)}
                              size={12}
                              color={getCategoryColor(id)}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.previewChipText, { color: getCategoryColor(id) }]}>
                              {getCategoryName(id)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, { borderColor: colors.divider }]}
                  onPress={() => setParsedResults(null)}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.retry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveParsed}
                >
                  <Text style={{ color: colors.textOnPrimary, fontWeight: '600' }}>{t('common.confirm_save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  inputContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.four,
    minHeight: 130,
    position: 'relative',
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    borderWidth: 1,
  },
  textInput: {
    fontSize: 16,
    textAlignVertical: 'top',
    height: 70,
  },
  parseBtn: {
    position: 'absolute',
    bottom: Spacing.three,
    right: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.six,
  },
  voiceButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  loadingWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.five,
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.two,
  },
  phrasesSection: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  phrasesTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  phrasesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  phraseChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
  },
  phraseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewContainer: {
    marginTop: Spacing.two,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  previewCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewVal: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    maxWidth: 220,
    justifyContent: 'flex-end',
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    borderWidth: 1,
  },
});
