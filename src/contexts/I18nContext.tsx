'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import commonNL from '../../public/locales/nl/common.json';
import commonEN from '../../public/locales/en/common.json';

type Locale = 'nl' | 'en';
type Translations = typeof commonNL;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Translations> = {
  nl: commonNL,
  en: commonEN,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('nl');

  useEffect(() => {
    // Load locale from localStorage
    const savedLocale = localStorage.getItem('ademruimte_locale') as Locale;
    if (savedLocale && (savedLocale === 'nl' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('ademruimte_locale', newLocale);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook for backwards compatibility with next-i18next
export function useTranslation() {
  const { t } = useI18n();
  return { t };
}
