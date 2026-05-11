-- ============================================================================
-- Multi-department on projects and tasks.
-- Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.projects
  add column if not exists departments text[] not null default '{}';

alter table public.tasks
  add column if not exists departments text[] not null default '{}';

-- Backfill from the legacy `sector` column on projects.
update public.projects
   set departments = array[sector]
 where sector is not null
   and (departments is null or array_length(departments, 1) is null);

create index if not exists idx_projects_departments on public.projects using gin (departments);
create index if not exists idx_tasks_departments    on public.tasks    using gin (departments);
