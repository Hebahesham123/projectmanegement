'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useData } from '@/lib/store/data';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { usePersistentState } from '@/lib/hooks/usePersistentState';
import { canViewActivityLog } from '@/lib/activity/log';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ActivityItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type Row = ActivityItem;

const ACTIONS = ['created', 'updated', 'deleted', 'status_changed', 'assigned', 'commented'] as const;
const ENTITIES = ['project', 'task', 'comment'] as const;

export default function ActivityPage() {
  const { t } = useI18n();
  const { profile, loading: authLoading } = useAuth();
  const { users, projects, tasks } = useData();
  const supabase = createClient();
  const canSee = canViewActivityLog(profile);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [actor, setActor] = usePersistentState<string | 'all'>('activity.filter.actor', 'all');
  const [action, setAction] = usePersistentState<string | 'all'>('activity.filter.action', 'all');
  const [entity, setEntity] = usePersistentState<string | 'all'>('activity.filter.entity', 'all');
  const [from, setFrom] = usePersistentState<string>('activity.filter.from', '');
  const [to, setTo] = usePersistentState<string>('activity.filter.to', '');
  const [q, setQ] = usePersistentState<string>('activity.filter.q', '');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  };

  useEffect(() => { if (canSee) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [canSee]);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const taskMap = useMemo(() => new Map(tasks.map(x => [x.id, x])), [tasks]);

  const filtered = useMemo(() => {
    let list = rows;
    if (actor !== 'all') list = list.filter(r => r.actor_id === actor);
    if (action !== 'all') list = list.filter(r => r.action === action);
    if (entity !== 'all') list = list.filter(r => r.entity_type === entity);
    if (from) list = list.filter(r => r.created_at.slice(0, 10) >= from);
    if (to) list = list.filter(r => r.created_at.slice(0, 10) <= to);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(r => JSON.stringify(r.meta ?? {}).toLowerCase().includes(needle));
    }
    return list;
  }, [rows, actor, action, entity, from, to, q]);

  if (authLoading || !profile) {
    return <div className="text-sm text-slate-500">{t('common.loading')}</div>;
  }
  if (!canSee) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardBody className="py-12 text-center text-slate-500">
            You do not have permission to view the activity log.
          </CardBody>
        </Card>
      </div>
    );
  }

  const describe = (r: Row) => {
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    if (r.entity_type === 'project') {
      const name = (meta.name as string) || projectMap.get(r.entity_id)?.name || 'project';
      if (r.action === 'created') return `created project "${name}"`;
      if (r.action === 'updated') return `updated project "${name}"`;
      if (r.action === 'deleted') return `deleted project "${name}"`;
      if (r.action === 'status_changed') return `changed status of "${name}" from ${meta.from_status} → ${meta.to_status}`;
    }
    if (r.entity_type === 'task') {
      const title = (meta.title as string) || taskMap.get(r.entity_id)?.title || 'task';
      if (r.action === 'created') return `created task "${title}"`;
      if (r.action === 'updated') return `updated task "${title}"`;
      if (r.action === 'deleted') return `deleted task "${title}"`;
      if (r.action === 'status_changed') return `changed status of "${title}" from ${meta.from_status} → ${meta.to_status}`;
      if (r.action === 'assigned') return `assigned "${title}" to ${meta.assignee_name ?? '—'}`;
    }
    if (r.entity_type === 'comment') {
      const target = meta.task_title || meta.project_name || 'item';
      const snippet = typeof meta.body === 'string' && meta.body ? `: "${meta.body.slice(0, 80)}${meta.body.length > 80 ? '…' : ''}"` : '';
      if (r.action === 'commented') return `commented on "${target}"${snippet}`;
      if (r.action === 'deleted') return `deleted a comment${snippet}`;
    }
    return `${r.action} ${r.entity_type}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity log</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} {t('common.of')} {rows.length}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
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
        <Select value={actor} onChange={e => setActor(e.target.value)} className="sm:w-56">
          <option value="all">All users</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
          ))}
        </Select>
        <Select value={action} onChange={e => setAction(e.target.value)} className="sm:w-44">
          <option value="all">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </Select>
        <Select value={entity} onChange={e => setEntity(e.target.value)} className="sm:w-40">
          <option value="all">All types</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
        </Select>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-40"
        />
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-40"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-slate-500">
              <Activity className="h-8 w-8 text-slate-300" />
              No activity matches the current filters.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(r => {
                const actorUser = r.actor_id ? userMap.get(r.actor_id) : null;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-4">
                    <Avatar name={actorUser?.full_name} email={actorUser?.email} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {actorUser?.full_name ?? actorUser?.email ?? 'Unknown user'}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300"> {describe(r)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatDate(r.created_at, 'MMM d, yyyy HH:mm')}</span>
                        <span>·</span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.entity_type}</span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.action.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
