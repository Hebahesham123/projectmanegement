'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  CalendarDays,
  Bell,
  Users,
  Settings,
  Mail,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useAuth } from '@/lib/auth/AuthProvider';

export function Sidebar({ onClose, onNavigate }: { onClose?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const nav = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/projects', label: t('nav.projects'), icon: FolderKanban },
    { href: '/tasks', label: t('nav.tasks'), icon: ListChecks },
    { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell },
    { href: '/team', label: t('nav.team'), icon: Users },
    ...(isAdmin ? [{ href: '/settings/emails', label: 'Email log', icon: Mail }] : []),
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-e border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-brand-100 shadow-soft dark:bg-slate-100">
          <Image src="/logo.svg" alt="NS" width={28} height={28} className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{t('app.name')}</div>
          <div className="truncate text-[11px] text-slate-500">{t('app.tagline')}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map(item => {
          const matches = pathname === item.href || pathname.startsWith(item.href + '/');
          const longerMatch = nav.some(
            other =>
              other.href !== item.href &&
              other.href.startsWith(item.href + '/') &&
              (pathname === other.href || pathname.startsWith(other.href + '/')),
          );
          const active = matches && !longerMatch;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800">
        v1.0 · Built with ♥
      </div>
    </aside>
  );
}
