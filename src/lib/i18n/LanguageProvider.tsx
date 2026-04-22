'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';

type Ctx = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey | string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'pt-locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Locale | null;
    if (saved === 'ar' || saved === 'en') setLocaleState(saved);
  }, []);

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey | string) => {
    const dict = translations[locale] as Record<string, string>;
    return dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  }, [locale]);

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';
  return <LanguageContext.Provider value={{ locale, dir, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}
