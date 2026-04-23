'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, FolderKanban, Search, Download, LayoutGrid, LayoutList, ChevronRight } from 'lucide-react';
import { useData } from '@/lib/store/data';
import { useAuth, canManageProjects } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import type { ProjectStatus } from '@/lib/types';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectStatusBadge, TaskStatusBadge } from '@/components/projects/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { formatDate, projectHealth, healthClasses, cn, daysBetween } from '@/lib/utils';
import { DEPARTMENTS, PROJECT_MANAGERS } from '@/lib/constants';

export default function ProjectsPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { projects, tasks, users, hydrated } = useData();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [memberId, setMemberId] = useState<string | 'all'>('all');
  const [department, setDepartment] = useState<string | 'all'>('all');
  const [manager, setManager] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<'recent' | 'name' | 'completion' | 'deadline'>('recent');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const canManage = canManageProjects(profile?.role);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // project_id → tasks (sorted by order_index then created_at)
  const tasksByProject = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const arr = map.get(task.project_id) ?? [];
      arr.push(task);
      map.set(task.project_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.order_index - b.order_index || (a.created_at < b.created_at ? -1 : 1));
    }
    return map;
  }, [tasks]);

  // project_id → Set<user_id> of assignees via tasks
  const membersByProject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const task of tasks) {
      if (!task.assignee_id) continue;
      const set = map.get(task.project_id) ?? new Set<string>();
      set.add(task.assignee_id);
      map.set(task.project_id, set);
    }
    return map;
  }, [tasks]);

  // only show users in the filter who are actually assigned to at least one task
  const memberOptions = useMemo(() => {
    const activeIds = new Set<string>();
    for (const set of membersByProject.values()) set.forEach(id => activeIds.add(id));
    return users.filter(u => activeIds.has(u.id));
  }, [users, membersByProject]);

  const filtered = useMemo(() => {
    let list = projects;
    if (status !== 'all') list = list.filter(p => p.status === status);
    if (department !== 'all') list = list.filter(p => p.sector === department);
    if (manager !== 'all') list = list.filter(p => p.project_manager === manager);
    if (memberId !== 'all') list = list.filter(p => membersByProject.get(p.id)?.has(memberId));
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        p => p.name.toLowerCase().includes(needle) ||
             p.description?.toLowerCase().includes(needle) ||
             p.sector?.toLowerCase().includes(needle) ||
             p.owner_name?.toLowerCase().includes(needle)
      );
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'completion') sorted.sort((a, b) => Number(b.completion_rate) - Number(a.completion_rate));
    else if (sort === 'deadline') sorted.sort((a, b) => (a.estimated_end_date ?? '9') > (b.estimated_end_date ?? '9') ? 1 : -1);
    else sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return sorted;
  }, [projects, q, status, memberId, department, manager, sort, membersByProject]);

  // Department options: predefined list + any legacy values currently in data
  const departmentOptions = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    for (const p of projects) if (p.sector) set.add(p.sector);
    return Array.from(set).sort();
  }, [projects]);

  const managerOptions = useMemo(() => {
    const set = new Set<string>(PROJECT_MANAGERS);
    for (const p of projects) if (p.project_manager) set.add(p.project_manager);
    return Array.from(set).sort();
  }, [projects]);

  const doExportCsv = async () => {
    const { exportCsv } = await import('@/lib/export');
    exportCsv(filtered.map(p => ({
      name: p.name, status: p.status, sector: p.sector ?? '',
      owner_name: p.owner_name ?? '', owner_email: p.owner_email ?? '',
      start_date: p.start_date, estimated_end_date: p.estimated_end_date ?? '',
      completion_rate: p.completion_rate,
    })), 'projects');
  };
  const doExportPdf = async () => {
    const { exportPdf } = await import('@/lib/export');
    exportPdf(
      filtered.map(p => ({ ...p, start_date: formatDate(p.start_date), estimated_end_date: formatDate(p.estimated_end_date) })),
      [
        { header: 'Name', key: 'name' },
        { header: 'Status', key: 'status' },
        { header: 'Sector', key: 'sector' },
        { header: 'Owner', key: 'owner_name' },
        { header: 'Start', key: 'start_date' },
        { header: 'End', key: 'estimated_end_date' },
        { header: '%', key: 'completion_rate' },
      ],
      'projects', 'Projects Report'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.projects')}</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} {t('common.of')} {projects.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              onClick={() => setView('list')}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5', view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300')}
            >
              <LayoutList className="h-3.5 w-3.5" />List
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5', view === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />Grid
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={doExportCsv}><Download className="h-4 w-4" />{t('common.export_csv')}</Button>
          <Button variant="outline" size="sm" onClick={doExportPdf}><Download className="h-4 w-4" />{t('common.export_pdf')}</Button>
          {canManage && (
            <Link href="/projects/new">
              <Button><Plus className="h-4 w-4" />{t('project.new')}</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder={t('common.search')}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value as ProjectStatus | 'all')} className="sm:w-44">
          <option value="all">{t('common.all')} — {t('project.status')}</option>
          <option value="not_started">{t('status.not_started')}</option>
          <option value="in_progress">{t('status.in_progress')}</option>
          <option value="completed">{t('status.completed')}</option>
          <option value="delayed">{t('status.delayed')}</option>
        </Select>
        <Select value={department} onChange={e => setDepartment(e.target.value)} className="sm:w-52">
          <option value="all">{t('common.all')} — Department</option>
          {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={manager} onChange={e => setManager(e.target.value)} className="sm:w-52">
          <option value="all">{t('common.all')} — Manager</option>
          {managerOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={memberId} onChange={e => setMemberId(e.target.value)} className="sm:w-56">
          <option value="all">{t('common.all')} — {t('task.assignee')}</option>
          {memberOptions.map(u => (
            <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
          ))}
        </Select>
        <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="sm:w-44">
          <option value="recent">{t('common.sort')}: Recent</option>
          <option value="name">{t('common.sort')}: Name</option>
          <option value="completion">{t('common.sort')}: Completion</option>
          <option value="deadline">{t('common.sort')}: Deadline</option>
        </Select>
      </div>

      {!hydrated ? (
        <div className="space-y-3">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8" />}
          title={t('project.none')}
          action={canManage ? (<Link href="/projects/new"><Button><Plus className="h-4 w-4" />{t('project.new')}</Button></Link>) : undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-5 py-3 text-start">{t('project.name')}</th>
                  <th className="px-5 py-3 text-start">Department</th>
                  <th className="px-5 py-3 text-start">{t('project.status')}</th>
                  <th className="px-5 py-3 text-start">{t('project.owner')}</th>
                  <th className="px-5 py-3 text-start">Manager</th>
                  <th className="px-5 py-3 text-start">Start</th>
                  <th className="px-5 py-3 text-start">Estimated</th>
                  <th className="px-5 py-3 text-start">Actual End</th>
                  <th className="px-5 py-3 text-start">Overdue</th>
                  <th className="px-5 py-3 text-start">{t('project.completion_rate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {filtered.map(p => {
                  const ids = membersByProject.get(p.id) ?? new Set<string>();
                  const members = users.filter(u => ids.has(u.id));
                  const extra = Math.max(0, ids.size - members.length);
                  const health = projectHealth(p);
                  const isOpen = expanded.has(p.id);
                  const projTasks = tasksByProject.get(p.id) ?? [];
                  return (
                    <React.Fragment key={p.id}>
                      <tr className={cn('text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60', isOpen && 'bg-slate-50 dark:bg-slate-800/40')}>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleExpand(p.id)}
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                            className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            <ChevronRight className={cn('h-4 w-4 transition-transform rtl-flip', isOpen && 'rotate-90')} />
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/projects/${p.id}`} className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', healthClasses[health])} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                              {p.description && (
                                <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.description}</div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{p.sector ?? '—'}</td>
                        <td className="px-5 py-3"><ProjectStatusBadge status={p.status} /></td>
                        <td className="px-5 py-3">
                          {p.owner_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar size={24} name={p.owner_name} email={p.owner_email} />
                              <span className="truncate text-slate-700 dark:text-slate-200">{p.owner_name}</span>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {p.project_manager ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(p.start_date)}</td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(p.estimated_end_date)}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {p.actual_end_date
                            ? <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatDate(p.actual_end_date)}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {(() => {
                            if (p.status === 'completed' || !p.estimated_end_date) return <span className="text-slate-400">—</span>;
                            const diff = daysBetween(new Date().toISOString().slice(0, 10), p.estimated_end_date);
                            if (diff === null) return <span className="text-slate-400">—</span>;
                            if (diff >= 0) return <span className="text-xs text-slate-500">in {diff}d</span>;
                            return <span className="text-xs font-semibold text-rose-600">{Math.abs(diff)}d overdue</span>;
                          })()}
                        </td>
                        <td className="px-5 py-3 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Progress value={Number(p.completion_rate)} className="w-28" />
                            <span className="text-xs font-semibold w-10 text-end">{Math.round(Number(p.completion_rate))}%</span>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/50">
                          <td></td>
                          <td colSpan={10} className="px-5 pb-4 pt-0">
                            {projTasks.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700">
                                {t('task.none')}
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                                  <thead className="bg-slate-50/80 dark:bg-slate-900/80">
                                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                      <th className="px-4 py-2 text-start">{t('task.title')}</th>
                                      <th className="px-4 py-2 text-start">{t('task.status')}</th>
                                      <th className="px-4 py-2 text-start">{t('task.assignee')}</th>
                                      <th className="px-4 py-2 text-start">{t('task.completion')}</th>
                                      <th className="px-4 py-2 text-start">{t('task.due_date')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {projTasks.map(task => {
                                      const today = new Date().toISOString().slice(0, 10);
                                      const overdue = task.due_date && task.due_date < today && task.status !== 'done';
                                      return (
                                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                          <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                                            <Link href={`/projects/${p.id}`} className="hover:text-brand-600">{task.title}</Link>
                                          </td>
                                          <td className="px-4 py-2"><TaskStatusBadge status={task.status} /></td>
                                          <td className="px-4 py-2">
                                            {task.assignee_name ? (
                                              <div className="flex items-center gap-1.5">
                                                <Avatar size={20} name={task.assignee_name} email={task.assignee_email} />
                                                <span className="text-slate-700 dark:text-slate-200">{task.assignee_name}</span>
                                              </div>
                                            ) : <span className="text-slate-400">—</span>}
                                          </td>
                                          <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                              <Progress value={task.completion_percentage} className="w-20" />
                                              <span className="font-medium">{task.completion_percentage}%</span>
                                            </div>
                                          </td>
                                          <td className={cn('px-4 py-2', overdue ? 'font-semibold text-rose-600' : 'text-slate-600 dark:text-slate-300')}>
                                            {formatDate(task.due_date)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
