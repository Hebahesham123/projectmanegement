'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import type { Project } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export function ProgressChart({ projects }: { projects: Project[] }) {
  const { t } = useI18n();
  const data = projects.map(p => ({
    name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
    completion: Math.round(Number(p.completion_rate)),
  }));

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
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
        <Bar dataKey="completion" fill="#6b3e26" radius={[8, 8, 0, 0]}>
          <LabelList
            dataKey="completion"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 11, fontWeight: 700, fill: '#553020' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
