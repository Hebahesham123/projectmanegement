'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { Button } from '@/components/ui/Button';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      title="Language / اللغة"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === 'en' ? 'العربية' : 'English'}</span>
    </Button>
  );
}
