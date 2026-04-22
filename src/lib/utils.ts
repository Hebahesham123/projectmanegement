import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Project, ProjectStatus, TaskStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined, pattern = 'MMM d, yyyy') {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return '—';
  }
}

export function daysBetween(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return null;
  try {
    return differenceInCalendarDays(parseISO(b), parseISO(a));
  } catch {
    return null;
  }
}

export function projectActualDuration(p: Pick<Project, 'start_date' | 'actual_end_date' | 'estimated_end_date'>) {
  const end = p.actual_end_date ?? p.estimated_end_date ?? new Date().toISOString().slice(0, 10);
  return daysBetween(p.start_date, end);
}

export type HealthColor = 'green' | 'yellow' | 'red' | 'gray';

/** Deadline health based on days until estimated end vs current date and completion. */
export function projectHealth(p: Pick<Project, 'estimated_end_date' | 'status' | 'completion_rate'>): HealthColor {
  if (p.status === 'completed') return 'green';
  if (!p.estimated_end_date) return 'gray';
  const days = daysBetween(new Date().toISOString().slice(0, 10), p.estimated_end_date);
  if (days === null) return 'gray';
  if (days < 0) return 'red';
  if (days <= 7 && p.completion_rate < 80) return 'yellow';
  return 'green';
}

export const projectStatusMeta: Record<ProjectStatus, { labelKey: string; dot: string; badge: string }> = {
  not_started: { labelKey: 'status.not_started', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  in_progress: { labelKey: 'status.in_progress', dot: 'bg-brand-500', badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200' },
  completed:   { labelKey: 'status.completed',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200' },
  delayed:     { labelKey: 'status.delayed',     dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200' },
};

export const taskStatusMeta: Record<TaskStatus, { labelKey: string; dot: string; badge: string; column: string }> = {
  todo:        { labelKey: 'task_status.todo',        dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', column: 'To Do' },
  in_progress: { labelKey: 'task_status.in_progress', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200', column: 'In Progress' },
  done:        { labelKey: 'task_status.done',        dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200', column: 'Done' },
  blocked:     { labelKey: 'task_status.blocked',     dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200', column: 'Blocked' },
};

export const healthClasses: Record<HealthColor, string> = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-500',
  red:    'bg-rose-500',
  gray:   'bg-slate-300 dark:bg-slate-600',
};

export function initialsFromName(name?: string | null, email?: string | null) {
  const base = (name && name.trim()) || email || '';
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts[1]?.[0] ?? '';
  return (first + last).toUpperCase();
}
