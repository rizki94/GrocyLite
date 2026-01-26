import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

import en from './locales/en';
import id from './locales/id';

const RESOURCES = {
  en: { translation: en },
  id: { translation: id },
};

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const language = await AsyncStorage.getItem('user-language');
      if (language) {
        return callback(language);
      }
    } catch (e) {
      console.log('Error reading language', e);
    }

    // Fallback logic
    const deviceLanguage =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager.settings.AppleLocale ||
          NativeModules.SettingsManager.settings.AppleLanguages[0] //iOS 13
        : NativeModules.I18nManager.localeIdentifier;

    const langCode = deviceLanguage ? deviceLanguage.substring(0, 2) : 'en';
    callback(langCode === 'id' ? 'id' : 'en');
  },
  init: () => {},
  cacheUserLanguage: (language: string) => {
    AsyncStorage.setItem('user-language', language);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    compatibilityJSON: 'v4', // For React Native Android
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

// Persist language changes
i18n.on('languageChanged', lng => {
  AsyncStorage.setItem('user-language', lng);
});

export default i18n;
