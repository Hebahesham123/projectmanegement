-- Email send log: one row per /api/email/send attempt (success or failure).
-- Run once in the Supabase SQL editor.

-- Drop any pre-existing table so the schema below is authoritative.
drop table if exists public.email_log cascade;

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references auth.users(id) on delete set null,
  to_addr text not null,
  subject text not null,
  html text,
  text text,
  status text not null check (status in ('sent','failed')),
  message_id text,
  response text,
  accepted text[],
  rejected text[],
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx on public.email_log (created_at desc);
create index if not exists email_log_sent_by_idx on public.email_log (sent_by);

alter table public.email_log enable row level security;

-- Authenticated users can insert rows for their own session (used by /api/email/send).
drop policy if exists "email_log_insert_own" on public.email_log;
create policy "email_log_insert_own" on public.email_log for insert
  with check (sent_by = auth.uid());

-- Admins can read everything; regular users only see what they triggered.
drop policy if exists "email_log_read" on public.email_log;
create policy "email_log_read" on public.email_log for select
  using (public.current_user_role() = 'admin' or sent_by = auth.uid());

-- Only admins can delete log rows.
drop policy if exists "email_log_delete_admin" on public.email_log;
create policy "email_log_delete_admin" on public.email_log for delete
  using (public.current_user_role() = 'admin');
