'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Project, Task } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export function TasksPerProjectCluster({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const { t } = useI18n();

  const data = projects.map(p => {
    const ptasks = tasks.filter(x => x.project_id === p.id);
    return {
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      todo: ptasks.filter(x => x.status === 'todo').length,
      in_progress: ptasks.filter(x => x.status === 'in_progress').length,
      done: ptasks.filter(x => x.status === 'done').length,
      blocked: ptasks.filter(x => x.status === 'blocked').length,
    };
  }).filter(d => d.todo + d.in_progress + d.done + d.blocked > 0);

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={0} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(107, 62, 38, 0.06)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: 'rgba(255,255,255,0.98)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="todo" name={t('task_status.todo')} fill="#d4ab86" radius={[6, 6, 0, 0]} />
        <Bar dataKey="in_progress" name={t('task_status.in_progress')} fill="#b97f4e" radius={[6, 6, 0, 0]} />
        <Bar dataKey="done" name={t('task_status.done')} fill="#6b3e26" radius={[6, 6, 0, 0]} />
        <Bar dataKey="blocked" name={t('task_status.blocked')} fill="#ef4444" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
