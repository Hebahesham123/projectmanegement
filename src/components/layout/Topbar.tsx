'use client';

import { useState } from 'react';
import { Menu, LogOut, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder={t('common.search')}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="ms-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell />
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl p-1 pe-3 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar name={profile?.full_name} email={profile?.email} />
            <div className="hidden text-start sm:block">
              <div className="text-sm font-medium leading-tight">{profile?.full_name ?? profile?.email}</div>
              <div className="text-[11px] text-slate-500">{profile?.role && t(`role.${profile.role}`)}</div>
            </div>
          </button>
          <div
            className={cn(
              'absolute end-0 top-full mt-2 w-48 origin-top-end rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900',
              menuOpen ? 'block animate-slide-up' : 'hidden'
            )}
          >
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.signout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
