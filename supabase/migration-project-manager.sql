-- ============================================================================
-- Migration: Project Manager field + manual/auto end-date mode
-- Safe to re-run. Paste the whole file into Supabase SQL Editor and Run.
-- ============================================================================

-- 1) New columns on projects
alter table public.projects
  add column if not exists project_manager text;

alter table public.projects
  add column if not exists end_date_mode text not null default 'auto'
  check (end_date_mode in ('auto', 'manual'));

-- 2) Update recalc trigger so it respects end_date_mode = 'manual'
--    and leaves both actual_end_date AND status alone when the admin wants
--    full manual control.
create or replace function public.recalc_project_progress(p_id uuid)
returns void
language plpgsql
as $fn$
declare
  mode text;
begin
  select end_date_mode into mode from public.projects where id = p_id;

  if mode = 'manual' then
    -- Only recompute completion_rate — leave status and actual_end_date alone
    update public.projects p set
      completion_rate = coalesce(
        (select round(avg(completion_percentage)::numeric, 2) from public.tasks where project_id = p_id),
        p.completion_rate
      )
    where p.id = p_id;
    return;
  end if;

  -- Auto mode — original behaviour
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
