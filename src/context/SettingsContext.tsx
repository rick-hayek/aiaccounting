import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import i18n from '@/i18n';
import { getSettings, updateSetting } from '@/database/db';

export interface SettingsContextType {
  language: string;
  defaultCurrency: string;
  aiProvider: string;
  aiApiKey: string;
  aiApiUrl: string;
  aiModel: string;
  themeMode: string;
  themeColor: string;
  customThemeColor: string;
  loading: boolean;
  updateAppSetting: (key: string, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();
  
  const [language, setLanguage] = useState<string>('en');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');
  const [aiProvider, setAiProvider] = useState<string>(process.env.EXPO_PUBLIC_AI_PROVIDER || 'openai');
  const [aiApiKey, setAiApiKey] = useState<string>(process.env.EXPO_PUBLIC_AI_API_KEY || '');
  const [aiApiUrl, setAiApiUrl] = useState<string>(process.env.EXPO_PUBLIC_AI_API_URL || 'https://api.openai.com/v1');
  const [aiModel, setAiModel] = useState<string>(process.env.EXPO_PUBLIC_AI_MODEL || 'gpt-4o-mini');
  const [themeMode, setThemeMode] = useState<string>('system');
  const [themeColor, setThemeColor] = useState<string>('green');
  const [customThemeColor, setCustomThemeColor] = useState<string>('#6366F1');
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSettings = async () => {
    try {
      const data = await getSettings(db);
      
      if (data.language) {
        setLanguage(data.language);
        if (i18n.language !== data.language) {
          i18n.changeLanguage(data.language);
        }
      }
      if (data.default_currency) {
        setDefaultCurrency(data.default_currency);
      }
      if (data.ai_provider) {
        setAiProvider(data.ai_provider);
      }
      if (data.ai_api_key) {
        setAiApiKey(data.ai_api_key);
      }
      if (data.ai_api_url) {
        setAiApiUrl(data.ai_api_url);
      }
      if (data.ai_model) {
        setAiModel(data.ai_model);
      }
      if (data.theme_mode) {
        setThemeMode(data.theme_mode);
      }
      if (data.theme_color) {
        setThemeColor(data.theme_color);
      }
      if (data.custom_theme_color) {
        setCustomThemeColor(data.custom_theme_color);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, [db]);

  const updateAppSetting = async (key: string, value: string) => {
    try {
      await updateSetting(db, key, value);
      
      // Update local state
      if (key === 'language') {
        setLanguage(value);
        i18n.changeLanguage(value);
      } else if (key === 'default_currency') {
        setDefaultCurrency(value);
      } else if (key === 'ai_provider') {
        setAiProvider(value);
      } else if (key === 'ai_api_key') {
        setAiApiKey(value);
      } else if (key === 'ai_api_url') {
        setAiApiUrl(value);
      } else if (key === 'ai_model') {
        setAiModel(value);
      } else if (key === 'theme_mode') {
        setThemeMode(value);
      } else if (key === 'theme_color') {
        setThemeColor(value);
      } else if (key === 'custom_theme_color') {
        setCustomThemeColor(value);
      }
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  };

  const isDevMode = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';
  const isAppDefault = aiProvider === 'app_default';

  const resolvedApiUrl = isAppDefault
    ? (isDevMode ? (process.env.EXPO_PUBLIC_AI_API_URL || '') : '')
    : aiApiUrl;

  const resolvedModel = isAppDefault
    ? (isDevMode ? (process.env.EXPO_PUBLIC_AI_MODEL || '') : '')
    : aiModel;

  const resolvedApiKey = isAppDefault
    ? (isDevMode ? (process.env.EXPO_PUBLIC_AI_API_KEY || '') : '')
    : aiApiKey;

  return (
    <SettingsContext.Provider
      value={{
        language,
        defaultCurrency,
        aiProvider,
        aiApiKey: resolvedApiKey,
        aiApiUrl: resolvedApiUrl,
        aiModel: resolvedModel,
        themeMode,
        themeColor,
        customThemeColor,
        loading,
        updateAppSetting,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
