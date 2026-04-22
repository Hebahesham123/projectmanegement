'use client';

import Link from 'next/link';
import type { Project } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { ProjectStatusBadge } from './StatusBadge';
import { formatDate, projectActualDuration, projectHealth, healthClasses, cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { Building2, Calendar, User } from 'lucide-react';

export function ProjectCard({ project }: { project: Project }) {
  const { t } = useI18n();
  const duration = projectActualDuration(project);
  const health = projectHealth(project);

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className={cn('absolute inset-x-0 top-0 h-1', healthClasses[health])} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-brand-600 dark:text-slate-100">
                {project.name}
              </h3>
            </div>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {project.sector && (
            <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{project.sector}</span>
          )}
          {project.owner_name && (
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{project.owner_name}</span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(project.start_date, 'MMM d')} → {formatDate(project.estimated_end_date, 'MMM d')}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">{t('project.completion_rate')}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(Number(project.completion_rate))}%</span>
          </div>
          <Progress value={Number(project.completion_rate)} />
        </div>

        {duration !== null && (
          <div className="mt-3 text-xs text-slate-500">
            {t('project.actual_duration')}: <span className="font-medium text-slate-700 dark:text-slate-200">{duration} {t('project.days')}</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
