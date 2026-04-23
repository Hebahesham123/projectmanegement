'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        toast.error('Missing Supabase env vars. Check .env.local and restart the dev server.');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed — check Network tab.';
      toast.error(msg);
      console.error('Sign-in error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-brand-200 shadow-lg shadow-brand-900/10">
              <Image src="/logo.svg" alt="NS" width={36} height={36} className="h-9 w-9" />
            </div>
            <div>
              <div className="text-lg font-semibold">{t('app.name')}</div>
              <div className="text-xs text-slate-500">{t('app.tagline')}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{t('auth.welcome_back')}</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('auth.subtitle_signin')}</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('auth.signin')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
