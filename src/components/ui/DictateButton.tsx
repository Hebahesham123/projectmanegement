'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function DictateButton({
  onTranscript,
  className,
}: {
  onTranscript: (chunk: string) => void;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  const toggle = () => {
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error(t('dictate.unsupported'));
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0]?.transcript ?? '';
          if (text) onTranscript(text);
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        toast.error(`${t('dictate.error')}: ${e.error}`);
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const label = listening ? t('dictate.stop') : t('dictate.start');

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      title={supported ? label : t('dictate.unsupported')}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
        listening && 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-400',
        className,
      )}
    >
      {listening ? (
        <span className="relative inline-flex">
          <MicOff className="h-4 w-4" />
          <span className="absolute -end-1 -top-1 inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        </span>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
