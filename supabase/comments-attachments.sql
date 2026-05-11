-- ============================================================================
-- Comments on projects + Attachments (files / images) on tasks and projects.
-- Run once in the Supabase SQL editor.
-- ============================================================================

-- 1) Allow comments to belong to either a task OR a project.
alter table public.comments
  alter column task_id drop not null;

alter table public.comments
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- Exactly one parent must be set.
alter table public.comments
  drop constraint if exists comments_parent_check;
alter table public.comments
  add constraint comments_parent_check
  check ((task_id is null) <> (project_id is null));

create index if not exists idx_comments_project on public.comments(project_id);

-- Tighten read policy: a user can read a comment only if they can see its parent.
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select using (
  auth.uid() is not null
  and (
    (task_id    is not null and exists (select 1 from public.tasks t    where t.id = comments.task_id    and public.user_can_see_project(t.project_id)))
    or
    (project_id is not null and public.user_can_see_project(comments.project_id))
  )
);

-- 2) Attachments table.
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks(id)    on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  content_type text,
  size_bytes   bigint,
  uploaded_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint attachments_parent_check
    check (
      (task_id is not null)::int
      + (project_id is not null)::int
      + (comment_id is not null)::int
      = 1
    )
);
create index if not exists idx_attachments_task    on public.attachments(task_id);
create index if not exists idx_attachments_project on public.attachments(project_id);
create index if not exists idx_attachments_comment on public.attachments(comment_id);

alter table public.attachments enable row level security;

-- Read: visible if the user can see the parent project.
drop policy if exists "attachments_read" on public.attachments;
create policy "attachments_read" on public.attachments for select using (
  (task_id    is not null and exists (select 1 from public.tasks t where t.id = attachments.task_id and public.user_can_see_project(t.project_id)))
  or
  (project_id is not null and public.user_can_see_project(attachments.project_id))
  or
  (comment_id is not null and exists (
    select 1 from public.comments c
    where c.id = attachments.comment_id
      and (
        (c.task_id    is not null and exists (select 1 from public.tasks t where t.id = c.task_id and public.user_can_see_project(t.project_id)))
        or
        (c.project_id is not null and public.user_can_see_project(c.project_id))
      )
  ))
);

-- Insert: any authenticated user can record an attachment they uploaded.
drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert" on public.attachments for insert
  with check (uploaded_by = auth.uid());

-- Delete: uploader or admin.
drop policy if exists "attachments_delete" on public.attachments;
create policy "attachments_delete" on public.attachments for delete using (
  uploaded_by = auth.uid() or public.current_user_role() = 'admin'
);

-- 3) Storage bucket + policies.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Anyone authenticated can read objects (we filter at the app/RLS layer via the attachments table).
drop policy if exists "attachments_storage_read" on storage.objects;
create policy "attachments_storage_read" on storage.objects for select
  using (bucket_id = 'attachments' and auth.uid() is not null);

drop policy if exists "attachments_storage_insert" on storage.objects;
create policy "attachments_storage_insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.uid() is not null);

drop policy if exists "attachments_storage_delete" on storage.objects;
create policy "attachments_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.current_user_role() = 'admin')
  );
