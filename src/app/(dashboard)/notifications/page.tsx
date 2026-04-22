'use client';

import Link from 'next/link';
import { Check, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useData } from '@/lib/store/data';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { notifications, hydrated } = useData();
  const supabase = createClient();

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  const unread = notifications.filter(i => !i.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('notif.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4" />{t('notif.mark_all_read')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          {!hydrated ? (
            <div className="space-y-3 p-4">{[0,1,2].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={<Bell className="h-8 w-8" />} title={t('notif.none')} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map(n => (
                <li key={n.id}>
                  <Link
                    href={n.link || '#'}
                    className={cn(
                      'flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                      !n.read && 'bg-brand-50/40 dark:bg-brand-500/5'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-brand-600 dark:text-brand-400">{t(`notif.kind.${n.kind}`)}</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</div>
                      {n.body && <div className="mt-0.5 text-xs text-slate-500">{n.body}</div>}
                    </div>
                    <div className="shrink-0 text-xs text-slate-400">{formatDate(n.created_at, 'MMM d, HH:mm')}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
