'use client';

import { useMemo, useState } from 'react';
import { FolderKanban, Zap, AlertTriangle, TrendingUp, ListChecks, Clock } from 'lucide-react';
import { useData } from '@/lib/store/data';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { KpiDetails, type KpiKey } from '@/components/dashboard/KpiDetails';
import { TasksByStatusChart } from '@/components/dashboard/TasksByStatusChart';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { TasksProgress } from '@/components/dashboard/TasksProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { DEPARTMENTS } from '@/lib/constants';

export default function DashboardPage() {
  const { t } = useI18n();
  const { projects: allProjects, tasks: allTasks, comments, hydrated } = useData();
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [department, setDepartment] = useState<string | 'all'>('all');

  const departmentOptions = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    for (const p of allProjects) if (p.sector) set.add(p.sector);
    return Array.from(set).sort();
  }, [allProjects]);

  // Scope projects + tasks by the selected department
  const { projects, tasks } = useMemo(() => {
    if (department === 'all') return { projects: allProjects, tasks: allTasks };
    const scoped = allProjects.filter(p => p.sector === department);
    const ids = new Set(scoped.map(p => p.id));
    return { projects: scoped, tasks: allTasks.filter(t => ids.has(t.project_id)) };
  }, [allProjects, allTasks, department]);

  const { active, delayed, overallCompletion, overdueTasks } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      active: projects.filter(p => p.status === 'in_progress').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
      overallCompletion: projects.length === 0
        ? 0
        : Math.round(projects.reduce((s, p) => s + Number(p.completion_rate), 0) / projects.length),
      overdueTasks: tasks.filter(x => x.due_date && x.due_date < today && x.status !== 'done').length,
    };
  }, [projects, tasks]);

  const toggle = (k: KpiKey) => setActiveKpi(activeKpi === k ? null : k);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.dashboard')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {department === 'all' ? t('app.tagline') : <>Showing: <span className="font-medium">{department}</span></>}
          </p>
        </div>
        <Select value={department} onChange={e => setDepartment(e.target.value)} className="sm:w-60">
          <option value="all">All departments</option>
          {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t('kpi.total_projects')} value={projects.length} icon={<FolderKanban className="h-5 w-5" />} accent="brand" active={activeKpi === 'total'} onClick={() => toggle('total')} />
        <KpiCard label={t('kpi.active_projects')} value={active} icon={<Zap className="h-5 w-5" />} accent="emerald" active={activeKpi === 'active'} onClick={() => toggle('active')} />
        <KpiCard label={t('kpi.delayed_projects')} value={delayed} icon={<AlertTriangle className="h-5 w-5" />} accent="rose" active={activeKpi === 'delayed'} onClick={() => toggle('delayed')} />
        <KpiCard label={t('kpi.completion_rate')} value={`${overallCompletion}%`} icon={<TrendingUp className="h-5 w-5" />} accent="amber" active={activeKpi === 'completion'} onClick={() => toggle('completion')} />
        <KpiCard label={t('kpi.total_tasks')} value={tasks.length} icon={<ListChecks className="h-5 w-5" />} accent="sky" active={activeKpi === 'tasks'} onClick={() => toggle('tasks')} />
        <KpiCard label={t('kpi.overdue_tasks')} value={overdueTasks} icon={<Clock className="h-5 w-5" />} accent="violet" active={activeKpi === 'overdue'} onClick={() => toggle('overdue')} />
      </div>

      {activeKpi && (
        <KpiDetails kpi={activeKpi} projects={projects} tasks={tasks} onClose={() => setActiveKpi(null)} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>{t('widget.tasks_by_status')}</CardTitle></CardHeader>
          <CardBody><TasksByStatusChart tasks={tasks} /></CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t('widget.progress_per_project')}</CardTitle></CardHeader>
          <CardBody><ProgressChart projects={projects} /></CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t('widget.upcoming_deadlines')}</CardTitle></CardHeader>
          <CardBody className="pt-2"><UpcomingDeadlines tasks={tasks} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tasks Progress</CardTitle></CardHeader>
          <CardBody><TasksProgress tasks={tasks} projects={projects} /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('widget.recent_activity')}</CardTitle></CardHeader>
          <CardBody><RecentActivity tasks={tasks} comments={comments} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
