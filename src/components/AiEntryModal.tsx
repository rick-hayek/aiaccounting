import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '@/context/SettingsContext';
import { getCategories, addTransaction, Category } from '@/database/db';
import { parseTransactionWithAi, ParsedTransaction } from '@/utils/ai';
import { Colors, Spacing } from '@/constants/theme';
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
  t
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
          { backgroundColor: isRecording ? '#E91E63' : colors.backgroundSelected }
        ]}
        onPressIn={startSpeech}
        onPressOut={stopSpeech}
      >
        <Ionicons
          name={isRecording ? 'mic' : 'mic-outline'}
          size={32}
          color={isRecording ? '#FFF' : colors.text}
        />
      </TouchableOpacity>
      <Text style={[styles.voiceLabel, { color: colors.text }]}>
        {isRecording ? t('ai.voice_recording') : t('ai.voice_btn')}
      </Text>
    </View>
  );
};

interface AiEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AiEntryModal: React.FC<AiEntryModalProps> = ({ visible, onClose, onSave }) => {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const settings = useSettings();
  const { language, defaultCurrency, aiProvider, aiApiKey, aiApiUrl, aiModel } = settings;

  // UI state
  const [inputText, setInputText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Parsed Result state
  const [parsedResults, setParsedResults] = useState<ParsedTransaction[] | null>(null);

  // Load categories on open
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
      // Reset state
      setInputText('');
      setParsedResults(null);
      setIsRecording(false);
      setIsParsing(false);
    }
  }, [visible]);

  const handleParse = async () => {
    if (!inputText.trim()) {
      return;
    }
    if (!aiApiKey) {
      Alert.alert(t('common.warning'), t('ai.no_key_warning'));
      return;
    }

    setIsParsing(true);
    setParsedResults(null);

    try {
      const result = await parseTransactionWithAi(db, inputText, categories, {
        provider: aiProvider,
        apiKey: aiApiKey,
        apiUrl: aiApiUrl,
        model: aiModel,
        defaultCurrency
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
      onSave();
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  // Find category display name from ID
  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '';
    return cat.is_custom === 1 ? cat.name_key : t(cat.name_key);
  };

  const getCategoryColor = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat?.color || '#9E9E9E';
  };

  const getCategoryIcon = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat?.icon || 'list-outline';
  };

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
            <Text style={[styles.title, { color: colors.text }]}>{t('ai.title')}</Text>
            <View style={{ width: 32 }} /> {/* Spacing spacer */}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.four }}>
            {/* Input Box */}
            <View style={[styles.inputContainer, { borderColor: colors.backgroundSelected }]}>
              <TextInput
                multiline
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('ai.text_placeholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.textInput, { color: colors.text }]}
              />
              {inputText.trim().length > 0 && !isParsing && (
                <TouchableOpacity style={[styles.parseBtn, { backgroundColor: colors.text }]} onPress={handleParse}>
                  <Ionicons name="arrow-forward-outline" size={18} color={colors.background} />
                </TouchableOpacity>
              )}
            </View>

            {/* Hold to Speak Button */}
            {!parsedResults && !isParsing && isSpeechAvailable && (
              <VoiceInputButton
                onResult={setInputText}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                language={language}
                colors={colors}
                t={t}
              />
            )}

            {/* Loading Indicator */}
            {isParsing && (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('ai.processing')}</Text>
              </View>
            )}

            {/* AI Warning if API Key is empty */}
            {!aiApiKey && (
              <View style={[styles.warningBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFEBAA' }]}>
                <Ionicons name="warning" size={18} color="#856404" style={{ marginRight: 8 }} />
                <Text style={[styles.warningText, { color: '#856404' }]}>{t('ai.no_key_warning')}</Text>
              </View>
            )}

            {/* Parsed Result Preview */}
            {parsedResults && parsedResults.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  <Ionicons name="checkbox-outline" size={18} /> {t('ai.parse_success')}
                </Text>
                
                {parsedResults.map((tx, index) => (
                  <View key={index} style={[styles.previewCard, { backgroundColor: colors.backgroundSelected }]}>
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>类型</Text>
                      <Text
                        style={[
                          styles.previewVal,
                          {
                            color: tx.type === 'expense' ? '#FF5722' : '#4CAF50',
                            fontWeight: 'bold'
                          }
                        ]}
                      >
                        {tx.type === 'expense' ? t('add_tx.type_expense') : t('add_tx.type_income')}
                      </Text>
                    </View>

                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>金额</Text>
                      <Text style={[styles.previewVal, { color: colors.text, fontWeight: 'bold' }]}>
                        {getCurrencySymbol(defaultCurrency)}
                        {tx.amount.toFixed(2)}
                      </Text>
                    </View>

                    {tx.note ? (
                      <View style={styles.previewRow}>
                        <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>备注</Text>
                        <Text style={[styles.previewVal, { color: colors.text }]}>{tx.note}</Text>
                      </View>
                    ) : null}

                    <View style={styles.previewRow}>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>日期</Text>
                      <Text style={[styles.previewVal, { color: colors.text }]}>{tx.date}</Text>
                    </View>

                    <View style={[styles.previewRow, { alignItems: 'flex-start' }]}>
                      <Text style={[styles.previewLabel, { color: colors.textSecondary, marginTop: 4 }]}>匹配分类</Text>
                      <View style={styles.previewChips}>
                        {tx.matched_category_ids.length === 0 ? (
                          <Text style={{ color: '#FF5722', fontSize: 13 }}>无匹配分类，保存后将无法统计</Text>
                        ) : (
                          tx.matched_category_ids.map(id => (
                            <View
                              key={id}
                              style={[
                                styles.previewChip,
                                { backgroundColor: getCategoryColor(id) }
                              ]}
                            >
                              <Ionicons
                                name={getCategoryIcon(id) as any}
                                size={12}
                                color="#FFF"
                                style={{ marginRight: 3 }}
                              />
                              <Text style={styles.previewChipText}>{getCategoryName(id)}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {/* Save Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn, { borderColor: colors.backgroundSelected }]}
                    onPress={() => setParsedResults(null)}
                  >
                    <Text style={{ color: colors.text }}>重新输入</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: colors.text }]}
                    onPress={handleSaveParsed}
                  >
                    <Text style={{ color: colors.background }}>确认并保存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    height: '85%',
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
  inputContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    minHeight: 120,
    position: 'relative',
    marginBottom: Spacing.four,
  },
  textInput: {
    fontSize: 15,
    textAlignVertical: 'top',
    height: 80,
  },
  parseBtn: {
    position: 'absolute',
    bottom: Spacing.three,
    right: Spacing.three,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.six,
  },
  voiceButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: Spacing.two,
  },
  loadingWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.five,
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.two,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
  previewContainer: {
    marginTop: Spacing.two,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  previewCard: {
    borderRadius: 14,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
  },
  previewVal: {
    fontSize: 14,
    textAlign: 'right',
  },
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    maxWidth: 200,
    justifyContent: 'flex-end',
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  previewChipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
});
