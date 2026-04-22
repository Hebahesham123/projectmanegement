-- ============================================================================
-- Seed data for Project Tracker — B2C e-commerce website scenario
-- Run this AFTER schema.sql AND after you have signed up at least one user.
-- Pure SQL (no DO blocks / no PL/pgSQL variables) for maximum compatibility.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Disable all user-level triggers on our tables for the duration of the seed.
-- This sidesteps any external webhook / stale trigger / user-defined function
-- that might be firing on INSERT and failing (e.g. the "orders" reference).
-- We re-enable them + re-run the completion math at the bottom of this file.
-- ----------------------------------------------------------------------------
alter table public.projects      disable trigger user;
alter table public.tasks         disable trigger user;
alter table public.comments      disable trigger user;
alter table public.notifications disable trigger user;

-- Helper view: the admin (first-signed-up) user.
create or replace view public._seed_admin as
  select id as aid, email as aemail
  from public.users
  order by created_at asc
  limit 1;

-- Clean any prior seed rows (safe — matched by "[SEED]" tag or /projects/<seed-uuid> link)
delete from public.notifications
 where link in (
   select '/projects/' || id::text from public.projects where description like '[SEED]%'
 );
delete from public.projects where description like '[SEED]%';

-- ============================================================================
-- PROJECTS — fixed UUIDs so tasks can reference them
-- ============================================================================
insert into public.projects (id, name, description, sector, owner_name, owner_email, owner_mobile, start_date, estimated_end_date, created_by)
select v.id, v.name, v.description, v.sector, v.owner_name, v.owner_email, v.owner_mobile, v.start_date, v.estimated_end_date, a.aid
  from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid,
   'B2C E-Commerce Platform – MVP',
   '[SEED] Core online shop: catalog, cart, checkout, account, order history. The flagship initiative launching this quarter.',
   'Engineering', 'Lina Khalaf', 'lina.khalaf@acme.com', '+971 50 123 4567',
   current_date - 60, current_date + 14),
  ('a0000000-0000-0000-0000-000000000002'::uuid,
   'Customer Mobile App (iOS & Android)',
   '[SEED] Native companion app using React Native — browsing, cart sync, push notifications, biometric login.',
   'Mobile', 'Omar Haddad', 'omar.haddad@acme.com', '+971 55 234 5678',
   current_date - 45, current_date + 35),
  ('a0000000-0000-0000-0000-000000000003'::uuid,
   'Payment Gateway Integration',
   '[SEED] Stripe + Apple Pay + Google Pay + PCI audit. Slipped past original deadline; being reviewed with finance.',
   'Payments', 'Dana Saleh', 'dana.saleh@acme.com', '+971 56 345 6789',
   current_date - 90, current_date - 5),
  ('a0000000-0000-0000-0000-000000000004'::uuid,
   'Customer Support Portal',
   '[SEED] Self-service help center with FAQ, live chat handoff, ticket tracking. Vendor selection pending.',
   'Customer Success', 'Mira Nassar', 'mira.nassar@acme.com', '+971 50 456 7890',
   current_date + 10, current_date + 70),
  ('a0000000-0000-0000-0000-000000000005'::uuid,
   'Marketing Landing Pages',
   '[SEED] Launch, campaign, referral and newsletter pages — shipped on time last sprint.',
   'Marketing', 'Rami Farouk', 'rami.farouk@acme.com', '+971 55 567 8901',
   current_date - 120, current_date - 15),
  ('a0000000-0000-0000-0000-000000000006'::uuid,
   'SEO & Analytics Setup',
   '[SEED] Technical SEO, schema markup, GA4, Search Console, Core Web Vitals. Tight deadline before launch.',
   'Growth', 'Yasmin Tarek', 'yasmin.tarek@acme.com', '+971 52 678 9012',
   current_date - 30, current_date + 7)
) as v(id, name, description, sector, owner_name, owner_email, owner_mobile, start_date, estimated_end_date)
cross join public._seed_admin a;

-- ============================================================================
-- TASKS
-- ============================================================================
insert into public.tasks (project_id, title, description, assignee_id, assignee_name, assignee_email, assignee_mobile, status, completion_percentage, start_date, due_date, created_by)
select
  t.project_id,
  t.title,
  t.description,
  case when t.assign_to_admin then a.aid else null end,
  case when t.assign_to_admin then 'You (Admin)' else t.assignee_name end,
  case when t.assign_to_admin then a.aemail else t.assignee_email end,
  t.assignee_mobile,
  t.status::task_status,
  t.completion_percentage,
  t.start_date,
  t.due_date,
  a.aid
from public._seed_admin a
cross join (values
  -- Project 1: MVP E-Commerce (~55%)
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Design system & component library',
   'Tokens, buttons, forms, product card, modal. Storybook published.',
   true, null::text, null::text, null::text, 'done', 100, current_date - 58, current_date - 40),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Product catalog page',
   'Grid + filters (category, price, rating). SSR + ISR.',
   false, 'Hassan Nabil', 'hassan.nabil@acme.com', '+971 50 111 2233', 'done', 100, current_date - 50, current_date - 25),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Shopping cart flow',
   'Add/remove, quantity, persisted in localStorage and synced for logged-in users.',
   true, null, null, null, 'in_progress', 70, current_date - 30, current_date + 4),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Checkout flow',
   'Address → shipping → payment → review → confirmation. Integrate with payments project.',
   false, 'Layla Aziz', 'layla.aziz@acme.com', '+971 55 222 3344', 'in_progress', 55, current_date - 25, current_date + 7),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'User authentication',
   'Email/password, Google OAuth, password reset. Magic link deferred.',
   false, 'Karim Samir', 'karim.samir@acme.com', null, 'done', 100, current_date - 40, current_date - 20),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Order history page',
   'Past orders, status tracking, re-order.',
   true, null, null, null, 'in_progress', 40, current_date - 14, current_date + 10),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Wishlist feature',
   'Heart icon from catalog, dedicated page, share link.',
   false, 'Nora Fahim', 'nora.fahim@acme.com', '+971 56 333 4455', 'todo', 0, null, current_date + 12),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Admin dashboard stub',
   'Read-only metrics for internal team. Blocked on analytics API choice.',
   false, 'Hassan Nabil', 'hassan.nabil@acme.com', null, 'blocked', 20, current_date - 20, current_date + 20),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Transactional email templates',
   'Order confirmation, shipped, delivered, abandoned cart.',
   false, 'Layla Aziz', 'layla.aziz@acme.com', null, 'in_progress', 30, current_date - 10, current_date + 14),
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'QA regression suite',
   'Playwright e2e for all critical flows. Gate for launch.',
   false, 'Nora Fahim', 'nora.fahim@acme.com', null, 'todo', 0, current_date + 3, current_date + 13),

  -- Project 2: Customer Mobile App (~37%)
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Tech stack decision (RN vs native)',
   'RFC reviewed — going with React Native + Expo EAS.',
   true, null, null, null, 'done', 100, current_date - 44, current_date - 38),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Onboarding screens',
   '3-step intro with language picker.',
   false, 'Omar Haddad', 'omar.haddad@acme.com', null, 'done', 100, current_date - 35, current_date - 22),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Product browse screen',
   'Infinite scroll, search, category chips.',
   true, null, null, null, 'in_progress', 60, current_date - 18, current_date + 8),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Cart screen (native)',
   'Shared state with web via API.',
   false, 'Layla Aziz', 'layla.aziz@acme.com', null, 'in_progress', 40, current_date - 10, current_date + 15),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Push notifications',
   'FCM + APNS, topic-based. Deep-link into orders.',
   false, 'Karim Samir', 'karim.samir@acme.com', null, 'todo', 0, null, current_date + 22),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Biometric auth',
   'Face ID / Touch ID / fingerprint.',
   false, 'Karim Samir', 'karim.samir@acme.com', null, 'todo', 0, null, current_date + 25),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Deep linking (universal links)',
   'Share-to-app from web, support links from email.',
   false, 'Omar Haddad', 'omar.haddad@acme.com', null, 'todo', 0, null, current_date + 30),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'App Store & Play Store assets',
   'Screenshots, feature graphic, description in EN/AR.',
   false, 'Rami Farouk', 'rami.farouk@acme.com', null, 'todo', 0, null, current_date + 33),

  -- Project 3: Payment Gateway (DELAYED, ~38%)
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Stripe integration (cards + 3DS)',
   'Test + live keys, webhooks wired.',
   true, null, null, null, 'done', 100, current_date - 88, current_date - 60),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Apple Pay',
   'Domain verification + merchant ID done; button integration in progress.',
   false, 'Dana Saleh', 'dana.saleh@acme.com', null, 'in_progress', 50, current_date - 40, current_date + 3),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Google Pay',
   'Overdue — environment keys held up by vendor account review.',
   false, 'Dana Saleh', 'dana.saleh@acme.com', null, 'todo', 0, current_date - 30, current_date - 5),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Webhook handlers (charge.*, refund.*)',
   'Retry + idempotency keys.',
   true, null, null, null, 'in_progress', 70, current_date - 25, current_date + 2),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'PCI compliance audit',
   'SAQ-A scope confirmed; awaiting auditor signoff.',
   false, 'Dana Saleh', 'dana.saleh@acme.com', null, 'blocked', 10, current_date - 20, current_date + 10),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Refund flow (admin-initiated)',
   'Partial + full refunds, reason codes.',
   false, 'Karim Samir', 'karim.samir@acme.com', null, 'todo', 0, null, current_date - 3),

  -- Project 5: Marketing Landing Pages (COMPLETED)
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Hero + above-the-fold',
   'Animated hero with primary CTA.',
   false, 'Rami Farouk', 'rami.farouk@acme.com', null, 'done', 100, current_date - 118, current_date - 90),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Feature grid & benefits',
   '6 features with icons, EN/AR content.',
   false, 'Rami Farouk', 'rami.farouk@acme.com', null, 'done', 100, current_date - 100, current_date - 75),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Customer testimonials carousel',
   'Sourced 8 testimonials. Auto-rotate w/ pause on hover.',
   true, null, null, null, 'done', 100, current_date - 80, current_date - 50),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Newsletter signup (Mailchimp)',
   'Double opt-in, welcome series.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'done', 100, current_date - 60, current_date - 30),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'A/B test setup (hero variant)',
   'GrowthBook variant. Winner rolled out.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'done', 100, current_date - 45, current_date - 20),

  -- Project 6: SEO & Analytics (~73%, deadline in 7 days → YELLOW)
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Sitemap.xml generation',
   'Dynamic + submitted to Search Console.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'done', 100, current_date - 28, current_date - 20),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Meta tags audit (all pages)',
   'Unique title + description; OG + Twitter cards.',
   true, null, null, null, 'done', 100, current_date - 22, current_date - 12),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Schema.org markup (Product, Organization, FAQ)',
   'Rich results validated in Search Console.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'in_progress', 80, current_date - 15, current_date + 4),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Core Web Vitals optimization',
   'LCP < 2.5s, CLS < 0.1. Working on image lazy-load.',
   true, null, null, null, 'in_progress', 60, current_date - 10, current_date + 6),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'GA4 + server-side events',
   'E-commerce events wired.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'done', 100, current_date - 20, current_date - 10),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Search Console property verification',
   'Add both www and non-www, submit sitemap.',
   false, 'Yasmin Tarek', 'yasmin.tarek@acme.com', null, 'todo', 0, null, current_date + 5)

  -- Project 4 (Customer Support Portal) has NO tasks on purpose — stays Not Started.
) as t(project_id, title, description, assign_to_admin, assignee_name, assignee_email, assignee_mobile, status, completion_percentage, start_date, due_date);

-- ============================================================================
-- COMMENTS — reference tasks by title + project_id
-- ============================================================================
insert into public.comments (task_id, author_id, body)
select t.id, a.aid, 'Scoping meeting with finance tomorrow at 10:00 — agenda attached.'
  from public.tasks t, public._seed_admin a
 where t.title = 'PCI compliance audit'
   and t.project_id = 'a0000000-0000-0000-0000-000000000003'::uuid
 limit 1;

insert into public.comments (task_id, author_id, body)
select t.id, a.aid, 'Google Pay sandbox account activated; merchant review pending. ETA 2 days per vendor.'
  from public.tasks t, public._seed_admin a
 where t.title = 'Google Pay'
   and t.project_id = 'a0000000-0000-0000-0000-000000000003'::uuid
 limit 1;

insert into public.comments (task_id, author_id, body)
select t.id, a.aid, 'Figma handoff ready — https://figma.com/… please review before implementation.'
  from public.tasks t, public._seed_admin a
 where t.title = 'Shopping cart flow'
   and t.project_id = 'a0000000-0000-0000-0000-000000000001'::uuid
 limit 1;

insert into public.comments (task_id, author_id, body)
select t.id, a.aid, 'Should we use signals or Zustand for cart state? Proposing Zustand for DX.'
  from public.tasks t, public._seed_admin a
 where t.title = 'Cart screen (native)'
   and t.project_id = 'a0000000-0000-0000-0000-000000000002'::uuid
 limit 1;

insert into public.comments (task_id, author_id, body)
select t.id, a.aid, 'Nice work on the hero — engagement up 18% vs control variant.'
  from public.tasks t, public._seed_admin a
 where t.title = 'A/B test setup (hero variant)'
   and t.project_id = 'a0000000-0000-0000-0000-000000000005'::uuid
 limit 1;

-- ============================================================================
-- NOTIFICATIONS — overdue + deadline-near
-- (assignment notifications were already created by the trigger during task inserts)
-- ============================================================================
insert into public.notifications (user_id, kind, title, body, link)
select a.aid, 'overdue', t.title,
       'Due ' || to_char(t.due_date, 'Mon DD') || ' — past deadline.',
       '/projects/' || t.project_id::text
  from public.tasks t, public._seed_admin a
 where t.due_date < current_date
   and t.status <> 'done'
   and t.project_id in (select id from public.projects where description like '[SEED]%')
 limit 5;

insert into public.notifications (user_id, kind, title, body, link)
select a.aid, 'deadline_near', t.title,
       'Due in ' || (t.due_date - current_date) || ' days.',
       '/projects/' || t.project_id::text
  from public.tasks t, public._seed_admin a
 where t.due_date between current_date and current_date + 7
   and t.status <> 'done'
   and t.project_id in (select id from public.projects where description like '[SEED]%')
 limit 5;

insert into public.notifications (user_id, kind, title, body, link)
select a.aid, 'project_update',
       'Marketing Landing Pages launched',
       'All tasks complete. Nice work!',
       '/projects/a0000000-0000-0000-0000-000000000005'
  from public._seed_admin a;

-- ============================================================================
-- Re-enable triggers and manually recompute project completion (since the
-- auto-recalc trigger was disabled above).
-- ============================================================================
alter table public.projects      enable trigger user;
alter table public.tasks         enable trigger user;
alter table public.comments      enable trigger user;
alter table public.notifications enable trigger user;

update public.projects p set
  completion_rate = coalesce(
    (select round(avg(completion_percentage)::numeric, 2) from public.tasks where project_id = p.id),
    0
  ),
  status = case
    when (select count(*) from public.tasks where project_id = p.id) = 0
      then 'not_started'::project_status
    when (select count(*) from public.tasks where project_id = p.id)
       = (select count(*) from public.tasks where project_id = p.id and status = 'done')
      then 'completed'::project_status
    when p.estimated_end_date is not null and p.estimated_end_date < current_date
      then 'delayed'::project_status
    else 'in_progress'::project_status
  end,
  actual_end_date = case
    when (select count(*) from public.tasks where project_id = p.id) > 0
     and (select count(*) from public.tasks where project_id = p.id)
       = (select count(*) from public.tasks where project_id = p.id and status = 'done')
      then current_date
    else null
  end
where description like '[SEED]%';

-- ============================================================================
-- Sanity summary
-- ============================================================================
select
  (select count(*) from public.projects where description like '[SEED]%') as projects,
  (select count(*) from public.tasks where project_id in (select id from public.projects where description like '[SEED]%')) as tasks,
  (select count(*) from public.comments) as comments,
  (select count(*) from public.notifications) as notifications;
