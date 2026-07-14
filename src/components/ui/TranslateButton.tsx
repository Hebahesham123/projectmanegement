'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ARABIC_RE = /[؀-ۿ]/;

/** Detect whether the text is mostly Arabic so we know which way to translate. */
function isArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

export function TranslateButton({
  text,
  onTranslated,
  className,
}: {
  text: string;
  onTranslated: (translated: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const trimmed = (text ?? '').trim();
  const toArabic = !isArabic(trimmed);
  const target = toArabic ? 'ar' : 'en';
  const source = toArabic ? 'en' : 'ar';
  const label = toArabic ? t('translate.to_ar') : t('translate.to_en');

  const run = async () => {
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, source, target }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error || 'translation failed');
      onTranslated(data.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'translation failed';
      toast.error(`${t('translate.error')}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={!trimmed || loading}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
    </button>
  );
}
