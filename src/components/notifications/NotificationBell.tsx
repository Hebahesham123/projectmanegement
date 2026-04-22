'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useData } from '@/lib/store/data';
import { cn, formatDate } from '@/lib/utils';

export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();
  const { notifications } = useData();
  const [open, setOpen] = useState(false);

  const items = notifications.filter(n => n.user_id === user?.id).slice(0, 20);
  const unread = items.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <div
        className={cn(
          'absolute end-0 top-full mt-2 w-80 origin-top-end rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900',
          open ? 'block animate-slide-up' : 'hidden'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h4 className="text-sm font-semibold">{t('notif.title')}</h4>
          {unread > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
              <Check className="h-3 w-3" />
              {t('notif.mark_all_read')}
            </button>
          )}
        </div>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">{t('notif.none')}</li>
          )}
          {items.map(n => (
            <li key={n.id}>
              <Link
                href={n.link || '#'}
                onClick={() => setOpen(false)}
                className={cn('block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800', !n.read && 'bg-brand-50/40 dark:bg-brand-500/5')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-brand-600 dark:text-brand-400">{t(`notif.kind.${n.kind}`)}</div>
                    <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-xs text-slate-500">{n.body}</div>}
                  </div>
                  <div className="shrink-0 text-[10px] text-slate-400">{formatDate(n.created_at, 'MMM d')}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            View all
          </Link>
        </div>
      </div>
    </div>
  );
}
