-- ============================================================
-- Huddle — Seed Data for Development & Testing
-- ============================================================
-- Creates 4 test users in a crew with:
--   1. One plan mid-convergence (partial availability)
--   2. One locked plan with mixed in/wavering commitments
--   3. One trip in progress
--
-- Usage:
--   supabase db reset  (applies migrations + this seed)
--   OR: psql $DATABASE_URL < supabase/seed.sql
--
-- Test phone numbers (Supabase local dev accepts OTP: 123456):
--   +15550000001 — Alex (creator)
--   +15550000002 — Sam
--   +15550000003 — Mia
--   +15550000004 — Jordan
-- ============================================================

BEGIN;

-- ─── Auth users (Supabase's auth.users table) ─────────────────
-- These must exist before public.users because of the FK
-- In local dev, Supabase CLI manages auth.users via the inbucket
-- We insert directly for seeding purposes

INSERT INTO auth.users (
  id, instance_id, aud, role, email, phone,
  encrypted_password, email_confirmed_at, phone_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, deleted_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', NULL, '+15550000001',
    '', NOW(), NOW(), NOW(), NOW(), '', '', '', '{}', '{}', FALSE, FALSE, NULL
  ),
  (
    '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', NULL, '+15550000002',
    '', NOW(), NOW(), NOW(), NOW(), '', '', '', '{}', '{}', FALSE, FALSE, NULL
  ),
  (
    '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', NULL, '+15550000003',
    '', NOW(), NOW(), NOW(), NOW(), '', '', '', '{}', '{}', FALSE, FALSE, NULL
  ),
  (
    '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', NULL, '+15550000004',
    '', NOW(), NOW(), NOW(), NOW(), '', '', '', '{}', '{}', FALSE, FALSE, NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Public users ─────────────────────────────────────────────

INSERT INTO public.users (id, phone, name, avatar_url, reliability_score, never_bail_streak) VALUES
  ('11111111-1111-1111-1111-111111111111', '+15550000001', 'Alex Rivera',   NULL, 95, 5),
  ('22222222-2222-2222-2222-222222222222', '+15550000002', 'Sam Chen',      NULL, 88, 3),
  ('33333333-3333-3333-3333-333333333333', '+15550000003', 'Mia Johnson',   NULL, 100, 12),
  ('44444444-4444-4444-4444-444444444444', '+15550000004', 'Jordan Park',   NULL, 72, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Crew: The Squad ──────────────────────────────────────────

INSERT INTO public.crews (id, name, theme, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Squad', 'ocean', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crew_members (crew_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member')
ON CONFLICT (crew_id, user_id) DO NOTHING;

-- ─── Plan 1: Mid-convergence (gathering availability) ─────────

INSERT INTO public.plans (id, title, type, theme, status, creator_id, crew_id, quorum_n) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Dinner at that new ramen place',
    'dinner', 'sunset', 'gathering',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    3
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plan_invitees (plan_id, user_id, phone) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '+15550000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '+15550000002'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '+15550000003'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', '+15550000004')
ON CONFLICT (plan_id, phone) DO NOTHING;

-- Partial availability: Alex + Sam free Friday evening, Mia free Friday + Saturday evening
INSERT INTO public.availability (plan_id, user_id, time_window, available) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
   '{"date": "2026-06-27", "slot": "evening"}'::jsonb, TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   '{"date": "2026-06-27", "slot": "evening"}'::jsonb, TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333',
   '{"date": "2026-06-27", "slot": "evening"}'::jsonb, TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333',
   '{"date": "2026-06-28", "slot": "evening"}'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- ─── Plan 2: Locked with mixed commitments ────────────────────

INSERT INTO public.plans (id, title, type, theme, status, creator_id, crew_id, quorum_n,
                          locked_datetime, location, activity) VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Beach day 🏖️',
    'activity', 'neon', 'locked',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    3,
    (NOW() + INTERVAL '3 days')::TIMESTAMPTZ,
    'Sandy Hook Beach, NJ',
    'Beach volleyball + BBQ'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plan_invitees (plan_id, user_id, phone) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '+15550000001'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '+15550000002'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '+15550000003'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', '+15550000004')
ON CONFLICT (plan_id, phone) DO NOTHING;

INSERT INTO public.commitments (plan_id, user_id, status) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'in'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'in'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'in'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'wavering')
ON CONFLICT (plan_id, user_id) DO NOTHING;

-- Some chat messages for the locked plan
INSERT INTO public.messages (plan_id, user_id, body, created_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
   'Locked in!! Beach day is happening 🔥', NOW() - INTERVAL '1 day'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222',
   'YESSSS can''t wait', NOW() - INTERVAL '23 hours'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333',
   'I''ll bring the cooler 🥤', NOW() - INTERVAL '22 hours'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444',
   'Might be running late but I''ll be there', NOW() - INTERVAL '20 hours')
ON CONFLICT DO NOTHING;

-- ─── Plan 3: Trip in progress ─────────────────────────────────

INSERT INTO public.plans (id, title, type, theme, status, creator_id, crew_id, quorum_n) VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Portugal Summer Trip ✈️',
    'trip', 'midnight', 'gathering',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    4
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plan_invitees (plan_id, user_id, phone) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '+15550000001'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '+15550000002'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', '+15550000003'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', '+15550000004')
ON CONFLICT (plan_id, phone) DO NOTHING;

INSERT INTO public.trips (id, plan_id, destination, start_date, end_date, budget_per_person,
                          vibe, musts) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Lisbon, Portugal',
    '2026-08-10',
    '2026-08-17',
    1200.00,
    'beaches, food, nightlife, exploring',
    'Pastéis de nata, one big night out in Bairro Alto, day trip to Sintra'
  )
ON CONFLICT (id) DO NOTHING;

-- Some pre-generated itinerary items for Day 1
INSERT INTO public.itinerary_items (trip_id, day, payload, status) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1,
    '{
      "time": "3:00 PM",
      "title": "Arrive at Humberto Delgado Airport",
      "description": "Fly into Lisbon. Take the Aero Bus or Metro to your accommodation in Baixa.",
      "type": "transport",
      "estimated_cost": 5,
      "notes": "Metro takes ~35 min. Buy a Viva Viagem card at the airport."
    }'::jsonb,
    'confirmed'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1,
    '{
      "time": "5:00 PM",
      "title": "Check in: Lisboa Central Hostel (or similar Baixa hotel)",
      "description": "Base yourself in Baixa for easy walking access to everything. Great group rates available.",
      "type": "stay",
      "estimated_cost": 60,
      "notes": "Book well in advance for August. Budget €50-80/person/night."
    }'::jsonb,
    'proposed'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1,
    '{
      "time": "7:30 PM",
      "title": "Time Out Market Lisboa",
      "description": "The legendary Lisbon food hall — try the famous pastéis de nata from Pastéis de Belém stall, fresh seafood, ginjinha shots. Perfect first-night introduction to Lisbon food.",
      "type": "food",
      "estimated_cost": 25,
      "notes": "Get there early to beat the evening crowds. Ribeira das Naus afterwards for a sunset walk."
    }'::jsonb,
    'confirmed'
  )
ON CONFLICT DO NOTHING;

-- ─── Entitlement: give Alex Pro for testing the paywall bypass ─
INSERT INTO public.entitlements (user_id, feature, expires_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'trip_mode', (NOW() + INTERVAL '30 days')),
  ('11111111-1111-1111-1111-111111111111', 'ai_suggestions', (NOW() + INTERVAL '30 days')),
  ('11111111-1111-1111-1111-111111111111', 'unlimited_huddles', (NOW() + INTERVAL '30 days'))
ON CONFLICT (user_id, feature) DO NOTHING;

COMMIT;

-- ─── Summary ──────────────────────────────────────────────────
-- Test accounts (phone OTP = 123456 in local dev):
--   Alex  +15550000001  (creator, Pro entitlement)
--   Sam   +15550000002  (member, free tier)
--   Mia   +15550000003  (member, free tier, never-bail streak 12)
--   Jordan +15550000004 (member, free tier, wavering on beach day)
--
-- Plans:
--   bbbbbbbb  "Dinner at that new ramen place"  status=gathering  (3 of 4 responded)
--   cccccccc  "Beach day 🏖️"                   status=locked     (3 in, 1 wavering)
--   dddddddd  "Portugal Summer Trip ✈️"          status=gathering  (has trip row)
