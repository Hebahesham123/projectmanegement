'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import type { Project } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

const TOP_N = 10;

export function ProgressChart({ projects }: { projects: Project[] }) {
  const { t } = useI18n();

  const sorted = [...projects].sort(
    (a, b) => Number(b.completion_rate) - Number(a.completion_rate),
  );
  const top = sorted.slice(0, TOP_N);
  const data = top.map(p => ({
    name: p.name.length > 28 ? p.name.slice(0, 28) + '…' : p.name,
    completion: Math.round(Number(p.completion_rate)),
  }));

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  const height = Math.max(280, data.length * 36 + 40);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={180}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: 'rgba(107, 62, 38, 0.06)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
              background: 'rgba(255,255,255,0.98)',
            }}
            formatter={(v: number) => [`${v}%`, 'Completion']}
          />
          <Bar dataKey="completion" fill="#6b3e26" radius={[0, 6, 6, 0]} barSize={18}>
            <LabelList
              dataKey="completion"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fontWeight: 700, fill: '#553020' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {projects.length > TOP_N && (
        <div className="mt-2 text-center text-xs text-slate-500">
          Showing top {TOP_N} of {projects.length} projects by completion
        </div>
      )}
    </div>
  );
}
