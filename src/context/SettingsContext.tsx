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
  loading: boolean;
  updateAppSetting: (key: string, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();
  
  const [language, setLanguage] = useState<string>('en');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');
  const [aiProvider, setAiProvider] = useState<string>('openai');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiApiUrl, setAiApiUrl] = useState<string>('https://api.openai.com/v1');
  const [aiModel, setAiModel] = useState<string>('gpt-4o-mini');
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
      }
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        defaultCurrency,
        aiProvider,
        aiApiKey,
        aiApiUrl,
        aiModel,
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
