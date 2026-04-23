-- ============================================================================
-- Disable the legacy Resend/pg_cron email system.
-- Run this ONCE in the Supabase SQL editor. Safe to re-run.
--
-- After running this, only the Next.js SMTP path (via nodemailer +
-- mail.nstextile-eg.com) will send emails. The branded brown/white NS
-- template will be the only one recipients see.
-- ============================================================================

-- 1) Drop the triggers that fire on task/project changes
drop trigger if exists trg_tasks_email_assign on public.tasks;
drop trigger if exists trg_projects_email_delayed on public.projects;

-- 2) Remove the scheduled daily sweep (pg_cron)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-deadline-sweep') then
    perform cron.unschedule('daily-deadline-sweep');
  end if;
exception when others then
  -- pg_cron may not exist on this project; ignore
  null;
end $$;

-- 3) Drop the helper functions (optional — comment these out if you want to
--    keep them around for manual testing)
drop function if exists public.notify_email_on_assignment() cascade;
drop function if exists public.notify_email_on_project_delayed() cascade;
drop function if exists public.daily_deadline_sweep() cascade;
drop function if exists public._email_template(text, text, text, text) cascade;
drop function if exists public.send_email(text, text, text, text, uuid) cascade;

-- 4) (Optional) Drop config + log tables. Leave them if you want the audit
--    trail of what was previously sent.
-- drop table if exists public.email_log;
-- drop table if exists public._app_config;
