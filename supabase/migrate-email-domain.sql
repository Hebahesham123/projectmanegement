-- ============================================================================
-- Move every account from @nstextile-eg.com to @naguibselim.com.
-- Run in the Supabase SQL editor with the postgres role.
--
-- Safe to run as-is: STEP 2 will not change anything until you set
-- _confirmed := true inside it. Run the file, read the STEP 1 preview, then
-- flip that flag and run it again.
--
-- THIS CHANGES HOW PEOPLE LOG IN. After STEP 2 everyone signs in with their
-- @naguibselim.com address. Passwords are untouched.
--
-- Rewritten here:
--   auth.users.email            the login itself
--   auth.identities             identity_data->>'email', otherwise Supabase
--                               Auth and the users table disagree on sign-in
--   public.users.email          what the app reads
--   projects.owner_email        denormalized; ProjectForm matches
--                               public.users on it and mails the owner there
--   tasks.assignee_email        denormalized; shown in the UI and used for
--                               assignment notifications
--
-- Deliberately NOT rewritten:
--   email_log.to_addr           a historical record of what was actually sent
--   SMTP_* in .env.local        the sending mailbox, not a person's address.
--                               See the note at the bottom of this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 - preview. What changes, and would anything collide?
-- ----------------------------------------------------------------------------
select u.email                                                                   as old_email,
       regexp_replace(lower(u.email), '@nstextile-eg\.com$', '@naguibselim.com') as new_email,
       u.full_name,
       u.role,
       exists (
         select 1 from public.users v
          where lower(v.email) = regexp_replace(lower(u.email), '@nstextile-eg\.com$', '@naguibselim.com')
       )                                                                         as collides
  from public.users u
 where u.email ilike '%@nstextile-eg.com'
 order by u.email;

-- How many rows each table contributes.
select 'auth.users'     as source, count(*) from auth.users      where email ilike '%@nstextile-eg.com'
union all
select 'auth.identities',      count(*) from auth.identities where identity_data->>'email' ilike '%@nstextile-eg.com'
union all
select 'public.users',         count(*) from public.users    where email ilike '%@nstextile-eg.com'
union all
select 'projects.owner_email', count(*) from public.projects where owner_email ilike '%@nstextile-eg.com'
union all
select 'tasks.assignee_email', count(*) from public.tasks    where assignee_email ilike '%@nstextile-eg.com'
order by 1;

-- ----------------------------------------------------------------------------
-- STEP 2 - rewrite. Aborts if any address is already taken on the new domain.
-- ----------------------------------------------------------------------------
do $$
declare
  -- Safety switch. Run the STEP 1 queries, read the old_email -> new_email
  -- list, then set this to true and run again to actually rewrite.
  -- It exists because the SQL editor shows only the last result set, so a
  -- whole-file run would otherwise change every login before you saw STEP 1.
  _confirmed boolean := false;

  _old text := '@nstextile-eg.com';
  _new text := '@naguibselim.com';
  _rx  text := '@nstextile-eg\.com$';
  _r   record;
  _n   int;
  _bad int;
begin
  if not _confirmed then
    raise notice '----------------------------------------------------------------';
    raise notice 'Nothing changed. Run the STEP 1 queries on their own, check the';
    raise notice 'old_email -> new_email list and that no row says collides=true,';
    raise notice 'then set _confirmed := true in STEP 2 and run again.';
    raise notice '----------------------------------------------------------------';
    return;
  end if;

  -- Guard: a rewrite that would duplicate an existing address would violate
  -- the unique constraint on users.email and lock that person out.
  select count(*) into _bad
    from public.users u
   where u.email ilike '%' || _old
     and exists (select 1 from public.users v
                  where lower(v.email) = regexp_replace(lower(u.email), _rx, _new));
  if _bad > 0 then
    raise exception '% address(es) already exist on %. Resolve those duplicates first - STEP 1 flags them as collides=true.', _bad, _new;
  end if;

  select count(*) into _bad
    from auth.users a
   where a.email ilike '%' || _old
     and exists (select 1 from auth.users b
                  where lower(b.email) = regexp_replace(lower(a.email), _rx, _new));
  if _bad > 0 then
    raise exception '% login(s) already exist on % in auth.users. Resolve those first.', _bad, _new;
  end if;

  -- Log every change before making it.
  for _r in select email, regexp_replace(lower(email), _rx, _new) as new_email, full_name
              from public.users
             where email ilike '%' || _old
             order by email loop
    raise notice '  % -> %  (%)', _r.email, _r.new_email, _r.full_name;
  end loop;

  -- 1. The login.
  update auth.users
     set email      = regexp_replace(lower(email), _rx, _new),
         updated_at = now()
   where email ilike '%' || _old;
  get diagnostics _n = row_count;
  raise notice 'auth.users: % row(s)', _n;

  -- 2. The identity record Supabase Auth actually reads on sign-in.
  update auth.identities
     set identity_data = jsonb_set(
                           identity_data, '{email}',
                           to_jsonb(regexp_replace(lower(identity_data->>'email'), _rx, _new))),
         updated_at    = now()
   where identity_data->>'email' ilike '%' || _old;
  get diagnostics _n = row_count;
  raise notice 'auth.identities: % row(s)', _n;

  -- 3. Any copy of the address left in the auth metadata blob.
  update auth.users
     set raw_user_meta_data = jsonb_set(
                                raw_user_meta_data, '{email}',
                                to_jsonb(regexp_replace(lower(raw_user_meta_data->>'email'), _rx, _new)))
   where raw_user_meta_data->>'email' ilike '%' || _old;

  -- 4. The profile table the app reads.
  update public.users
     set email = regexp_replace(lower(email), _rx, _new)
   where email ilike '%' || _old;
  get diagnostics _n = row_count;
  raise notice 'public.users: % row(s)', _n;

  -- 5. Denormalized copies. Miss these and owner lookups fail and mail bounces.
  update public.projects
     set owner_email = regexp_replace(lower(owner_email), _rx, _new)
   where owner_email ilike '%' || _old;
  get diagnostics _n = row_count;
  raise notice 'projects.owner_email: % row(s)', _n;

  update public.tasks
     set assignee_email = regexp_replace(lower(assignee_email), _rx, _new)
   where assignee_email ilike '%' || _old;
  get diagnostics _n = row_count;
  raise notice 'tasks.assignee_email: % row(s)', _n;

  raise notice 'Done. Everyone now signs in with their % address.', _new;
end $$;

-- ----------------------------------------------------------------------------
-- STEP 3 - confirm nothing is left on the old domain.
-- ----------------------------------------------------------------------------
select 'auth.users'     as source, count(*) as should_be_zero from auth.users      where email ilike '%@nstextile-eg.com'
union all
select 'auth.identities',      count(*) from auth.identities where identity_data->>'email' ilike '%@nstextile-eg.com'
union all
select 'public.users',         count(*) from public.users    where email ilike '%@nstextile-eg.com'
union all
select 'projects.owner_email', count(*) from public.projects where owner_email ilike '%@nstextile-eg.com'
union all
select 'tasks.assignee_email', count(*) from public.tasks    where assignee_email ilike '%@nstextile-eg.com'
order by 1;

-- Cross-check that every project owner still resolves to a real user, which is
-- what ProjectForm relies on: users.find(u => u.email === owner_email).
select p.id, p.name, p.owner_email
  from public.projects p
 where p.owner_email is not null
   and not exists (select 1 from public.users u where lower(u.email) = lower(p.owner_email))
 order by p.name;

-- ============================================================================
-- NOT handled here, on purpose:
--
-- .env.local still sends mail as followup@nstextile-eg.com through
-- mail.nstextile-eg.com (SMTP_HOST / SMTP_USER / SMTP_FROM). That is the
-- outbound mailbox, not a person's address. Changing it needs a working
-- mailbox and SMTP credentials on naguibselim.com first - point it at a
-- domain that cannot authenticate and every notification silently stops.
-- ============================================================================
