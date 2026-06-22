import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import hi from './locales/hi';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const LANG_KEY = 'travirt_lang';

const savedLang = (localStorage.getItem(LANG_KEY) as LangCode | null) ?? 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng:          savedLang,
    fallbackLng:  'en',
    interpolation: { escapeValue: false },
  });

export const setLanguage = (code: LangCode) => {
  i18n.changeLanguage(code);
  localStorage.setItem(LANG_KEY, code);
};

export default i18n;
