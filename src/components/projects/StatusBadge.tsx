'use client';

import { Badge } from '@/components/ui/Badge';
import { projectStatusMeta, taskStatusMeta } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import type { ProjectStatus, TaskStatus } from '@/lib/types';

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n();
  const meta = projectStatusMeta[status];
  return <Badge className={meta.badge} dot={meta.dot}>{t(meta.labelKey)}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useI18n();
  const meta = taskStatusMeta[status];
  return <Badge className={meta.badge} dot={meta.dot}>{t(meta.labelKey)}</Badge>;
}
