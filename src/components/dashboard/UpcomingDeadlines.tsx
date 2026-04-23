'use client';

import Link from 'next/link';
import { CalendarClock, FolderKanban, ListChecks } from 'lucide-react';
import type { Task, Project } from '@/lib/types';
import { formatDate, daysBetween, cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';

type Row = {
  key: string;
  kind: 'task' | 'project';
  title: string;
  dueDate: string;
  href: string;
  projectName: string | null;
  ownerName: string | null;
  assigneeName: string | null;
};

export function UpcomingDeadlines({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const projectById = new Map(projects.map(p => [p.id, p]));

  const rows: Row[] = [
    ...tasks
      .filter(x => x.due_date && x.status !== 'done')
      .map(x => {
        const p = projectById.get(x.project_id);
        return {
          key: `t-${x.id}`,
          kind: 'task' as const,
          title: x.title,
          dueDate: x.due_date!,
          href: `/projects/${x.project_id}`,
          projectName: p?.name ?? null,
          ownerName: p?.owner_name ?? null,
          assigneeName: x.assignee_name ?? null,
        };
      }),
    ...projects
      .filter(p => p.estimated_end_date && p.status !== 'completed')
      .map(p => ({
        key: `p-${p.id}`,
        kind: 'project' as const,
        title: p.name,
        dueDate: p.estimated_end_date!,
        href: `/projects/${p.id}`,
        projectName: null,
        ownerName: p.owner_name ?? null,
        assigneeName: null,
      })),
  ]
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 6);

  if (rows.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map(r => {
        const diff = daysBetween(today, r.dueDate);
        const overdue = diff !== null && diff < 0;
        const soon = diff !== null && diff >= 0 && diff <= 7;
        const Icon = r.kind === 'project' ? FolderKanban : ListChecks;
        return (
          <li key={r.key} className="py-3">
            <Link href={r.href} className="flex items-start justify-between gap-3 rounded-lg px-2 py-1 hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    overdue ? 'bg-rose-100 text-rose-600' : soon ? 'bg-amber-100 text-amber-600' : 'bg-brand-50 text-brand-700',
                    'dark:bg-opacity-20'
                  )}
                >
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        r.kind === 'project'
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {r.kind}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formatDate(r.dueDate)}
                    {r.projectName && <> · <span className="font-medium text-slate-600 dark:text-slate-300">{r.projectName}</span></>}
                    {r.ownerName && <> · {t('project.owner')}: <span className="font-medium text-slate-600 dark:text-slate-300">{r.ownerName}</span></>}
                    {r.assigneeName && <> · {t('task.assignee')}: <span className="font-medium text-slate-600 dark:text-slate-300">{r.assigneeName}</span></>}
                  </div>
                </div>
              </div>
              <div className={cn('shrink-0 text-xs font-semibold', overdue ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500')}>
                {overdue ? `${Math.abs(diff!)}d overdue` : `${diff}d left`}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
