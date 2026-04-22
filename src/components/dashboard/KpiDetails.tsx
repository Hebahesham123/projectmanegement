'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { Project, Task } from '@/lib/types';
import { Card, CardBody } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { ProjectStatusBadge, TaskStatusBadge } from '@/components/projects/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export type KpiKey = 'total' | 'active' | 'delayed' | 'completion' | 'tasks' | 'overdue';

export function KpiDetails({
  kpi,
  projects,
  tasks,
  onClose,
}: {
  kpi: KpiKey;
  projects: Project[];
  tasks: Task[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);

  const titleMap: Record<KpiKey, string> = {
    total: t('kpi.total_projects'),
    active: t('kpi.active_projects'),
    delayed: t('kpi.delayed_projects'),
    completion: t('kpi.completion_rate'),
    tasks: t('kpi.total_tasks'),
    overdue: t('kpi.overdue_tasks'),
  };

  const filteredProjects = (() => {
    switch (kpi) {
      case 'total': return projects;
      case 'active': return projects.filter(p => p.status === 'in_progress');
      case 'delayed': return projects.filter(p => p.status === 'delayed');
      case 'completion': return [...projects].sort((a, b) => Number(b.completion_rate) - Number(a.completion_rate));
      default: return [];
    }
  })();

  const filteredTasks = (() => {
    if (kpi === 'tasks') return tasks;
    if (kpi === 'overdue') return tasks.filter(x => x.due_date && x.due_date < today && x.status !== 'done');
    return [];
  })();

  const showTasks = kpi === 'tasks' || kpi === 'overdue';
  const count = showTasks ? filteredTasks.length : filteredProjects.length;

  return (
    <Card className="animate-slide-up">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{titleMap[kpi]}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {count}
          </span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <CardBody className="p-0">
        {count === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">{t('common.empty')}</div>
        ) : showTasks ? (
          <TaskRows tasks={filteredTasks} projects={projects} />
        ) : (
          <ProjectRows projects={filteredProjects} showRank={kpi === 'completion'} />
        )}
      </CardBody>
    </Card>
  );
}

function ProjectRows({ projects, showRank }: { projects: Project[]; showRank?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {projects.map((p, i) => (
        <li key={p.id}>
          <Link
            href={`/projects/${p.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            {showRank && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                #{i + 1}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {p.sector ?? '—'} · {p.owner_name ?? '—'} · due {formatDate(p.estimated_end_date, 'MMM d')}
              </div>
            </div>
            <div className="hidden w-40 shrink-0 sm:block">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold">{Math.round(Number(p.completion_rate))}%</span>
              </div>
              <Progress value={Number(p.completion_rate)} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TaskRows({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const projectMap = new Map(projects.map(p => [p.id, p]));
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {tasks.map(task => {
        const overdue = task.due_date && task.due_date < today && task.status !== 'done';
        const proj = projectMap.get(task.project_id);
        return (
          <li key={task.id}>
            <Link
              href={`/projects/${task.project_id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</span>
                  <TaskStatusBadge status={task.status} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {proj?.name ?? '—'} · {task.assignee_name ?? '—'}
                </div>
              </div>
              {task.assignee_name && (
                <Avatar size={28} name={task.assignee_name} email={task.assignee_email} />
              )}
              <div className={cn('hidden w-28 shrink-0 text-end text-xs sm:block', overdue ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                {formatDate(task.due_date, 'MMM d')}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
