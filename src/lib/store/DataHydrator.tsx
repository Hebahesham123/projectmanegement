'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useData } from './data';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Loads core data (projects/tasks/users/comments/notifications) ONCE when the
 * user is authenticated, then keeps state in sync via realtime. No page needs
 * to refetch on navigation — it just reads from the store.
 */
export function DataHydrator() {
  const { user, loading } = useAuth();
  const { hydrate, reset, applyProject, applyTask, applyComment, applyNotification, applyUser } = useData();

  useEffect(() => {
    if (loading) return;
    if (!user) { reset(); return; }

    hydrate();

    const supabase = createClient();
    const ch = supabase
      .channel('global-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, p =>
        applyProject({ new: p.new as never, old: p.old as never, eventType: p.eventType as never }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, p =>
        applyTask({ new: p.new as never, old: p.old as never, eventType: p.eventType as never }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, p =>
        applyComment({ new: p.new as never, old: p.old as never, eventType: p.eventType as never }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, p =>
        applyNotification({ new: p.new as never, old: p.old as never, eventType: p.eventType as never }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, p =>
        applyUser({ new: p.new as never, old: p.old as never, eventType: p.eventType as never }))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  return null;
}
