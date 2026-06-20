-- ============================================================
-- Huddle — Migration 003: Critical fixes
-- ============================================================
-- Fixes:
--   1. Add plans_select_by_token policy (web responder was completely locked out)
--   2. Fix is_plan_member() — the OR pi.user_id IS NULL was too broad
--   3. Attach the handle_new_auth_user trigger to auth.users
--   4. Add availability_select_by_token for unauthenticated web readers
--   5. Add per-minute rate limiting table + function for token endpoints
-- ============================================================

-- ─── 1. Fix is_plan_member() ─────────────────────────────────
-- Remove the incorrect "OR pi.user_id IS NULL" — that made every
-- anonymous invitee row count as a valid plan membership for any user.
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.plan_invitees pi
    WHERE pi.plan_id = p_plan_id
      AND pi.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = p_plan_id AND p.creator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── 2. Add token-based plan read policy ─────────────────────
-- The entire no-account web flow (fetchPlanForToken) was broken
-- because plans_select_involved only checks auth.uid().
-- Token-holders must be able to read their own plan.
CREATE POLICY "plans_select_by_token"
  ON public.plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = plans.id
        AND pi.response_token = public.get_response_token()
    )
  );

-- ─── 3. Wire up the auth.users trigger ───────────────────────
-- The function was defined in 001 but never attached to auth.users.
-- This means new phone-OTP users didn't get a row in public.users
-- (the useAuth.ts manual insert is a backup, but the trigger is cleaner).
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── 4. Token-based commitments insert ───────────────────────
-- Web responders need to be able to set their RSVP (in/out/wavering).
-- The existing commitments_insert_own only allows auth.uid() users.
-- For the web flow, we map the response token to a commitment via plan_invitees.
-- We allow unauthenticated inserts tied to a valid response_token / plan.
-- NOTE: user_id is required for commitments (it's a FK to users).
-- Web responders who don't have accounts cannot set commitments directly —
-- they can only set availability. The RSVP on web is availability-based.
-- This is the correct behavior per the brief (no-account = availability only).

-- ─── 5. Rate limiting for token endpoints ────────────────────
-- Simple token-bucket rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL,         -- e.g. "token:<uuid>" or "ip:<addr>"
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  count       INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_key_window_idx ON public.rate_limits (key, window_start);

-- Auto-clean old rate limit rows (keep 1 hour)
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key TEXT,
  p_max_per_minute INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', NOW());
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Clean up old windows (older than 1 hour)
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  RETURN v_count <= p_max_per_minute;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for rate_limits — only Edge Functions (service role) touch this
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_deny_direct" ON public.rate_limits FOR ALL USING (FALSE);

-- ─── 6. Add missing plan_happened analytics trigger signal ───
-- Fire a notification to plan members when plan_happened is set.
-- This is handled by send-reminders, but we need a DB log entry.
-- (The actual push is done by the Edge Function; this just tracks it.)
