'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Label } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useData } from '@/lib/store/data';
import { notify, buildEmail } from '@/lib/notifications/notify';
import toast from 'react-hot-toast';
import { UserX } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';

function humanStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function formatYmd(d: string) {
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
}

export function TaskForm({ projectId, initial, onDone }: { projectId: string; initial?: Partial<Task>; onDone?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const supabase = createClient();
  const { users } = useData();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    assignee_id: initial?.assignee_id ?? '',
    assignee_name: initial?.assignee_name ?? '',
    assignee_email: initial?.assignee_email ?? '',
    assignee_mobile: initial?.assignee_mobile ?? '',
    status: (initial?.status ?? 'todo') as TaskStatus,
    completion_percentage: initial?.completion_percentage ?? 0,
    start_date: initial?.start_date ?? '',
    due_date: initial?.due_date ?? '',
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        project_id: projectId,
        assignee_id: form.assignee_id || null,
        assignee_name: form.assignee_name || null,
        assignee_email: form.assignee_email || null,
        assignee_mobile: form.assignee_mobile || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        created_by: user?.id ?? null,
      };
      const res = initial?.id
        ? await supabase.from('tasks').update(payload).eq('id', initial.id).select().single()
        : await supabase.from('tasks').insert(payload).select().single();
      if (res.error) { toast.error(res.error.message); return; }
      const saved = res.data as Task;
      useData.getState().applyTask({
        new: saved,
        old: initial?.id ? { id: initial.id } : null,
        eventType: initial?.id ? 'UPDATE' : 'INSERT',
      });

      const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const href = `/projects/${saved.project_id}`;
      const projectName = useData.getState().projects.find(p => p.id === saved.project_id)?.name ?? '';

      // 1) Task assigned
      const assigneeChanged = !!saved.assignee_id && saved.assignee_id !== (initial?.assignee_id ?? null);
      if (assigneeChanged && saved.assignee_email) {
        const mail = buildEmail({
          accent: 'brand',
          eyebrow: 'New assignment',
          preheader: `You've been assigned "${saved.title}"`,
          heading: `You have a new task: ${saved.title}`,
          recipientName: saved.assignee_name ?? undefined,
          intro: `A task has been assigned to you on NS Project Tracker. Here are the details:`,
          facts: [
            { label: 'Task', value: saved.title },
            { label: 'Project', value: projectName || '—' },
            { label: 'Status', value: humanStatus(saved.status) },
            { label: 'Due date', value: saved.due_date ? formatYmd(saved.due_date) : 'Not set' },
          ],
          message: saved.description || undefined,
          cta: { label: 'Open task', href: `${origin}${href}` },
        });
        notify({
          userId: saved.assignee_id!,
          kind: 'task_assigned',
          title: `You were assigned: ${saved.title}`,
          body: saved.due_date ? `Due ${saved.due_date}` : undefined,
          link: href,
          email: { to: saved.assignee_email, subject: `[NS Project Tracker] New task: ${saved.title}`, html: mail.html, text: mail.text },
        });
      }

      // 2) Task status changed to blocked/delayed
      const becameDelayed = saved.status === 'blocked' && initial?.status !== 'blocked';
      const dueMissed = saved.due_date && saved.due_date < new Date().toISOString().slice(0, 10) && saved.status !== 'done';
      if ((becameDelayed || dueMissed) && saved.assignee_id && saved.assignee_email) {
        const mail = buildEmail({
          accent: 'rose',
          eyebrow: becameDelayed ? 'Task blocked' : 'Task overdue',
          preheader: `"${saved.title}" needs attention`,
          heading: becameDelayed ? `A task was marked blocked: ${saved.title}` : `Task overdue: ${saved.title}`,
          recipientName: saved.assignee_name ?? undefined,
          intro: becameDelayed
            ? 'This task is currently blocked and requires your attention to unblock.'
            : 'This task has passed its due date without being completed. Please review and take action.',
          facts: [
            { label: 'Task', value: saved.title },
            { label: 'Project', value: projectName || '—' },
            { label: 'Status', value: humanStatus(saved.status) },
            { label: 'Due date', value: saved.due_date ? formatYmd(saved.due_date) : '—' },
          ],
          cta: { label: 'Review task', href: `${origin}${href}` },
        });
        notify({
          userId: saved.assignee_id,
          kind: 'overdue',
          title: becameDelayed ? `Blocked: ${saved.title}` : `Overdue: ${saved.title}`,
          body: saved.due_date ? `Due ${saved.due_date}` : undefined,
          link: href,
          email: { to: saved.assignee_email, subject: `[NS Project Tracker] ${becameDelayed ? 'Blocked' : 'Overdue'}: ${saved.title}`, html: mail.html, text: mail.text },
        });
      }

      toast.success(initial?.id ? 'Task updated' : 'Task created');
      onDone?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
      console.error('Task save error:', err);
    } finally {
      setLoading(false);
    }
  }

  const onUserSelect = (id: string) => {
    const u = users.find(x => x.id === id);
    setForm({
      ...form,
      assignee_id: id,
      assignee_name: u?.full_name ?? form.assignee_name,
      assignee_email: u?.email ?? form.assignee_email,
      assignee_mobile: u?.mobile ?? form.assignee_mobile,
    });
  };

  const clearAssignee = () => {
    setForm({
      ...form,
      assignee_id: '',
      assignee_name: '',
      assignee_email: '',
      assignee_mobile: '',
    });
  };

  const hasAssignee = !!(form.assignee_id || form.assignee_name || form.assignee_email);

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Label htmlFor="title">{t('task.title')}</Label>
        <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="description">{t('task.description')}</Label>
        <Textarea id="description" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('task.assignee')}</h4>
          {hasAssignee && (
            <button
              type="button"
              onClick={clearAssignee}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <UserX className="h-3.5 w-3.5" />
              Remove assignee
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Team Member</Label>
            <Select value={form.assignee_id ?? ''} onChange={e => onUserSelect(e.target.value)}>
              <option value="">— Unassigned —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="a_name">{t('task.assignee_name')}</Label>
            <Input id="a_name" value={form.assignee_name ?? ''} onChange={e => setForm({ ...form, assignee_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="a_email">{t('task.assignee_email')}</Label>
            <Input id="a_email" type="email" value={form.assignee_email ?? ''} onChange={e => setForm({ ...form, assignee_email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="a_mobile">{t('task.assignee_mobile')}</Label>
            <Input id="a_mobile" value={form.assignee_mobile ?? ''} onChange={e => setForm({ ...form, assignee_mobile: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="status">{t('task.status')}</Label>
          <Select id="status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
            <option value="todo">{t('task_status.todo')}</option>
            <option value="in_progress">{t('task_status.in_progress')}</option>
            <option value="done">{t('task_status.done')}</option>
            <option value="blocked">{t('task_status.blocked')}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="completion">{t('task.completion')}</Label>
          <Input id="completion" type="number" min={0} max={100} value={form.completion_percentage}
                 onChange={e => setForm({ ...form, completion_percentage: Number(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor="start">{t('task.start_date')}</Label>
          <Input id="start" type="date" value={form.start_date ?? ''} onChange={e => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="due">{t('task.due_date')}</Label>
          <Input id="due" type="date" value={form.due_date ?? ''} onChange={e => setForm({ ...form, due_date: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
        <Button type="submit" loading={loading}>{t('common.save')}</Button>
      </div>
    </form>
  );
}
