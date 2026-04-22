'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '@/lib/store/data';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { addMonths, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const { tasks, projects, hydrated } = useData();
  const [cursor, setCursor] = useState(new Date());

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const startOffset = getDay(monthStart);
  const daysInMonth = monthEnd.getDate();

  const byDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const tk of tasks) {
      if (!tk.due_date) continue;
      const arr = map.get(tk.due_date) ?? [];
      arr.push(tk);
      map.set(tk.due_date, arr);
    }
    return map;
  }, [tasks]);

  const cells: Array<{ day: number | null; date?: string }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
    cells.push({ day: d, date: dt.toISOString().slice(0, 10) });
  }

  const weekdays = locale === 'ar'
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!hydrated) {
    return <div className="space-y-4"><Skeleton className="h-96" /></div>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('calendar.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('calendar.deadlines')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(cursor, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft className="h-4 w-4 rtl-flip" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4 rtl-flip" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-7 gap-2">
            {weekdays.map(w => (
              <div key={w} className="py-2 text-center text-xs font-semibold text-slate-500">{w}</div>
            ))}
            {cells.map((c, i) => {
              const items = c.date ? (byDate.get(c.date) ?? []) : [];
              const isToday = c.date === todayStr;
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[92px] rounded-xl border p-2 text-xs transition',
                    c.day === null
                      ? 'border-transparent bg-slate-50/50 dark:bg-slate-900/20'
                      : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900',
                    isToday && 'ring-2 ring-brand-500'
                  )}
                >
                  {c.day !== null && (
                    <>
                      <div className={cn('mb-1 font-semibold', isToday ? 'text-brand-600' : 'text-slate-700 dark:text-slate-300')}>
                        {c.day}
                      </div>
                      <div className="space-y-1">
                        {items.slice(0, 3).map(task => {
                          const proj = projectMap.get(task.project_id);
                          const overdue = task.due_date! < todayStr && task.status !== 'done';
                          return (
                            <Link
                              key={task.id}
                              href={`/projects/${task.project_id}`}
                              className={cn(
                                'block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                                overdue
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                  : task.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                    : 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200'
                              )}
                              title={`${proj?.name ?? ''} — ${task.title}`}
                            >
                              {task.title}
                            </Link>
                          );
                        })}
                        {items.length > 3 && <div className="text-[11px] text-slate-400">+{items.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
