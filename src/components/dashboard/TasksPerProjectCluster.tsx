'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Project, Task } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

const TOP_N = 10;

export function TasksPerProjectCluster({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const { t } = useI18n();

  const data = projects
    .map(p => {
      const ptasks = tasks.filter(x => x.project_id === p.id);
      return {
        name: p.name.length > 28 ? p.name.slice(0, 28) + '…' : p.name,
        todo: ptasks.filter(x => x.status === 'todo').length,
        in_progress: ptasks.filter(x => x.status === 'in_progress').length,
        on_going: ptasks.filter(x => x.status === 'on_going').length,
        done: ptasks.filter(x => x.status === 'done').length,
        blocked: ptasks.filter(x => x.status === 'blocked').length,
        total: ptasks.length,
      };
    })
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  const top = data.slice(0, TOP_N);
  const height = Math.max(300, top.length * 42 + 40);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={top} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={180} interval={0} />
          <Tooltip
            cursor={{ fill: 'rgba(107, 62, 38, 0.06)' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: 'rgba(255,255,255,0.98)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="todo" stackId="a" name={t('task_status.todo')} fill="#d4ab86" />
          <Bar dataKey="in_progress" stackId="a" name={t('task_status.in_progress')} fill="#b97f4e" />
          <Bar dataKey="on_going" stackId="a" name={t('task_status.on_going')} fill="#0ea5e9" />
          <Bar dataKey="done" stackId="a" name={t('task_status.done')} fill="#6b3e26" />
          <Bar dataKey="blocked" stackId="a" name={t('task_status.blocked')} fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
      {data.length > TOP_N && (
        <div className="mt-2 text-center text-xs text-slate-500">
          Showing top {TOP_N} of {data.length} projects by task count
        </div>
      )}
    </div>
  );
}
