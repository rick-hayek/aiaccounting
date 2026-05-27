import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import zh from './locales/zh.json';
import en from './locales/en.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

const systemLocales = Localization.getLocales();
const systemLanguage = systemLocales[0]?.languageCode?.toLowerCase();
const defaultLang = systemLanguage === 'zh' || systemLanguage?.startsWith('zh') ? 'zh' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already protects from xss
    },
  });

export default i18n;
