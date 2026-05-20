'use client';

import { useMemo } from 'react';
import { useData } from '@/lib/store/data';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isRestrictedEmail } from '@/lib/constants';

export function useScopedData() {
  const data = useData();
  const { user, profile } = useAuth();

  const email = (user?.email ?? profile?.email ?? '').toLowerCase();
  const restricted = isRestrictedEmail(email);

  const scoped = useMemo(() => {
    if (!restricted) {
      return { projects: data.projects, tasks: data.tasks };
    }
    const tasks = data.tasks.filter(
      t => (t.assignee_email ?? '').toLowerCase() === email
    );
    const taskProjectIds = new Set(tasks.map(t => t.project_id));
    const projects = data.projects.filter(
      p =>
        (p.owner_email ?? '').toLowerCase() === email ||
        taskProjectIds.has(p.id)
    );
    return { projects, tasks };
  }, [restricted, email, data.projects, data.tasks]);

  return {
    ...data,
    projects: scoped.projects,
    tasks: scoped.tasks,
    restricted,
  };
}
