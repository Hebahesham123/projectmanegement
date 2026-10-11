-- ============================================================================
-- Remove "Anjie Magdy" from the data, not just from the code.
--
-- She has no account, so remove-users.sql has nothing to delete. She keeps
-- appearing because these columns are free text / denormalized copies:
--
--   projects.project_manager   a plain text label
--   projects.owner_name        with owner_email / owner_mobile alongside
--   tasks.assignee_name        with assignee_email / assignee_mobile
--
-- The Project Manager and Owner filter dropdowns are built by unioning the
-- PROJECT_MANAGERS constant with every value present in the data, so editing
-- src/lib/constants.ts alone will never make her disappear.
--
-- ARMED. Pasting this whole file and pressing Run WILL change the rows. The
-- reporting queries still run first, so their output appears either way.
-- To make it preview-only again, set _confirmed := false.
--
-- Optionally set _replacement to a name to hand her rows to someone else
-- instead of blanking them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Where the name actually appears.
-- ----------------------------------------------------------------------------
select 'projects.project_manager' as location, count(*) as rows
  from public.projects
 where project_manager ilike '%anjie%' or project_manager ilike '%angie%'
union all
select 'projects.owner_name', count(*)
  from public.projects
 where owner_name ilike '%anjie%' or owner_name ilike '%angie%'
    or owner_email ilike '%anjie%' or owner_email ilike '%angie%'
union all
select 'tasks.assignee_name', count(*)
  from public.tasks
 where assignee_name ilike '%anjie%' or assignee_name ilike '%angie%'
    or assignee_email ilike '%anjie%' or assignee_email ilike '%angie%'
union all
select 'public.users', count(*)
  from public.users
 where full_name ilike '%anjie%' or full_name ilike '%angie%'
    or email ilike '%anjie%' or email ilike '%angie%'
order by 1;

-- The exact values, in case the spelling differs from the guess.
select distinct project_manager as distinct_project_manager_values
  from public.projects
 where project_manager is not null
 order by 1;

-- ----------------------------------------------------------------------------
-- Apply. Set _confirmed := true first.
-- ----------------------------------------------------------------------------
do $$
declare
  _confirmed boolean := true;   -- ARMED: running this file now applies the change

  -- Who to hand her projects to. Leave null to blank the label instead.
  -- Must be one of PROJECT_MANAGERS in src/lib/constants.ts to show up as a
  -- normal dropdown option rather than a "(legacy)" one: currently
  -- 'Rehab Ibrahim' or 'Farah Ashraf'.
  _replacement text := null;

  _n int;
begin
  if not _confirmed then
    raise notice '----------------------------------------------------------------';
    raise notice 'Nothing changed. Read the counts above, then set';
    raise notice '_confirmed := true in this block and run again.';
    raise notice '----------------------------------------------------------------';
    return;
  end if;

  -- 1. The project manager label.
  update public.projects
     set project_manager = _replacement
   where project_manager ilike '%anjie%' or project_manager ilike '%angie%';
  get diagnostics _n = row_count;
  raise notice 'projects.project_manager: % row(s) set to %',
               _n, coalesce(_replacement, '(blank)');

  -- 2. Project owner contact. Blanked rather than reassigned: the app mails
  --    owner_email, so a wrong address is worse than none.
  update public.projects
     set owner_name = null, owner_email = null, owner_mobile = null
   where owner_name ilike '%anjie%' or owner_name ilike '%angie%'
      or owner_email ilike '%anjie%' or owner_email ilike '%angie%';
  get diagnostics _n = row_count;
  raise notice 'projects.owner_*: % row(s) cleared - these need a new owner', _n;

  -- 3. Task assignee contact. Same reasoning.
  update public.tasks
     set assignee_name = null, assignee_email = null, assignee_mobile = null
   where assignee_name ilike '%anjie%' or assignee_name ilike '%angie%'
      or assignee_email ilike '%anjie%' or assignee_email ilike '%angie%';
  get diagnostics _n = row_count;
  raise notice 'tasks.assignee_*: % row(s) cleared - these need a new assignee', _n;

  raise notice 'Done.';
end $$;

-- ----------------------------------------------------------------------------
-- Confirm. Every count should be zero.
-- ----------------------------------------------------------------------------
select 'projects.project_manager' as location, count(*) as should_be_zero
  from public.projects
 where project_manager ilike '%anjie%' or project_manager ilike '%angie%'
union all
select 'projects.owner_name', count(*)
  from public.projects
 where owner_name ilike '%anjie%' or owner_name ilike '%angie%'
union all
select 'tasks.assignee_name', count(*)
  from public.tasks
 where assignee_name ilike '%anjie%' or assignee_name ilike '%angie%'
order by 1;
