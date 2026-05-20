-- ============================================================================
-- Create 3 restricted users (password: 123456) and matching public.users rows.
-- Run in the Supabase SQL editor with the postgres role.
--
-- Notes:
--   * Each user gets role = 'team_member' in public.users.
--   * Scoping (they only see their own projects/tasks) is enforced client-side
--     in the app via src/lib/hooks/useScopedData.ts. For full server-side
--     enforcement you would additionally tighten RLS policies on projects/tasks.
-- ============================================================================

-- Helper to insert one auth user + public.users row idempotently.
-- Uses gen_random_uuid() for the id; if the user already exists by email,
-- we skip the auth insert and just upsert public.users.

do $$
declare
  _email text;
  _name  text;
  _uid   uuid;
  _users text[][] := array[
    array['osama.erian@nstextile-eg.com',    'Osama Erian'],
    array['khaled.alnemr@nstextile-eg.com',  'Khaled Alnemr'],
    array['mohamed.hussein@nstextile-eg.com','Mohamed Hussein']
  ];
  i int;
begin
  for i in 1..array_length(_users, 1) loop
    _email := _users[i][1];
    _name  := _users[i][2];

    -- Reuse existing auth user if present, otherwise create.
    select id into _uid from auth.users where email = _email;

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
        _email,
        crypt('123456', gen_salt('bf')),
        now(), null, null,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', _name),
        now(), now(),
        '', '', '', ''
      );

      -- Identity row so Supabase Auth treats it as an email-password account.
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        _uid,
        jsonb_build_object('sub', _uid::text, 'email', _email),
        'email',
        _uid::text,
        now(), now(), now()
      );
    else
      -- Reset password to 123456 on re-run, just in case.
      update auth.users
         set encrypted_password = crypt('123456', gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at = now()
       where id = _uid;
    end if;

    -- Mirror row in public.users (your app reads from here).
    insert into public.users (id, email, full_name, role)
    values (_uid, _email, _name, 'team_member')
    on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          role = 'team_member';
  end loop;
end $$;

-- Sanity check: verify the 3 rows exist.
select id, email, full_name, role
  from public.users
 where email in (
   'osama.erian@nstextile-eg.com',
   'khaled.alnemr@nstextile-eg.com',
   'mohamed.hussein@nstextile-eg.com'
 )
 order by email;
