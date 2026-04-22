'use client';

import type { Task } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { TaskStatusBadge } from '@/components/projects/StatusBadge';
import { formatDate, cn } from '@/lib/utils';
import { Progress } from '@/components/ui/Progress';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export function TaskList({ tasks, onRowClick }: { tasks: Task[]; onRowClick: (t: Task) => void }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);

  if (tasks.length === 0) return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('task.none')}</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr className="text-start text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3 text-start">{t('task.title')}</th>
            <th className="px-4 py-3 text-start">{t('task.assignee')}</th>
            <th className="px-4 py-3 text-start">{t('task.status')}</th>
            <th className="px-4 py-3 text-start">{t('task.completion')}</th>
            <th className="px-4 py-3 text-start">{t('task.due_date')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {tasks.map(task => {
            const overdue = task.due_date && task.due_date < today && task.status !== 'done';
            return (
              <tr key={task.id} onClick={() => onRowClick(task)} className="cursor-pointer text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                  {task.description && <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{task.description}</div>}
                </td>
                <td className="px-4 py-3">
                  {task.assignee_name || task.assignee_email ? (
                    <div className="flex items-center gap-2">
                      <Avatar size={26} name={task.assignee_name} email={task.assignee_email} />
                      <span className="truncate text-slate-700 dark:text-slate-200">{task.assignee_name ?? task.assignee_email}</span>
                    </div>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3"><TaskStatusBadge status={task.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={task.completion_percentage} className="w-24" />
                    <span className="text-xs font-medium">{task.completion_percentage}%</span>
                  </div>
                </td>
                <td className={cn('px-4 py-3', overdue ? 'text-rose-600 font-semibold' : 'text-slate-600 dark:text-slate-300')}>
                  {formatDate(task.due_date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
