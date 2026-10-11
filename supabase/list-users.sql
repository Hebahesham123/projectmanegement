-- ============================================================================
-- Every account in the system. Read-only - nothing here can change anything.
-- Paste this whole file into the Supabase SQL editor and Run.
--
-- Use it to read off the exact email spellings before running
-- remove-users.sql or migrate-email-domain.sql.
-- ============================================================================

select u.email,
       u.full_name,
       u.role,
       (select count(*) from public.tasks    t where t.assignee_id = u.id) as tasks_assigned,
       (select count(*) from public.projects p where p.created_by  = u.id) as projects_created,
       (select count(*) from public.projects p where lower(p.owner_email) = lower(u.email)) as projects_owned,
       a.last_sign_in_at,
       u.id
  from public.users u
  left join auth.users a on a.id = u.id
 order by u.full_name nulls last;
