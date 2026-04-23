'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Label } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useData } from '@/lib/store/data';
import { DEPARTMENTS, PROJECT_MANAGERS } from '@/lib/constants';
import { notify, buildEmail } from '@/lib/notifications/notify';
import toast from 'react-hot-toast';
import type { Project, ProjectStatus } from '@/lib/types';

function humanStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function formatYmd(d: string | null | undefined) {
  if (!d) return 'Not set';
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
}

export function ProjectForm({ initial, onDone }: { initial?: Partial<Project>; onDone?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const { tasks, users } = useData();
  const [loading, setLoading] = useState(false);

  // Sorted list of all users — admins first, then team members, then alphabetical
  const ownerOptions = useMemo(() => {
    const roleOrder = { admin: 0, project_manager: 1, team_member: 2 } as const;
    return [...users].sort((a, b) => {
      const r = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
      if (r !== 0) return r;
      return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
    });
  }, [users]);

  const projectTasks = useMemo(
    () => (initial?.id ? tasks.filter(x => x.project_id === initial.id) : []),
    [initial?.id, tasks]
  );
  const hasTasks = projectTasks.length > 0;

  // Average task completion
  const tasksAvg = useMemo(() => {
    if (projectTasks.length === 0) return null;
    const total = projectTasks.reduce((s, x) => s + x.completion_percentage, 0);
    return Math.round(total / projectTasks.length);
  }, [projectTasks]);

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sector: initial?.sector ?? '',
    owner_name: initial?.owner_name ?? '',
    owner_email: initial?.owner_email ?? '',
    owner_mobile: initial?.owner_mobile ?? '',
    project_manager: initial?.project_manager ?? '',
    start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
    estimated_end_date: initial?.estimated_end_date ?? '',
    actual_end_date: initial?.actual_end_date ?? '',
    end_date_mode: (initial?.end_date_mode ?? 'auto') as 'auto' | 'manual',
    status: (initial?.status ?? 'not_started') as ProjectStatus,
    completion_rate: Number(initial?.completion_rate ?? 0),
  });

  // When admin picks an owner from the dropdown, auto-fill contact fields
  function handleOwnerSelect(userId: string) {
    if (!userId) {
      setForm(prev => ({ ...prev, owner_name: '', owner_email: '', owner_mobile: '' }));
      return;
    }
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setForm(prev => ({
      ...prev,
      owner_name: u.full_name ?? u.email,
      owner_email: u.email,
      owner_mobile: u.mobile ?? '',
    }));
  }

  // Date-based progress: (today - start) / (estimated_end - start)
  const dateProgress = useMemo(() => {
    if (!form.start_date || !form.estimated_end_date) return null;
    const start = new Date(form.start_date).getTime();
    const end = new Date(form.estimated_end_date).getTime();
    if (end <= start) return null;
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [form.start_date, form.estimated_end_date]);

  // Derived completion — rules:
  //   status = completed  → 100
  //   has tasks           → average task completion
  //   else (no tasks)     → date-based progress
  //   else                → 0
  const computedCompletion = useMemo(() => {
    if (form.status === 'completed') return 100;
    if (tasksAvg !== null) return tasksAvg;
    if (dateProgress !== null) return dateProgress;
    return 0;
  }, [form.status, tasksAvg, dateProgress]);

  // Keep form.completion_rate in sync with the computed value
  useEffect(() => {
    if (computedCompletion !== form.completion_rate) {
      setForm(prev => ({ ...prev, completion_rate: computedCompletion }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedCompletion]);

  // Figure out which option is currently selected (by matching saved owner name/email)
  const selectedOwnerId = useMemo(() => {
    if (!form.owner_name && !form.owner_email) return '';
    const byEmail = users.find(u => u.email === form.owner_email);
    if (byEmail) return byEmail.id;
    const byName = users.find(u => (u.full_name ?? u.email) === form.owner_name);
    return byName?.id ?? '__legacy__';
  }, [users, form.owner_name, form.owner_email]);

  // When admin changes status to "completed", auto-set completion to 100
  function handleStatusChange(next: ProjectStatus) {
    setForm(prev => ({
      ...prev,
      status: next,
      completion_rate: next === 'completed' ? 100 : prev.completion_rate,
      actual_end_date:
        next === 'completed' && !prev.actual_end_date
          ? new Date().toISOString().slice(0, 10)
          : prev.actual_end_date,
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        estimated_end_date: form.estimated_end_date || null,
        actual_end_date: form.actual_end_date || null,
        // If admin entered an end date → manual (trigger won't touch it)
        // If empty → auto (trigger computes it from tasks)
        end_date_mode: form.actual_end_date ? 'manual' : 'auto',
        project_manager: form.project_manager || null,
        owner_name: form.owner_name || null,
        created_by: user?.id ?? null,
      };
      const res = initial?.id
        ? await supabase.from('projects').update(payload).eq('id', initial.id).select().single()
        : await supabase.from('projects').insert(payload).select().single();
      if (res.error) { toast.error(res.error.message); return; }
      const saved = res.data as Project;
      useData.getState().applyProject({
        new: saved,
        old: initial?.id ? { id: initial.id } : null,
        eventType: initial?.id ? 'UPDATE' : 'INSERT',
      });

      const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const href = `/projects/${saved.id}`;

      // 1) Project assigned — owner changed or project is brand-new
      const ownerChanged = !!saved.owner_email && saved.owner_email !== (initial?.owner_email ?? null);
      if (ownerChanged) {
        const ownerUser = users.find(u => u.email === saved.owner_email);
        const mail = buildEmail({
          accent: 'brand',
          eyebrow: initial?.id ? 'Project reassigned' : 'New project',
          preheader: `You are the owner of "${saved.name}"`,
          heading: `You've been assigned as owner: ${saved.name}`,
          recipientName: saved.owner_name ?? undefined,
          intro: `A project has been assigned to you on NS Project Tracker. Review the details and get started.`,
          facts: [
            { label: 'Project', value: saved.name },
            { label: 'Department', value: saved.sector ?? '—' },
            { label: 'Project manager', value: saved.project_manager ?? '—' },
            { label: 'Start date', value: formatYmd(saved.start_date) },
            { label: 'Estimated end', value: formatYmd(saved.estimated_end_date) },
            { label: 'Status', value: humanStatus(saved.status) },
          ],
          message: saved.description || undefined,
          cta: { label: 'Open project', href: `${origin}${href}` },
        });
        if (ownerUser) {
          notify({
            userId: ownerUser.id,
            kind: 'project_update',
            title: `You were assigned project: ${saved.name}`,
            body: saved.estimated_end_date ? `Est. end ${formatYmd(saved.estimated_end_date)}` : undefined,
            link: href,
            email: { to: saved.owner_email!, subject: `[NS Project Tracker] You were assigned project: ${saved.name}`, html: mail.html, text: mail.text },
          });
        } else {
          // owner is not a system user — still send email, skip in-app row
          fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: saved.owner_email!, subject: `[NS Project Tracker] You were assigned project: ${saved.name}`, html: mail.html, text: mail.text }),
          }).catch(() => {});
        }
      }

      // 2) Project became delayed
      const becameDelayed = saved.status === 'delayed' && initial?.status !== 'delayed';
      if (becameDelayed && saved.owner_email) {
        const ownerUser = users.find(u => u.email === saved.owner_email);
        const mail = buildEmail({
          accent: 'rose',
          eyebrow: 'Project delayed',
          preheader: `"${saved.name}" has been marked delayed`,
          heading: `Project marked as delayed: ${saved.name}`,
          recipientName: saved.owner_name ?? undefined,
          intro: `This project is now marked as delayed. Please review timelines and take corrective action.`,
          facts: [
            { label: 'Project', value: saved.name },
            { label: 'Status', value: 'Delayed' },
            { label: 'Estimated end', value: formatYmd(saved.estimated_end_date) },
            { label: 'Completion', value: `${Math.round(Number(saved.completion_rate))}%` },
          ],
          cta: { label: 'Review project', href: `${origin}${href}` },
        });
        if (ownerUser) {
          notify({
            userId: ownerUser.id,
            kind: 'project_update',
            title: `Project delayed: ${saved.name}`,
            body: `${Math.round(Number(saved.completion_rate))}% complete`,
            link: href,
            email: { to: saved.owner_email, subject: `[NS Project Tracker] Project delayed: ${saved.name}`, html: mail.html, text: mail.text },
          });
        } else {
          fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: saved.owner_email, subject: `[NS Project Tracker] Project delayed: ${saved.name}`, html: mail.html, text: mail.text }),
          }).catch(() => {});
        }
      }

      toast.success(initial?.id ? 'Project updated' : 'Project created');
      if (onDone) onDone();
      else router.push(`/projects/${saved.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
      console.error('Project save error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Label htmlFor="name">{t('project.name')}</Label>
        <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="description">{t('project.description')}</Label>
        <Textarea id="description" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Dates</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="estimated_end_date">Estimated end date</Label>
            <Input id="estimated_end_date" type="date" value={form.estimated_end_date ?? ''} onChange={e => setForm({ ...form, estimated_end_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="actual_end_date">Actual end date</Label>
            <Input
              id="actual_end_date"
              type="date"
              value={form.actual_end_date ?? ''}
              onChange={e => setForm({ ...form, actual_end_date: e.target.value })}
              title="Leave empty to auto-calculate from tasks when all are done."
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Leave <strong>Actual end date</strong> empty to let the system stamp it automatically when all tasks are done. Enter a date to override.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="sector">Department</Label>
          <Select id="sector" value={form.sector ?? ''} onChange={e => setForm({ ...form, sector: e.target.value })}>
            <option value="">— Select —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            {form.sector && !DEPARTMENTS.includes(form.sector as (typeof DEPARTMENTS)[number]) && (
              <option value={form.sector}>{form.sector} (legacy)</option>
            )}
          </Select>
        </div>
        <div>
          <Label htmlFor="owner_name">Project Owner</Label>
          <Select id="owner_name" value={selectedOwnerId} onChange={e => handleOwnerSelect(e.target.value)}>
            <option value="">— Select —</option>
            {ownerOptions.map(u => {
              const label = u.full_name ?? u.email;
              const isAdmin = u.role === 'admin';
              return (
                <option key={u.id} value={u.id}>
                  {label}{isAdmin ? ' (admin)' : ''}
                </option>
              );
            })}
            {selectedOwnerId === '__legacy__' && form.owner_name && (
              <option value="__legacy__">{form.owner_name} (legacy)</option>
            )}
          </Select>
        </div>
        <div>
          <Label htmlFor="project_manager">Project Manager</Label>
          <Select id="project_manager" value={form.project_manager ?? ''} onChange={e => setForm({ ...form, project_manager: e.target.value })}>
            <option value="">— Select —</option>
            {PROJECT_MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
            {form.project_manager && !PROJECT_MANAGERS.includes(form.project_manager as (typeof PROJECT_MANAGERS)[number]) && (
              <option value={form.project_manager}>{form.project_manager} (legacy)</option>
            )}
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Owner contact (optional)</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="owner_email">{t('project.owner_email')}</Label>
            <Input id="owner_email" type="email" value={form.owner_email ?? ''} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="owner_mobile">{t('project.owner_mobile')}</Label>
            <Input id="owner_mobile" value={form.owner_mobile ?? ''} onChange={e => setForm({ ...form, owner_mobile: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="status">{t('project.status')}</Label>
          <Select id="status" value={form.status} onChange={e => handleStatusChange(e.target.value as ProjectStatus)}>
            <option value="not_started">{t('status.not_started')}</option>
            <option value="in_progress">{t('status.in_progress')}</option>
            <option value="completed">{t('status.completed')}</option>
            <option value="delayed">{t('status.delayed')}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="completion">
            Completion %
            <span className="ms-2 text-[11px] font-normal text-slate-400">
              ({form.status === 'completed'
                ? 'auto: 100'
                : tasksAvg !== null
                  ? 'auto: avg of tasks'
                  : dateProgress !== null
                    ? 'auto: elapsed time'
                    : 'auto'})
            </span>
          </Label>
          <Input
            id="completion"
            type="number"
            min={0}
            max={100}
            value={form.completion_rate}
            disabled
            className="bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => (onDone ? onDone() : router.back())}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={loading}>{t('common.save')}</Button>
      </div>
    </form>
  );
}
