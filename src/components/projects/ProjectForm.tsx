'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select, Label } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useData } from '@/lib/store/data';
import toast from 'react-hot-toast';
import type { Project, ProjectStatus } from '@/lib/types';

export function ProjectForm({ initial, onDone }: { initial?: Partial<Project>; onDone?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sector: initial?.sector ?? '',
    owner_name: initial?.owner_name ?? '',
    owner_email: initial?.owner_email ?? '',
    owner_mobile: initial?.owner_mobile ?? '',
    start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
    estimated_end_date: initial?.estimated_end_date ?? '',
    status: (initial?.status ?? 'not_started') as ProjectStatus,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        estimated_end_date: form.estimated_end_date || null,
        created_by: user?.id ?? null,
      };
      const res = initial?.id
        ? await supabase.from('projects').update(payload).eq('id', initial.id).select().single()
        : await supabase.from('projects').insert(payload).select().single();
      if (res.error) { toast.error(res.error.message); return; }
      const saved = res.data as Project;
      // Optimistic store patch so UI reflects instantly (realtime will reconcile)
      useData.getState().applyProject({
        new: saved,
        old: initial?.id ? { id: initial.id } : null,
        eventType: initial?.id ? 'UPDATE' : 'INSERT',
      });
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="sector">{t('project.sector')}</Label>
          <Input id="sector" value={form.sector ?? ''} onChange={e => setForm({ ...form, sector: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="status">{t('project.status')}</Label>
          <Select id="status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
            <option value="not_started">{t('status.not_started')}</option>
            <option value="in_progress">{t('status.in_progress')}</option>
            <option value="completed">{t('status.completed')}</option>
            <option value="delayed">{t('status.delayed')}</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{t('project.owner')}</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="owner_name">{t('project.owner_name')}</Label>
            <Input id="owner_name" value={form.owner_name ?? ''} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
          </div>
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
          <Label htmlFor="start_date">{t('project.start_date')}</Label>
          <Input id="start_date" type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="estimated_end_date">{t('project.estimated_end_date')}</Label>
          <Input id="estimated_end_date" type="date" value={form.estimated_end_date ?? ''} onChange={e => setForm({ ...form, estimated_end_date: e.target.value })} />
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
