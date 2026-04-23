'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { AlertTriangle, Trophy, UserX } from 'lucide-react';
import type { Project, Task } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';

type OwnerRow = {
  name: string;
  projects: number;
  delayed: number;
  completed: number;
  avg: number;
};

type LateAssignee = {
  name: string;
  overdue: number;
  blocked: number;
};

export function OwnersRanking({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);

  const owners: OwnerRow[] = useMemo(() => {
    const map = new Map<string, OwnerRow>();
    for (const p of projects) {
      const name = p.owner_name || '—';
      const row = map.get(name) ?? { name, projects: 0, delayed: 0, completed: 0, avg: 0 };
      row.projects += 1;
      if (p.status === 'delayed') row.delayed += 1;
      if (p.status === 'completed') row.completed += 1;
      row.avg += Number(p.completion_rate);
      map.set(name, row);
    }
    return Array.from(map.values())
      .map(r => ({ ...r, avg: r.projects ? Math.round(r.avg / r.projects) : 0 }))
      .sort((a, b) => b.avg - a.avg || b.completed - a.completed);
  }, [projects]);

  const lateAssignees: LateAssignee[] = useMemo(() => {
    const map = new Map<string, LateAssignee>();
    for (const x of tasks) {
      if (x.status === 'done') continue;
      const isOverdue = !!(x.due_date && x.due_date < today);
      const isBlocked = x.status === 'blocked';
      if (!isOverdue && !isBlocked) continue;
      const name = x.assignee_name || '—';
      const row = map.get(name) ?? { name, overdue: 0, blocked: 0 };
      if (isOverdue) row.overdue += 1;
      if (isBlocked) row.blocked += 1;
      map.set(name, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.overdue + b.blocked - (a.overdue + a.blocked))
      .slice(0, 6);
  }, [tasks, today]);

  if (owners.length === 0 && lateAssignees.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{t('common.empty')}</div>;
  }

  const chartData = owners.slice(0, 8).map(o => ({
    name: o.name.length > 14 ? o.name.slice(0, 14) + '…' : o.name,
    avg: o.avg,
    delayed: o.delayed,
  }));

  return (
    <div className="space-y-5">
      {chartData.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Trophy className="h-3.5 w-3.5 text-brand-600" />
            Owners ranking · avg completion
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: 'rgba(107, 62, 38, 0.06)' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: 'rgba(255,255,255,0.98)' }}
                formatter={(v: number, _k, p: { payload?: { delayed?: number } }) => [
                  `${v}% · ${p?.payload?.delayed ?? 0} delayed`,
                  'Avg completion',
                ]}
              />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.delayed > 0 ? '#b97f4e' : '#6b3e26'} />
                ))}
                <LabelList
                  dataKey="avg"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#553020' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Owners with delayed projects
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {owners.filter(o => o.delayed > 0).slice(0, 5).map(o => (
              <li key={o.name} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{o.name}</div>
                  <div className="text-xs text-slate-500">
                    {o.projects} project{o.projects !== 1 ? 's' : ''} · avg {o.avg}%
                  </div>
                </div>
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {o.delayed} delayed
                </span>
              </li>
            ))}
            {owners.every(o => o.delayed === 0) && (
              <li className="py-3 text-xs text-slate-500">No delayed projects.</li>
            )}
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <UserX className="h-3.5 w-3.5 text-rose-500" />
            Delaying assignees
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {lateAssignees.map(a => (
              <li key={a.name} className="flex items-center justify-between py-2 text-sm">
                <div className="font-medium text-slate-900 dark:text-slate-100">{a.name}</div>
                <div className="flex items-center gap-1.5 text-xs">
                  {a.overdue > 0 && (
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                      {a.overdue} overdue
                    </span>
                  )}
                  {a.blocked > 0 && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                      {a.blocked} blocked
                    </span>
                  )}
                </div>
              </li>
            ))}
            {lateAssignees.length === 0 && (
              <li className="py-3 text-xs text-slate-500">No delaying assignees.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
