'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import type { Task } from '@/lib/types';
import { formatDate, daysBetween, cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = tasks
    .filter(x => x.due_date && x.status !== 'done')
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 6);

  if (upcoming.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {upcoming.map(t => {
        const diff = daysBetween(today, t.due_date!);
        const overdue = diff !== null && diff < 0;
        const soon = diff !== null && diff >= 0 && diff <= 7;
        return (
          <li key={t.id} className="py-3">
            <Link href={`/projects/${t.project_id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    overdue ? 'bg-rose-100 text-rose-600' : soon ? 'bg-amber-100 text-amber-600' : 'bg-brand-50 text-brand-600',
                    'dark:bg-opacity-20'
                  )}
                >
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</div>
                  <div className="text-xs text-slate-500">{formatDate(t.due_date)}</div>
                </div>
              </div>
              <div className={cn('text-xs font-semibold', overdue ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500')}>
                {overdue ? `${Math.abs(diff!)}d overdue` : `${diff}d left`}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
