'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { Project, Task, UserProfile, Comment, Notification } from '@/lib/types';

type Row<T> = { new: T | null; old: Partial<T> | null; eventType: 'INSERT' | 'UPDATE' | 'DELETE' };

interface DataState {
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  comments: Comment[];
  notifications: Notification[];
  hydrated: boolean;
  hydrating: boolean;

  hydrate: () => Promise<void>;
  reset: () => void;

  applyProject: (e: Row<Project>) => void;
  applyTask: (e: Row<Task>) => void;
  applyComment: (e: Row<Comment>) => void;
  applyNotification: (e: Row<Notification>) => void;
  applyUser: (e: Row<UserProfile>) => void;
}

const upsert = <T extends { id: string }>(list: T[], row: T) => {
  const idx = list.findIndex(x => x.id === row.id);
  if (idx === -1) return [row, ...list];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...row };
  return copy;
};
const remove = <T extends { id: string }>(list: T[], id: string) => list.filter(x => x.id !== id);

export const useData = create<DataState>((set, get) => ({
  projects: [],
  tasks: [],
  users: [],
  comments: [],
  notifications: [],
  hydrated: false,
  hydrating: false,

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const supabase = createClient();
    const [p, t, u, c, n] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('updated_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    set({
      projects: (p.data as Project[]) ?? [],
      tasks: (t.data as Task[]) ?? [],
      users: (u.data as UserProfile[]) ?? [],
      comments: (c.data as Comment[]) ?? [],
      notifications: (n.data as Notification[]) ?? [],
      hydrated: true,
      hydrating: false,
    });
  },

  reset: () => set({
    projects: [], tasks: [], users: [], comments: [], notifications: [],
    hydrated: false, hydrating: false,
  }),

  applyProject: ({ new: row, old, eventType }) => {
    if (eventType === 'DELETE') set({ projects: remove(get().projects, (old?.id as string) ?? (row?.id as string)) });
    else if (row) set({ projects: upsert(get().projects, row) });
  },
  applyTask: ({ new: row, old, eventType }) => {
    if (eventType === 'DELETE') set({ tasks: remove(get().tasks, (old?.id as string) ?? (row?.id as string)) });
    else if (row) set({ tasks: upsert(get().tasks, row) });
  },
  applyComment: ({ new: row, old, eventType }) => {
    if (eventType === 'DELETE') set({ comments: remove(get().comments, (old?.id as string) ?? (row?.id as string)) });
    else if (row) set({ comments: upsert(get().comments, row) });
  },
  applyNotification: ({ new: row, old, eventType }) => {
    if (eventType === 'DELETE') set({ notifications: remove(get().notifications, (old?.id as string) ?? (row?.id as string)) });
    else if (row) set({ notifications: upsert(get().notifications, row) });
  },
  applyUser: ({ new: row, old, eventType }) => {
    if (eventType === 'DELETE') set({ users: remove(get().users, (old?.id as string) ?? (row?.id as string)) });
    else if (row) set({ users: upsert(get().users, row) });
  },
}));
