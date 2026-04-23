'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import { useData } from '@/lib/store/data';
import type { TaskStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { TaskStatusBadge } from '@/components/projects/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, cn } from '@/lib/utils';
import { DEPARTMENTS } from '@/lib/constants';

export default function TasksPage() {
  const { t } = useI18n();
  const { tasks, projects, hydrated } = useData();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [projectId, setProjectId] = useState<string | 'all'>('all');
  const [department, setDepartment] = useState<string | 'all'>('all');

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let list = tasks;
    if (status !== 'all') list = list.filter(x => x.status === status);
    if (projectId !== 'all') list = list.filter(x => x.project_id === projectId);
    if (department !== 'all') {
      list = list.filter(x => projectMap.get(x.project_id)?.sector === department);
    }
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        x => x.title.toLowerCase().includes(needle) ||
             x.description?.toLowerCase().includes(needle) ||
             x.assignee_name?.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [tasks, q, status, projectId, department, projectMap]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    for (const p of projects) if (p.sector) set.add(p.sector);
    return Array.from(set).sort();
  }, [projects]);

  const doExport = async () => {
    const { exportCsv } = await import('@/lib/export');
    exportCsv(filtered.map(t => ({
      project: projectMap.get(t.project_id)?.name ?? '',
      title: t.title, assignee: t.assignee_name ?? '',
      status: t.status, completion: t.completion_percentage, due: t.due_date ?? '',
    })), 'tasks');
  };
  const doExportPdf = async () => {
    const { exportPdf } = await import('@/lib/export');
    exportPdf(
      filtered.map(t => ({
        project: projectMap.get(t.project_id)?.name ?? '',
        title: t.title, assignee: t.assignee_name ?? '',
        status: t.status, completion: t.completion_percentage, due: formatDate(t.due_date),
      })),
      [
        { header: 'Project', key: 'project' },
        { header: 'Title', key: 'title' },
        { header: 'Assignee', key: 'assignee' },
        { header: 'Status', key: 'status' },
        { header: '%', key: 'completion' },
        { header: 'Due', key: 'due' },
      ],
      'tasks', 'Tasks Report'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.tasks')}</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} {t('common.of')} {tasks.length}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={doExport}><Download className="h-4 w-4" />{t('common.export_csv')}</Button>
          <Button variant="outline" size="sm" onClick={doExportPdf}><Download className="h-4 w-4" />{t('common.export_pdf')}</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder={t('common.search')}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value as TaskStatus | 'all')} className="sm:w-44">
          <option value="all">{t('common.all')} — {t('task.status')}</option>
          <option value="todo">{t('task_status.todo')}</option>
          <option value="in_progress">{t('task_status.in_progress')}</option>
          <option value="done">{t('task_status.done')}</option>
          <option value="blocked">{t('task_status.blocked')}</option>
        </Select>
        <Select value={department} onChange={e => setDepartment(e.target.value)} className="sm:w-52">
          <option value="all">{t('common.all')} — Department</option>
          {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="sm:w-52">
          <option value="all">{t('common.all')} — Project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Card>
        <CardBody className="p-0">
          {!hydrated ? (
            <div className="space-y-3 p-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">{t('task.none')}</div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-start">Project</th>
                    <th className="px-4 py-3 text-start">{t('task.title')}</th>
                    <th className="px-4 py-3 text-start">{t('task.assignee')}</th>
                    <th className="px-4 py-3 text-start">{t('task.status')}</th>
                    <th className="px-4 py-3 text-start">{t('task.completion')}</th>
                    <th className="px-4 py-3 text-start">{t('task.due_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filtered.map(task => {
                    const overdue = task.due_date && task.due_date < today && task.status !== 'done';
                    const proj = projectMap.get(task.project_id);
                    return (
                      <tr key={task.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${task.project_id}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            {proj?.name ?? '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{task.title}</td>
                        <td className="px-4 py-3">
                          {task.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar size={24} name={task.assignee_name} email={task.assignee_email} />
                              <span className="text-slate-700 dark:text-slate-200">{task.assignee_name}</span>
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
          )}
        </CardBody>
      </Card>
    </div>
  );
}
