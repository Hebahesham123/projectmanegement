-- ============================================================================
-- Email notification system (Resend + pg_net + pg_cron)
-- Run this AFTER schema.sql.
-- BEFORE running:
--   1. Replace YOUR_RESEND_API_KEY_HERE below with your real key
--   2. If you verified a domain in Resend, replace the "from" address in
--      public.send_email() with something like "Project Tracker <alerts@yourdomain.com>"
--   3. Adjust the cron schedule / timezone at the bottom if needed
-- ============================================================================

-- Extensions
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ----------------------------------------------------------------------------
-- Config table (stores Resend API key + "from" address)
-- ----------------------------------------------------------------------------
create table if not exists public._app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Lock down: only service_role can read/write the API key
alter table public._app_config enable row level security;
drop policy if exists "app_config_service" on public._app_config;
create policy "app_config_service" on public._app_config for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Placeholder rows. Set the real Resend API key AFTER this migration runs, via:
--   update public._app_config set value = 're_…' where key = 'resend_api_key';
-- Never commit the real key to this file.
insert into public._app_config (key, value) values
  ('resend_api_key', 'SET_VIA_UPDATE_AFTER_MIGRATION'),
  ('email_from',     'Project Tracker <onboarding@resend.dev>'),
  ('app_base_url',   'http://localhost:3000')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Email log (audit trail of what was sent)
-- ----------------------------------------------------------------------------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  kind text not null,        -- 'task_assigned' | 'deadline_tomorrow' | 'overdue' | 'status_delayed'
  task_id uuid,
  response_status int,
  sent_at timestamptz not null default now()
);
create index if not exists idx_email_log_sent_at on public.email_log(sent_at desc);

-- ----------------------------------------------------------------------------
-- Core: send_email() — fires an async HTTP POST to Resend via pg_net
-- ----------------------------------------------------------------------------
create or replace function public.send_email(
  to_email text,
  subject text,
  html text,
  kind text default 'generic',
  task_id uuid default null
)
returns bigint
language plpgsql
security definer
as $fn$
declare
  req_id bigint;
  api_key text;
  from_addr text;
begin
  if to_email is null or to_email = '' then return null; end if;

  select value into api_key   from public._app_config where key = 'resend_api_key';
  select value into from_addr from public._app_config where key = 'email_from';

  if api_key is null or api_key = '' or api_key = 'YOUR_RESEND_API_KEY_HERE' then
    insert into public.email_log (to_email, subject, kind, task_id, response_status)
    values (to_email, subject, kind, task_id, -1);
    return null;
  end if;

  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    from_addr,
      'to',      to_email,
      'subject', subject,
      'html',    html
    )
  ) into req_id;

  insert into public.email_log (to_email, subject, kind, task_id, response_status)
  values (to_email, subject, kind, task_id, 0);

  return req_id;
end;
$fn$;

-- ----------------------------------------------------------------------------
-- Reusable HTML shell
-- ----------------------------------------------------------------------------
create or replace function public._email_template(title text, body text, cta_url text default null, cta_label text default null)
returns text
language sql
as $fn$
  select
    '<div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px 16px">'
    ||'<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">'
    ||'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
    ||'<div style="width:36px;height:36px;border-radius:10px;background:#3478f6;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700">PT</div>'
    ||'<div style="font-weight:600;color:#0f172a">Project Tracker</div>'
    ||'</div>'
    ||'<h2 style="margin:8px 0 12px;color:#0f172a;font-size:20px">' || title || '</h2>'
    ||'<div style="color:#334155;font-size:14px;line-height:1.6">' || body || '</div>'
    || case
         when cta_url is not null then
           '<div style="margin-top:24px">'
           ||'<a href="' || cta_url || '" style="display:inline-block;background:#3478f6;color:#fff;padding:10px 18px;border-radius:10px;font-weight:600;text-decoration:none">' || coalesce(cta_label, 'Open') || '</a>'
           ||'</div>'
         else ''
       end
    ||'<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">Automated message from Project Tracker. Please do not reply.</div>'
    ||'</div></div>'
$fn$;

-- ============================================================================
-- EVENT 1: Task assigned — immediate email
-- ============================================================================
create or replace function public.notify_email_on_assignment()
returns trigger
language plpgsql
security definer
as $fn$
declare
  u_email text;
  u_name text;
  p_name text;
  base_url text;
  link text;
  body_html text;
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from coalesce(old.assignee_id, '00000000-0000-0000-0000-000000000000'::uuid))
  then
    select email, full_name into u_email, u_name from public.users where id = new.assignee_id;
    select name             into p_name         from public.projects where id = new.project_id;
    select value            into base_url       from public._app_config where key = 'app_base_url';
    link := coalesce(base_url, '') || '/projects/' || new.project_id::text;

    if u_email is not null then
      body_html := public._email_template(
        'You have a new task',
        '<p>Hi ' || coalesce(u_name, 'there') || ',</p>'
        ||'<p><strong>' || new.title || '</strong> has been assigned to you in <em>' || coalesce(p_name, 'a project') || '</em>.</p>'
        || case when new.due_date is not null
                then '<p>Due date: <strong>' || to_char(new.due_date, 'Mon DD, YYYY') || '</strong></p>'
                else '' end
        || case when new.description is not null and new.description <> ''
                then '<p style="color:#475569;background:#f1f5f9;padding:12px;border-radius:8px">' || new.description || '</p>'
                else '' end,
        link,
        'Open task'
      );
      perform public.send_email(u_email, 'New task: ' || new.title, body_html, 'task_assigned', new.id);
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_tasks_email_assign on public.tasks;
create trigger trg_tasks_email_assign
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_email_on_assignment();

-- ============================================================================
-- EVENT 2: Project status flips to 'delayed' — email the project owner + every
-- assignee of an active (non-done) task in that project
-- ============================================================================
create or replace function public.notify_email_on_project_delayed()
returns trigger
language plpgsql
security definer
as $fn$
declare
  r record;
  base_url text;
  link text;
  body_html text;
begin
  if new.status = 'delayed' and (old.status is null or old.status <> 'delayed') then
    select value into base_url from public._app_config where key = 'app_base_url';
    link := coalesce(base_url, '') || '/projects/' || new.id::text;

    for r in
      select distinct u.email, u.full_name
        from public.tasks t
        join public.users u on u.id = t.assignee_id
       where t.project_id = new.id
         and t.status <> 'done'
    loop
      body_html := public._email_template(
        'Project marked as delayed',
        '<p>Hi ' || coalesce(r.full_name, 'there') || ',</p>'
        ||'<p>The project <strong>' || new.name || '</strong> has been marked as <span style="color:#e11d48;font-weight:700">Delayed</span>.</p>'
        ||'<p>Please review your outstanding tasks and update their status.</p>',
        link, 'Open project'
      );
      perform public.send_email(r.email, 'Project delayed: ' || new.name, body_html, 'status_delayed', null);
    end loop;

    if new.owner_email is not null and new.owner_email <> '' then
      body_html := public._email_template(
        'Your project is delayed',
        '<p>Hi ' || coalesce(new.owner_name, 'there') || ',</p>'
        ||'<p>Your project <strong>' || new.name || '</strong> is now <span style="color:#e11d48;font-weight:700">Delayed</span>.</p>',
        link, 'Open project'
      );
      perform public.send_email(new.owner_email, 'Project delayed: ' || new.name, body_html, 'status_delayed', null);
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_projects_email_delayed on public.projects;
create trigger trg_projects_email_delayed
  after update of status on public.projects
  for each row execute function public.notify_email_on_project_delayed();

-- ============================================================================
-- EVENT 3+4: Daily sweep — due-tomorrow reminders + overdue alerts
-- ============================================================================
create or replace function public.daily_deadline_sweep()
returns void
language plpgsql
security definer
as $fn$
declare
  r record;
  base_url text;
  body_html text;
  link text;
begin
  select value into base_url from public._app_config where key = 'app_base_url';

  -- DUE TOMORROW — 1 day before reminder
  for r in
    select t.id, t.title, t.due_date, t.project_id, t.description,
           u.email, u.full_name,
           p.name as project_name
      from public.tasks t
      join public.users u on u.id = t.assignee_id
      join public.projects p on p.id = t.project_id
     where t.due_date = current_date + 1
       and t.status <> 'done'
       and not exists (
         select 1 from public.email_log el
          where el.task_id = t.id
            and el.kind = 'deadline_tomorrow'
            and el.sent_at::date = current_date
       )
  loop
    link := coalesce(base_url, '') || '/projects/' || r.project_id::text;
    body_html := public._email_template(
      'Your task is due tomorrow',
      '<p>Hi ' || coalesce(r.full_name, 'there') || ',</p>'
      ||'<p>Your task <strong>' || r.title || '</strong> in <em>' || r.project_name || '</em> is due tomorrow (<strong>' || to_char(r.due_date, 'Mon DD, YYYY') || '</strong>).</p>'
      ||'<p>Please make sure it''s on track.</p>',
      link, 'Open task'
    );
    perform public.send_email(r.email, 'Due tomorrow: ' || r.title, body_html, 'deadline_tomorrow', r.id);
  end loop;

  -- OVERDUE — email on the day it becomes overdue (due_date = yesterday, still not done)
  for r in
    select t.id, t.title, t.due_date, t.project_id,
           u.email, u.full_name,
           p.name as project_name,
           (current_date - t.due_date) as days_overdue
      from public.tasks t
      join public.users u on u.id = t.assignee_id
      join public.projects p on p.id = t.project_id
     where t.due_date < current_date
       and t.status <> 'done'
       and not exists (
         select 1 from public.email_log el
          where el.task_id = t.id
            and el.kind = 'overdue'
            and el.sent_at::date = current_date
       )
  loop
    link := coalesce(base_url, '') || '/projects/' || r.project_id::text;
    body_html := public._email_template(
      'Task is overdue',
      '<p>Hi ' || coalesce(r.full_name, 'there') || ',</p>'
      ||'<p>Your task <strong>' || r.title || '</strong> in <em>' || r.project_name || '</em> is now <span style="color:#e11d48;font-weight:700">' || r.days_overdue || ' day(s) overdue</span>.</p>'
      ||'<p>Please update its status or mark it done as soon as possible.</p>',
      link, 'Open task'
    );
    perform public.send_email(r.email, 'Overdue: ' || r.title, body_html, 'overdue', r.id);
  end loop;
end;
$fn$;

-- Schedule daily at 09:00 server time (Supabase is UTC by default)
-- Adjust the cron expression if you want a different hour.
-- 06:00 UTC ≈ 09:00 Cairo time (UTC+3, no DST).
select cron.unschedule('daily-deadline-sweep')
  where exists (select 1 from cron.job where jobname = 'daily-deadline-sweep');

select cron.schedule(
  'daily-deadline-sweep',
  '0 6 * * *',              -- every day at 06:00 UTC (09:00 Cairo)
  $job$ select public.daily_deadline_sweep(); $job$
);

-- ============================================================================
-- Manual test helpers
-- ============================================================================
-- Send a test email to yourself (replace the address):
--   select public.send_email('you@example.com', 'Test', public._email_template('Test email','It works!'), 'generic');
--
-- Run the daily sweep right now:
--   select public.daily_deadline_sweep();
--
-- See everything that's been sent:
--   select sent_at, kind, to_email, subject, response_status from public.email_log order by sent_at desc limit 50;
