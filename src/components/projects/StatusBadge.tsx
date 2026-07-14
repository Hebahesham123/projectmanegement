'use client';

import { Badge } from '@/components/ui/Badge';
import { projectStatusMeta, taskStatusMeta } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import type { ProjectStatus, TaskStatus } from '@/lib/types';

const fallbackMeta = {
  labelKey: 'status.not_started',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n();
  const meta = projectStatusMeta[status] ?? fallbackMeta;
  const label = projectStatusMeta[status] ? t(meta.labelKey) : (status || '—');
  return <Badge className={meta.badge} dot={meta.dot}>{label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useI18n();
  const meta = taskStatusMeta[status] ?? fallbackMeta;
  const label = taskStatusMeta[status] ? t(meta.labelKey) : (status || '—');
  return <Badge className={meta.badge} dot={meta.dot}>{label}</Badge>;
}
