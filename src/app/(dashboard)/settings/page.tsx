'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { Moon, Sun, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { profile, refresh } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [mobile, setMobile] = useState(profile?.mobile ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setMobile(profile?.mobile ?? '');
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({ full_name: fullName, mobile }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile updated');
    refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>

      <Card>
        <CardHeader><CardTitle>{t('settings.profile')}</CardTitle></CardHeader>
        <CardBody>
          <div className="mb-6 flex items-center gap-4">
            <Avatar size={64} name={profile?.full_name} email={profile?.email} />
            <div>
              <div className="text-sm font-semibold">{profile?.email}</div>
              <div className="text-xs text-slate-500">{profile?.role && t(`role.${profile.role}`)}</div>
            </div>
          </div>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label htmlFor="full_name">{t('auth.full_name')}</Label>
              <Input id="full_name" value={fullName ?? ''} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mobile">{t('project.owner_mobile')}</Label>
              <Input id="mobile" value={mobile ?? ''} onChange={e => setMobile(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>{t('common.save')}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('settings.language')}</CardTitle></CardHeader>
        <CardBody>
          <div className="flex gap-2">
            <Button variant={locale === 'en' ? 'primary' : 'outline'} onClick={() => setLocale('en')}>
              <Globe className="h-4 w-4" /> English
            </Button>
            <Button variant={locale === 'ar' ? 'primary' : 'outline'} onClick={() => setLocale('ar')}>
              <Globe className="h-4 w-4" /> العربية
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('settings.theme')}</CardTitle></CardHeader>
        <CardBody>
          <div className="flex gap-2">
            <Button variant={theme === 'light' ? 'primary' : 'outline'} onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4" /> {t('settings.theme.light')}
            </Button>
            <Button variant={theme === 'dark' ? 'primary' : 'outline'} onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4" /> {t('settings.theme.dark')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
