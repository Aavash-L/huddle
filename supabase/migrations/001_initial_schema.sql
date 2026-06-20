-- ============================================================
-- Huddle — Initial Schema Migration
-- ============================================================
-- Run order: this file first, then 002_rls_policies.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  avatar_url      TEXT,
  reliability_score    INTEGER NOT NULL DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  never_bail_streak    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'App users, identified by phone number via Supabase phone OTP';
COMMENT ON COLUMN public.users.reliability_score IS '0-100 score, decreases on bail, recovers over time';
COMMENT ON COLUMN public.users.never_bail_streak IS 'Consecutive plans committed + attended without bailing';

-- Index for phone lookup during OTP auth
CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users (phone);

-- ─── Push Tokens ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

-- ─── Crews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  theme       TEXT NOT NULL DEFAULT 'sunset' CHECK (theme IN ('sunset', 'ocean', 'neon', 'forest', 'candy', 'midnight')),
  created_by  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crew_members (
  crew_id     UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS crew_members_user_idx ON public.crew_members (user_id);

-- ─── Plans ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL CHECK (char_length(title) <= 60),
  type            TEXT NOT NULL DEFAULT 'hangout' CHECK (type IN ('hangout', 'dinner', 'activity', 'trip', 'party', 'other')),
  theme           TEXT NOT NULL DEFAULT 'sunset' CHECK (theme IN ('sunset', 'ocean', 'neon', 'forest', 'candy', 'midnight')),
  status          TEXT NOT NULL DEFAULT 'gathering' CHECK (status IN ('gathering', 'converging', 'locked', 'happened', 'cancelled')),
  creator_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  crew_id         UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  locked_datetime TIMESTAMPTZ,
  location        TEXT,
  activity        TEXT,
  quorum_n        INTEGER NOT NULL DEFAULT 3 CHECK (quorum_n >= 1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plans_creator_idx ON public.plans (creator_id);
CREATE INDEX IF NOT EXISTS plans_crew_idx ON public.plans (crew_id) WHERE crew_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS plans_status_idx ON public.plans (status);

-- ─── Plan Invitees ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_invitees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  phone           TEXT NOT NULL,
  response_token  UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, phone)
);

CREATE INDEX IF NOT EXISTS plan_invitees_plan_idx ON public.plan_invitees (plan_id);
CREATE INDEX IF NOT EXISTS plan_invitees_user_idx ON public.plan_invitees (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS plan_invitees_token_idx ON public.plan_invitees (response_token);

-- ─── Availability ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  response_token  UUID REFERENCES public.plan_invitees(response_token) ON DELETE CASCADE,
  time_window     JSONB NOT NULL, -- { date: "YYYY-MM-DD", slot: "morning"|"afternoon"|"evening"|"HH:00" }
  available       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Either user_id or response_token must be set (not both)
  CONSTRAINT availability_respondent CHECK (
    (user_id IS NOT NULL AND response_token IS NULL) OR
    (user_id IS NULL AND response_token IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS availability_plan_idx ON public.availability (plan_id);
CREATE INDEX IF NOT EXISTS availability_user_idx ON public.availability (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS availability_token_idx ON public.availability (response_token) WHERE response_token IS NOT NULL;

-- ─── Commitments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commitments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('in', 'wavering', 'out')),
  reason      TEXT CHECK (char_length(reason) <= 200),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS commitments_plan_idx ON public.commitments (plan_id);
CREATE INDEX IF NOT EXISTS commitments_user_idx ON public.commitments (user_id);
CREATE INDEX IF NOT EXISTS commitments_status_idx ON public.commitments (plan_id, status);

-- ─── Suggestions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('activity', 'itinerary_item')),
  payload     JSONB NOT NULL,
  votes       INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suggestion_votes (
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  voted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (suggestion_id, user_id)
);

CREATE INDEX IF NOT EXISTS suggestions_plan_idx ON public.suggestions (plan_id);

-- ─── Trips ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id           UUID NOT NULL UNIQUE REFERENCES public.plans(id) ON DELETE CASCADE,
  destination       TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  budget_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vibe              TEXT,
  musts             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_dates_valid CHECK (end_date >= start_date)
);

-- ─── Itinerary Items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day         INTEGER NOT NULL CHECK (day >= 1),
  payload     JSONB NOT NULL, -- { time, title, description, type, estimated_cost, notes }
  status      TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'vetoed')),
  added_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS itinerary_items_trip_idx ON public.itinerary_items (trip_id);
CREATE INDEX IF NOT EXISTS itinerary_items_day_idx ON public.itinerary_items (trip_id, day);

-- ─── Trip Payments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL,
  description TEXT,
  paid        BOOLEAN NOT NULL DEFAULT FALSE,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_payments_trip_idx ON public.trip_payments (trip_id);
CREATE INDEX IF NOT EXISTS trip_payments_user_idx ON public.trip_payments (user_id);

-- ─── Messages (per-plan chat) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_plan_idx ON public.messages (plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_user_idx ON public.messages (user_id);

-- ─── Subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier            TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'trip_pass')),
  trial_ends_at   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  source          TEXT NOT NULL CHECK (source IN ('ios_iap', 'android_iap', 'web', 'promo')),
  revenuecat_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tier)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);

-- ─── Entitlements ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entitlements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL CHECK (feature IN ('unlimited_huddles', 'trip_mode', 'ai_suggestions', 'priority_reminders', 'trip_pass')),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (user_id, feature)
);

CREATE INDEX IF NOT EXISTS entitlements_user_idx ON public.entitlements (user_id);

-- ─── Notification Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  event           TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expo_ticket_id  TEXT
);

CREATE INDEX IF NOT EXISTS notification_logs_user_plan_idx ON public.notification_logs (user_id, plan_id, event);
CREATE INDEX IF NOT EXISTS notification_logs_sent_at_idx ON public.notification_logs (sent_at DESC);

-- ─── AI Suggestion Cache ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_suggestion_cache (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key       TEXT NOT NULL UNIQUE,
  suggestions     JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS ai_cache_key_idx ON public.ai_suggestion_cache (cache_key);
CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON public.ai_suggestion_cache (expires_at);

-- ─── Functions ────────────────────────────────────────────────

-- Increment vote count when a suggestion_vote is inserted
CREATE OR REPLACE FUNCTION public.increment_suggestion_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.suggestions
  SET votes = votes + 1
  WHERE id = NEW.suggestion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_suggestion_vote_insert
  AFTER INSERT ON public.suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_suggestion_votes();

-- Decrement vote count when a suggestion_vote is deleted
CREATE OR REPLACE FUNCTION public.decrement_suggestion_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.suggestions
  SET votes = GREATEST(0, votes - 1)
  WHERE id = OLD.suggestion_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_suggestion_vote_delete
  AFTER DELETE ON public.suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_suggestion_votes();

-- Check quorum and auto-advance plan to 'converging' when enough people are 'in'
CREATE OR REPLACE FUNCTION public.check_quorum()
RETURNS TRIGGER AS $$
DECLARE
  v_plan public.plans;
  v_in_count INTEGER;
BEGIN
  SELECT * INTO v_plan FROM public.plans WHERE id = NEW.plan_id;

  IF v_plan.status NOT IN ('gathering', 'converging') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_in_count
  FROM public.commitments
  WHERE plan_id = NEW.plan_id AND status = 'in';

  IF v_in_count >= v_plan.quorum_n AND v_plan.status = 'gathering' THEN
    UPDATE public.plans SET status = 'converging' WHERE id = NEW.plan_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_commitment_quorum_check
  AFTER INSERT OR UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.check_quorum();

-- Update reliability score when a plan moves to 'happened'
CREATE OR REPLACE FUNCTION public.update_reliability_on_plan_happened()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'happened'
  IF NEW.status = 'happened' AND OLD.status != 'happened' THEN
    -- Increment streak and improve score for users who were 'in'
    UPDATE public.users u
    SET
      never_bail_streak = u.never_bail_streak + 1,
      reliability_score = LEAST(100, u.reliability_score + 5)
    FROM public.commitments c
    WHERE c.plan_id = NEW.id
      AND c.status = 'in'
      AND c.user_id = u.id;

    -- Reset streak and reduce score for users who bailed
    UPDATE public.users u
    SET
      never_bail_streak = 0,
      reliability_score = GREATEST(0, u.reliability_score - 15)
    FROM public.commitments c
    WHERE c.plan_id = NEW.id
      AND c.status = 'out'
      AND c.user_id = u.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_plan_happened
  AFTER UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_reliability_on_plan_happened();

-- Auto-create a user record when Supabase auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone)
  VALUES (NEW.id, COALESCE(NEW.phone, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for live collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
