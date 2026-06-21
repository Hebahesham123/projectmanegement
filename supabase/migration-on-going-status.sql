-- Adds the new 'on_going' value to both status enums and teaches the
-- project-status recalc trigger to preserve a manually-set 'on_going'.
-- Safe to run multiple times. Run in the Supabase SQL editor.

alter type project_status add value if not exists 'on_going';
alter type task_status add value if not exists 'on_going';

-- Replace recalc to keep 'on_going' until all tasks are done.
-- NOTE: 'alter type ... add value' must be committed before the new value
-- can be used in a function body. If you get a "unsafe use of new value"
-- error, run the two ALTER TYPE statements above first, then run the
-- CREATE OR REPLACE FUNCTION below in a separate query.
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
        -- Preserve manually-set 'on_going' unless all tasks are done
        when p.status = 'on_going'::project_status
         and not (
           (select count(*) from public.tasks where project_id = p_id) > 0
           and (select count(*) from public.tasks where project_id = p_id)
             = (select count(*) from public.tasks where project_id = p_id and status = 'done')
         )
          then 'on_going'::project_status
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
