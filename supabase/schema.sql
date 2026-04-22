-- ============================================================================
-- Project Tracker — Supabase Schema
-- Run in the Supabase SQL Editor (top to bottom) on a fresh project.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Default grants (restore after `drop schema public cascade`)
-- Supabase applies these automatically on new projects, but a schema reset
-- removes them. Re-granting here makes schema.sql safely re-runnable.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $enums$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'project_manager', 'team_member');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('not_started', 'in_progress', 'completed', 'delayed');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('todo', 'in_progress', 'done', 'blocked');
  end if;
end $enums$;

-- ----------------------------------------------------------------------------
-- USERS (profile table, 1-1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  mobile text,
  role user_role not null default 'team_member',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup; first user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when not exists (select 1 from public.users) then 'admin'::user_role else 'team_member'::user_role end
  );
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- PROJECTS
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sector text,
  owner_name text,
  owner_email text,
  owner_mobile text,
  start_date date not null default current_date,
  estimated_end_date date,
  actual_end_date date,
  status project_status not null default 'not_started',
  completion_rate numeric(5,2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_created_by on public.projects(created_by);

-- ----------------------------------------------------------------------------
-- TASKS
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.users(id) on delete set null,
  assignee_name text,
  assignee_email text,
  assignee_mobile text,
  status task_status not null default 'todo',
  completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  start_date date,
  due_date date,
  order_index integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_task on public.comments(task_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOG
-- ----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_created on public.activity_log(created_at desc);

-- ----------------------------------------------------------------------------
-- TRIGGERS: updated_at + completion roll-up + status automation
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Keep completion_percentage consistent with status
create or replace function public.sync_task_status_completion()
returns trigger
language plpgsql
as $fn$
begin
  if new.status = 'done' then
    new.completion_percentage := 100;
  end if;
  if new.completion_percentage = 100 and new.status <> 'done' and new.status <> 'blocked' then
    new.status := 'done';
  end if;
  if new.completion_percentage is null then
    new.completion_percentage := 0;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_tasks_sync on public.tasks;
create trigger trg_tasks_sync before insert or update on public.tasks
  for each row execute function public.sync_task_status_completion();

-- Recalculate project completion_rate and status from its tasks.
-- Implemented as a single UPDATE with correlated subqueries (no DECLARE vars).
create or replace function public.recalc_project_progress(p_id uuid)
returns void
language plpgsql
as $fn$
begin
  update public.projects p set
    completion_rate = coalesce(
      (select round(avg(completion_percentage)::numeric, 2) from public.tasks where project_id = p_id),
      0
    ),
    status = (
      case
        when (select count(*) from public.tasks where project_id = p_id) = 0
          then 'not_started'::project_status
        when (select count(*) from public.tasks where project_id = p_id)
           = (select count(*) from public.tasks where project_id = p_id and status = 'done')
          then 'completed'::project_status
        when p.estimated_end_date is not null and p.estimated_end_date < current_date
          then 'delayed'::project_status
        else 'in_progress'::project_status
      end
    ),
    actual_end_date = (
      case
        when (select count(*) from public.tasks where project_id = p_id) > 0
         and (select count(*) from public.tasks where project_id = p_id)
           = (select count(*) from public.tasks where project_id = p_id and status = 'done')
          then current_date
        else null
      end
    )
  where p.id = p_id;
end;
$fn$;

create or replace function public.tasks_after_change()
returns trigger
language plpgsql
as $fn$
begin
  perform public.recalc_project_progress(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_tasks_recalc on public.tasks;
create trigger trg_tasks_recalc after insert or update or delete on public.tasks
  for each row execute function public.tasks_after_change();

-- Notification when a task is assigned
create or replace function public.notify_on_assignment()
returns trigger
language plpgsql
as $fn$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications(user_id, kind, title, body, link)
    values (
      new.assignee_id,
      'task_assigned',
      'You were assigned a task',
      new.title,
      '/projects/' || new.project_id::text
    );
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_tasks_notify on public.tasks;
create trigger trg_tasks_notify after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_on_assignment();

-- Notification on new comment → notify task assignee (if different from author)
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
as $fn$
begin
  insert into public.notifications(user_id, kind, title, body, link)
  select
    t.assignee_id,
    'new_comment',
    'New comment on your task',
    t.title,
    '/projects/' || t.project_id::text
  from public.tasks t
  where t.id = new.task_id
    and t.assignee_id is not null
    and t.assignee_id is distinct from new.author_id;
  return new;
end;
$fn$;

drop trigger if exists trg_comments_notify on public.comments;
create trigger trg_comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

-- Helper: current user's role
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $fn$
  select role from public.users where id = auth.uid();
$fn$;

-- USERS
drop policy if exists "users_read" on public.users;
create policy "users_read" on public.users for select using (auth.uid() is not null);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users for update
  using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "users_admin_insert" on public.users;
create policy "users_admin_insert" on public.users for insert
  with check (public.current_user_role() = 'admin');

drop policy if exists "users_admin_delete" on public.users;
create policy "users_admin_delete" on public.users for delete
  using (public.current_user_role() = 'admin');

-- PROJECTS
drop policy if exists "projects_read" on public.projects;
create policy "projects_read" on public.projects for select using (auth.uid() is not null);

drop policy if exists "projects_write" on public.projects;
create policy "projects_write" on public.projects for all
  using (public.current_user_role() in ('admin','project_manager'))
  with check (public.current_user_role() in ('admin','project_manager'));

-- TASKS
drop policy if exists "tasks_read" on public.tasks;
create policy "tasks_read" on public.tasks for select using (auth.uid() is not null);

drop policy if exists "tasks_write_managers" on public.tasks;
create policy "tasks_write_managers" on public.tasks for all
  using (public.current_user_role() in ('admin','project_manager'))
  with check (public.current_user_role() in ('admin','project_manager'));

drop policy if exists "tasks_update_assignee" on public.tasks;
create policy "tasks_update_assignee" on public.tasks for update
  using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

-- COMMENTS
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select using (auth.uid() is not null);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (author_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete
  using (author_id = auth.uid() or public.current_user_role() = 'admin');

-- NOTIFICATIONS
drop policy if exists "notif_read_own" on public.notifications;
create policy "notif_read_own" on public.notifications for select using (user_id = auth.uid());

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications for update using (user_id = auth.uid());

drop policy if exists "notif_insert" on public.notifications;
create policy "notif_insert" on public.notifications for insert with check (true);

drop policy if exists "notif_delete_own" on public.notifications;
create policy "notif_delete_own" on public.notifications for delete using (user_id = auth.uid());

-- ACTIVITY LOG
drop policy if exists "activity_read" on public.activity_log;
create policy "activity_read" on public.activity_log for select using (auth.uid() is not null);

drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert" on public.activity_log for insert with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- REALTIME — safe to re-run
-- ----------------------------------------------------------------------------
do $pub$ begin
  begin
    alter publication supabase_realtime add table public.projects;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.comments;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.activity_log;
  exception when duplicate_object then null; end;
end $pub$;

-- ----------------------------------------------------------------------------
-- Final grant pass — ensures tables/functions created above are accessible
-- (default privileges only apply to *future* objects, so re-grant explicitly)
-- ----------------------------------------------------------------------------
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
