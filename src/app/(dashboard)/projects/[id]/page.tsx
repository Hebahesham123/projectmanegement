'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, ArrowLeft, LayoutList, LayoutGrid } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/lib/types';
import { useData } from '@/lib/store/data';
import { useAuth, canManageProjects } from '@/lib/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProjectStatusBadge } from '@/components/projects/StatusBadge';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskList } from '@/components/tasks/TaskList';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskComments } from '@/components/tasks/TaskComments';
import { Progress } from '@/components/ui/Progress';
import { formatDate, projectActualDuration, projectHealth, healthClasses, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { profile } = useAuth();
  const canManage = canManageProjects(profile?.role);
  const supabase = createClient();
  const { projects, tasks, hydrated } = useData();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === id) ?? null, [projects, id]);
  const projectTasks = useMemo(
    () => tasks.filter(x => x.project_id === id).sort((a, b) => a.order_index - b.order_index),
    [tasks, id]
  );

  const deleteProject = async () => {
    if (!confirm(t('common.confirm_delete'))) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Project deleted');
    router.push('/projects');
  };

  const deleteTask = async (tid: string) => {
    if (!confirm(t('common.confirm_delete'))) return;
    const { error } = await supabase.from('tasks').delete().eq('id', tid);
    if (error) toast.error(error.message);
    setTaskEditing(null);
  };

  if (!hydrated) {
    return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;
  }
  if (!project) return <div className="text-sm text-slate-500">Not found.</div>;

  const duration = projectActualDuration(project);
  const health = projectHealth(project);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4 rtl-flip" /> {t('nav.projects')}
        </button>

        <Card>
          <div className={cn('h-1 w-full', healthClasses[health])} />
          <CardBody>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                  <ProjectStatusBadge status={project.status} />
                </div>
                {project.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <Info label={t('project.sector')} value={project.sector ?? '—'} />
                  <Info label={t('project.owner')} value={project.owner_name ?? '—'} />
                  <Info label={t('project.manager')} value={project.project_manager ?? '—'} />
                  <Info label={t('project.start_date')} value={formatDate(project.start_date)} />
                  <Info label={t('project.estimated_end_date')} value={formatDate(project.estimated_end_date)} />
                </div>
                <div className="mt-4 max-w-md">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{t('project.completion_rate')}</span>
                    <span className="font-bold">{Math.round(Number(project.completion_rate))}%</span>
                  </div>
                  <Progress value={Number(project.completion_rate)} />
                </div>
                {duration !== null && (
                  <div className="mt-3 text-xs text-slate-500">
                    {t('project.actual_duration')}: <span className="font-medium text-slate-700 dark:text-slate-200">{duration} {t('project.days')}</span>
                  </div>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditProjectOpen(true)}><Pencil className="h-4 w-4" />{t('common.edit')}</Button>
                  <Button variant="danger" onClick={deleteProject}><Trash2 className="h-4 w-4" />{t('common.delete')}</Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t('project.tasks')} ({projectTasks.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                <button
                  onClick={() => setView('list')}
                  className={cn('rounded-lg px-2.5 py-1 text-xs font-medium', view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300')}
                >
                  <LayoutList className="h-3.5 w-3.5 inline me-1" />{t('project.list')}
                </button>
                <button
                  onClick={() => setView('kanban')}
                  className={cn('rounded-lg px-2.5 py-1 text-xs font-medium', view === 'kanban' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300')}
                >
                  <LayoutGrid className="h-3.5 w-3.5 inline me-1" />{t('project.kanban')}
                </button>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setNewTaskOpen(true)}><Plus className="h-4 w-4" />{t('task.new')}</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {view === 'list' ? (
            <TaskList tasks={projectTasks} onRowClick={setTaskEditing} />
          ) : (
            <KanbanBoard tasks={projectTasks} onCardClick={setTaskEditing} />
          )}
        </CardBody>
      </Card>

      <Modal open={editProjectOpen} onClose={() => setEditProjectOpen(false)} title={t('project.edit')} size="lg">
        <ProjectForm initial={project} onDone={() => setEditProjectOpen(false)} />
      </Modal>

      <Modal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} title={t('task.new')} size="lg">
        <TaskForm projectId={project.id} onDone={() => setNewTaskOpen(false)} />
      </Modal>

      <Modal open={!!taskEditing} onClose={() => setTaskEditing(null)} title={taskEditing?.title ?? ''} size="lg">
        {taskEditing && (
          <div className="space-y-6">
            <TaskForm
              projectId={project.id}
              initial={taskEditing}
              onDone={() => setTaskEditing(null)}
            />
            {canManage && (
              <div className="flex justify-end">
                <Button variant="danger" size="sm" onClick={() => deleteTask(taskEditing.id)}>
                  <Trash2 className="h-4 w-4" />{t('common.delete')}
                </Button>
              </div>
            )}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <h4 className="mb-3 text-sm font-semibold">{t('task.comments')}</h4>
              <TaskComments taskId={taskEditing.id} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
