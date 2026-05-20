import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';

export type ActivityEntity = 'project' | 'task' | 'comment';
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'commented';

const ACTIVITY_LOG_VIEWERS = ['mohamed.naguib@nstextile-eg.com'];

export function canViewActivityLog(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const email = profile.email?.toLowerCase() ?? '';
  if (ACTIVITY_LOG_VIEWERS.includes(email)) return true;
  const name = (profile.full_name ?? '').toLowerCase();
  if (name.includes('karim')) return true;
  return false;
}

export async function logActivity(params: {
  actorId: string | null;
  entityType: ActivityEntity;
  entityId: string;
  action: ActivityAction;
  meta?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    await supabase.from('activity_log').insert({
      actor_id: params.actorId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      meta: params.meta ?? null,
    });
  } catch (err) {
    console.warn('[activity] log failed', err);
  }
}
