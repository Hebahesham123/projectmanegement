-- ============================================================================
-- Remove accounts (Anjie, Feitaha, Hossam) by exact email address.
-- Run in the Supabase SQL editor with the postgres role.
--
-- HOW TO USE
--   1. Run supabase/list-users.sql to see the exact email spellings.
--   2. Paste those addresses into the _emails array below.
--   3. Paste this whole file into the SQL editor and Run.
--
-- Until you replace the placeholder addresses this file does nothing except
-- print a notice and list the accounts, so it is safe to run as-is.
-- Deleting a login cannot be undone.
--
-- Earlier versions of this file guessed at spellings from first names. That
-- kept aborting because the stored names differ from the guesses, so the
-- guessing is gone - addresses only.
--
-- What deleting a user does and does not destroy (per the FKs in schema.sql):
--   kept, authorship blanked   projects.created_by, tasks.created_by,
--                              comments.author_id -> comments stay but show no
--                              author, attachments.uploaded_by (the files
--                              themselves are kept), activity_log.actor_id,
--                              email_log.sent_by
--   unassigned                 their tasks: assignee_id plus the denormalized
--                              assignee_name / _email / _mobile that the UI
--                              actually displays; and owner_name / _email /
--                              _mobile on projects they owned, which the app
--                              mails. Both are logged so you get a
--                              reassignment list.
--   reported, not changed      projects.project_manager is free text, so a
--                              project they managed keeps the label. Listed
--                              for you to re-label by hand.
--   deleted                    public.users row, auth.users + auth.identities,
--                              notifications addressed to them
-- No project, task, comment or attachment is lost.
-- ============================================================================

do $$
declare
  -- <<< PASTE THE EXACT EMAILS FROM list-users.sql HERE >>>
  _emails text[] := array[
    'REPLACE.ME.1@example.com',
    'REPLACE.ME.2@example.com',
    'REPLACE.ME.3@example.com'
  ];

  -- Never delete these, whatever is pasted above.
  _protected text[] := array[
    'karim elbahey', 'rehab ibrahim', 'farah ashraf', 'manar faisal'
  ];

  _r    record;
  _ids  uuid[];
  _n    int;
  _n2   int;
  _miss text;
begin
  -- Not filled in yet: say so and stop, without failing the whole script.
  if exists (select 1 from unnest(_emails) e where e like '%REPLACE.ME%') then
    raise notice '----------------------------------------------------------------';
    raise notice 'Nothing deleted. Run supabase/list-users.sql, then paste the';
    raise notice 'real addresses into the _emails array at the top of this file.';
    raise notice '----------------------------------------------------------------';
    return;
  end if;

  select array_agg(u.id) into _ids
    from public.users u
   where lower(trim(u.email)) = any (array(select lower(trim(e)) from unnest(_emails) e));

  _n := coalesce(array_length(_ids, 1), 0);

  -- Guard: every address must resolve, or a typo would silently delete a
  -- subset and leave the rest in place.
  if _n <> array_length(_emails, 1) then
    select string_agg(e, ', ') into _miss
      from unnest(_emails) e
     where not exists (select 1 from public.users u
                        where lower(trim(u.email)) = lower(trim(e)));
    raise exception 'Found % of % addresses. Not in public.users: %. Nothing deleted.',
                    _n, array_length(_emails, 1), coalesce(_miss, '(none)');
  end if;

  -- Guard: never take out one of the owner/admin accounts.
  for _r in select id, email, full_name from public.users where id = any(_ids) loop
    if lower(trim(_r.full_name)) = any(_protected) then
      raise exception 'Refusing to delete protected account % (%)', _r.full_name, _r.email;
    end if;
  end loop;

  for _r in select email, full_name, role from public.users where id = any(_ids) loop
    raise notice 'Deleting % <%> role=%', _r.full_name, _r.email, _r.role;
  end loop;

  -- The UI renders tasks.assignee_name (denormalized, only kept in sync on app
  -- writes) and the FK on assignee_id is ON DELETE SET NULL - so without this
  -- the deleted person keeps showing as the assignee everywhere. Log first:
  -- once cleared there is no way to tell these from never-assigned tasks.
  for _r in select t.id, t.title, t.assignee_name
              from public.tasks t
             where t.assignee_id = any(_ids)
             order by t.assignee_name, t.title loop
    raise notice '  task needs a new assignee: "%" (was %) id=%',
                 _r.title, _r.assignee_name, _r.id;
  end loop;

  update public.tasks
     set assignee_name = null, assignee_email = null, assignee_mobile = null
   where assignee_id = any(_ids);
  get diagnostics _n2 = row_count;
  raise notice 'Unassigned % task(s).', _n2;

  -- Same on projects: owner_name/_email/_mobile are denormalized, and
  -- ProjectForm matches public.users on owner_email and mails the owner there.
  -- Left alone it would keep sending project mail to a deleted mailbox.
  for _r in select p.id, p.name, p.owner_name
              from public.projects p
             where lower(p.owner_email) in (
                     select lower(email) from public.users where id = any(_ids))
             order by p.name loop
    raise notice '  project needs a new owner: "%" (was %) id=%',
                 _r.name, _r.owner_name, _r.id;
  end loop;

  update public.projects
     set owner_name = null, owner_email = null, owner_mobile = null
   where lower(owner_email) in (
           select lower(email) from public.users where id = any(_ids));
  get diagnostics _n2 = row_count;
  raise notice 'Cleared the owner on % project(s).', _n2;

  -- projects.project_manager is a free-text label, not a reference, so it is
  -- reported but NOT cleared - blanking it would lose who ran the project.
  for _r in select p.id, p.name, p.project_manager
              from public.projects p
             where p.project_manager is not null
               and lower(trim(p.project_manager)) in (
                     select lower(trim(full_name)) from public.users where id = any(_ids))
             order by p.name loop
    raise notice '  project still labelled project_manager=% : "%" id=%',
                 _r.project_manager, _r.name, _r.id;
  end loop;

  -- auth.users cascades to public.users and auth.identities.
  delete from auth.users   where id = any(_ids);
  -- Any profile row whose auth user was already gone.
  delete from public.users where id = any(_ids);

  raise notice 'Deleted % account(s).', _n;
end $$;

-- ----------------------------------------------------------------------------
-- The accounts that remain. Check the deleted ones are no longer listed.
-- ----------------------------------------------------------------------------
select u.email, u.full_name, u.role
  from public.users u
 order by u.full_name nulls last;
