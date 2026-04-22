'use client';

import type { Task, UserProfile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export function TeamWorkload({ tasks, users }: { tasks: Task[]; users: UserProfile[] }) {
  const { t } = useI18n();

  const byUser = new Map<string, { total: number; done: number; user?: UserProfile }>();
  for (const task of tasks) {
    if (!task.assignee_id) continue;
    const entry = byUser.get(task.assignee_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (task.status === 'done') entry.done += 1;
    entry.user = users.find(u => u.id === task.assignee_id);
    byUser.set(task.assignee_id, entry);
  }

  const rows = Array.from(byUser.values()).sort((a, b) => b.total - a.total).slice(0, 6);

  if (rows.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ul className="space-y-4">
      {rows.map(({ user, total, done }) => {
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        return (
          <li key={user?.id ?? Math.random()} className="flex items-center gap-3">
            <Avatar name={user?.full_name} email={user?.email} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.full_name ?? user?.email ?? '—'}
                </div>
                <div className="shrink-0 text-xs text-slate-500">
                  {done}/{total}
                </div>
              </div>
              <Progress value={pct} className="mt-1.5" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
