'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Task } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

const COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
};

export function TasksByStatusChart({ tasks }: { tasks: Task[] }) {
  const { t } = useI18n();
  const counts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts).map(([status, value]) => ({
    status,
    name: t(`task_status.${status}`),
    value,
  }));

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={100}
          paddingAngle={4}
          label={({ value }) => `${value} (${Math.round((value / total) * 100)}%)`}
          labelLine={false}
        >
          {data.map(d => (
            <Cell key={d.status} fill={COLORS[d.status] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 12,
            background: 'rgba(255,255,255,0.98)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
