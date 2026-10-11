-- ============================================================================
-- Add Manar Faisal with full edit rights (same level as Farah Ashraf).
-- Run in the Supabase SQL editor with the postgres role. Safe to re-run.
--
-- BEFORE RUNNING: replace SET_A_PASSWORD_HERE below with the password she
-- should sign in with. It is a placeholder on purpose - no password is kept
-- in this file, so nothing secret is committed to the repository. Type it in
-- the SQL editor, run the script, then tell her the password out of band.
--
-- Two halves to this change:
--   1. This file  - creates the login + the public.users row with role 'admin'.
--   2. Code       - her name is in PROJECT_OWNERS in src/lib/constants.ts and
--                   'manar' in ALLOWED_EDIT_DELETE_FIRST_NAMES in
--                   src/lib/auth/AuthProvider.tsx, which is what
--                   canEditDelete() actually checks. Without that code change
--                   she can open everything but the edit/delete buttons stay
--                   hidden.
--
-- IMPORTANT: full_name must stay exactly 'Manar Faisal' - canEditDelete()
-- matches PROJECT_OWNERS on the lowercased full name.
-- ============================================================================

do $$
declare
  _email text := 'manar.faisal@naguibselim.com';
  _name  text := 'Manar Faisal';

  -- <<< REPLACE THIS, then run. Do not commit a real password. >>>
  _pass  text := 'SET_A_PASSWORD_HERE';

  _uid   uuid;
begin
  if _pass = 'SET_A_PASSWORD_HERE' then
    raise exception 'Replace SET_A_PASSWORD_HERE at the top of this file with a real password, then run again. Nothing was created.';
  end if;

  -- Supabase rejects anything shorter than its minimum password length.
  if length(_pass) < 6 then
    raise exception 'Password must be at least 6 characters. Nothing was created.';
  end if;

  -- Reuse the existing auth user if this email is already registered.
  select id into _uid from auth.users where lower(email) = lower(_email);

  if _uid is null then
    _uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      _uid,
      'authenticated',
      'authenticated',
      lower(_email),
      crypt(_pass, gen_salt('bf')),
      now(), null, null,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', _name),
      now(), now(),
      '', '', '', ''
    );

    -- Identity row, so Supabase Auth treats this as an email+password account.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      _uid,
      jsonb_build_object('sub', _uid::text, 'email', lower(_email)),
      'email',
      _uid::text,
      now(), now(), now()
    );

    raise notice 'Created auth user % (%)', _email, _uid;
  else
    -- Re-run: reset the password and make sure the email is confirmed.
    update auth.users
       set encrypted_password = crypt(_pass, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                                || jsonb_build_object('full_name', _name),
           updated_at         = now()
     where id = _uid;

    raise notice 'Auth user % already existed (%) - password reset', _email, _uid;
  end if;

  -- Mirror row in public.users. 'admin' is what canManageProjects() requires.
  insert into public.users (id, email, full_name, role)
  values (_uid, lower(_email), _name, 'admin')
  on conflict (id) do update
    set email     = excluded.email,
        full_name = excluded.full_name,
        role      = 'admin';
end $$;

-- Sanity check.
select u.id, u.email, u.full_name, u.role, a.email_confirmed_at is not null as confirmed
  from public.users u
  join auth.users  a on a.id = u.id
 where lower(u.email) = 'manar.faisal@naguibselim.com';
