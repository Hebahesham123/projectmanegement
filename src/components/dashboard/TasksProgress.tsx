'use client';

import Link from 'next/link';
import type { Task, Project } from '@/lib/types';
import { Progress } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { TaskStatusBadge } from '@/components/projects/StatusBadge';
import { formatDate, cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';

/**
 * Per-task completion widget. Sorted: in-progress first (closest to done),
 * then todo, then blocked, then done — so the most actionable tasks surface.
 */
export function TasksProgress({ tasks, projects, limit = 8 }: { tasks: Task[]; projects: Project[]; limit?: number }) {
  const { t } = useI18n();
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, blocked: 2, done: 3 };
  const list = [...tasks]
    .sort((a, b) => {
      const s = order[a.status] - order[b.status];
      if (s !== 0) return s;
      return b.completion_percentage - a.completion_percentage;
    })
    .slice(0, limit);

  if (list.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ul className="space-y-3.5">
      {list.map(task => {
        const proj = projectMap.get(task.project_id);
        const overdue = task.due_date && task.due_date < today && task.status !== 'done';
        return (
          <li key={task.id}>
            <Link
              href={`/projects/${task.project_id}`}
              className="block rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-3">
                {task.assignee_name ? (
                  <Avatar size={28} name={task.assignee_name} email={task.assignee_email} />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">—</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="truncate">{proj?.name ?? '—'}</span>
                    {task.due_date && (
                      <>
                        <span>·</span>
                        <span className={cn(overdue && 'font-semibold text-rose-600')}>
                          {overdue ? 'overdue ' : 'due '}{formatDate(task.due_date, 'MMM d')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-10 shrink-0 text-end text-xs font-bold text-slate-900 dark:text-slate-100">
                  {task.completion_percentage}%
                </div>
              </div>
              <Progress value={task.completion_percentage} className="mt-2" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
