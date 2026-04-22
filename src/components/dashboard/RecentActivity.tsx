'use client';

import type { Task, Comment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { MessageSquare, ListPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/LanguageProvider';

type Item = {
  id: string;
  at: string;
  title: string;
  subtitle?: string;
  kind: 'task' | 'comment' | 'completed' | 'overdue';
};

export function RecentActivity({ tasks, comments }: { tasks: Task[]; comments: Comment[] }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const items: Item[] = [];

  for (const task of tasks.slice(0, 20)) {
    if (task.status === 'done') {
      items.push({
        id: `t-done-${task.id}`,
        at: task.updated_at,
        title: task.title,
        subtitle: 'Marked as done',
        kind: 'completed',
      });
    } else if (task.due_date && task.due_date < today) {
      items.push({
        id: `t-over-${task.id}`,
        at: task.updated_at,
        title: task.title,
        subtitle: 'Overdue',
        kind: 'overdue',
      });
    } else {
      items.push({ id: `t-${task.id}`, at: task.created_at, title: task.title, subtitle: 'New task', kind: 'task' });
    }
  }
  for (const c of comments.slice(0, 20)) {
    items.push({ id: `c-${c.id}`, at: c.created_at, title: c.body.slice(0, 80), subtitle: 'New comment', kind: 'comment' });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  const list = items.slice(0, 8);

  if (list.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  const iconFor = (k: Item['kind']) => {
    const common = 'h-4 w-4';
    if (k === 'task') return <ListPlus className={`${common} text-brand-600`} />;
    if (k === 'comment') return <MessageSquare className={`${common} text-sky-600`} />;
    if (k === 'completed') return <CheckCircle2 className={`${common} text-emerald-600`} />;
    return <AlertTriangle className={`${common} text-rose-600`} />;
  };

  return (
    <ul className="space-y-3">
      {list.map(i => (
        <li key={i.id} className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{iconFor(i.kind)}</div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{i.title}</div>
            <div className="text-xs text-slate-500">
              {i.subtitle} · {formatDate(i.at, 'MMM d, HH:mm')}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
