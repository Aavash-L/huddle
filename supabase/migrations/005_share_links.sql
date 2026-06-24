-- ============================================================
-- Huddle — Migration 005: Per-plan share links + web RSVP
-- ============================================================
-- Adds:
--   1. plans.share_token           — stable per-plan invite URL token
--   2. plan_invitees.rsvp          — web guest RSVP (in/wavering/out)
--   3. plan_invitees.display_name  — web guest chosen name
--   4. phone nullable              — web guests have no phone
--   5. resolve_share_token()       — SECURITY DEFINER: read plan via share token
--   6. join_plan_via_share()       — SECURITY DEFINER: create web invitee + return personal token
--   7. set_web_rsvp()              — SECURITY DEFINER: write RSVP via personal response_token
-- ============================================================

-- ─── 1. share_token on plans ─────────────────────────────────

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE;

-- Backfill existing plans
UPDATE public.plans SET share_token = uuid_generate_v4() WHERE share_token IS NULL;

-- Now enforce NOT NULL + default for new plans
ALTER TABLE public.plans ALTER COLUMN share_token SET DEFAULT uuid_generate_v4();
ALTER TABLE public.plans ALTER COLUMN share_token SET NOT NULL;

-- ─── 2 & 3. RSVP + display name on plan_invitees ─────────────

ALTER TABLE public.plan_invitees
  ADD COLUMN IF NOT EXISTS rsvp TEXT CHECK (rsvp IN ('in', 'wavering', 'out'));

ALTER TABLE public.plan_invitees
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ─── 4. Make phone nullable for web guests ───────────────────

ALTER TABLE public.plan_invitees ALTER COLUMN phone DROP NOT NULL;

-- ─── 5. resolve_share_token() ────────────────────────────────
-- Returns basic plan preview data for an anonymous visitor.
-- SECURITY DEFINER so anon role can read plans without auth.
-- Only exposes aggregate counts — no PII.

CREATE OR REPLACE FUNCTION public.resolve_share_token(p_share_token UUID)
RETURNS TABLE(
  plan_id        UUID,
  title          TEXT,
  type           TEXT,
  theme          TEXT,
  status         TEXT,
  locked_datetime TIMESTAMPTZ,
  location       TEXT,
  creator_name   TEXT,
  in_count       BIGINT,
  invitee_count  BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.type,
    p.theme,
    p.status,
    p.locked_datetime,
    p.location,
    u.name,
    -- in_count: app users committed 'in' + web guests rsvp='in'
    (
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'in')
      + COUNT(DISTINCT pi_web.id) FILTER (WHERE pi_web.rsvp = 'in' AND pi_web.user_id IS NULL)
    ),
    -- invitee_count: all invitees (app + web)
    COUNT(DISTINCT pi_all.id)
  FROM public.plans p
  LEFT JOIN public.users u ON u.id = p.creator_id
  LEFT JOIN public.commitments c ON c.plan_id = p.id
  LEFT JOIN public.plan_invitees pi_web ON pi_web.plan_id = p.id
  LEFT JOIN public.plan_invitees pi_all ON pi_all.plan_id = p.id
  WHERE p.share_token = p_share_token
  GROUP BY p.id, p.title, p.type, p.theme, p.status,
           p.locked_datetime, p.location, u.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_share_token TO anon, authenticated;

-- ─── 6. join_plan_via_share() ────────────────────────────────
-- Creates a new web-guest plan_invitees row and returns a
-- personal response_token the visitor can use for future calls.
-- Rate-limited: 10 joins per minute per share_token.

CREATE OR REPLACE FUNCTION public.join_plan_via_share(
  p_share_token  UUID,
  p_display_name TEXT DEFAULT 'Guest'
) RETURNS TABLE(response_token UUID, plan_id UUID) AS $$
DECLARE
  v_plan_id UUID;
  v_token   UUID;
  v_rate_ok BOOLEAN;
BEGIN
  -- Rate limit: 10 new joins per minute per share_token
  SELECT public.check_and_increment_rate_limit(
    'share:' || p_share_token::TEXT, 10
  ) INTO v_rate_ok;

  IF NOT v_rate_ok THEN
    RAISE EXCEPTION 'Too many join attempts. Please wait a minute.';
  END IF;

  SELECT id INTO v_plan_id FROM public.plans WHERE share_token = p_share_token;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share link.';
  END IF;

  v_token := uuid_generate_v4();

  INSERT INTO public.plan_invitees (plan_id, display_name, response_token)
  VALUES (v_plan_id, COALESCE(NULLIF(TRIM(p_display_name), ''), 'Guest'), v_token);

  RETURN QUERY SELECT v_token, v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.join_plan_via_share TO anon, authenticated;

-- ─── 7. set_web_rsvp() ───────────────────────────────────────
-- Updates plan_invitees.rsvp for the row matching the given
-- personal response_token. Rate-limited: 30 per minute per token.
-- Validates status strictly — only 'in', 'wavering', 'out'.

CREATE OR REPLACE FUNCTION public.set_web_rsvp(
  p_response_token UUID,
  p_rsvp           TEXT
) RETURNS VOID AS $$
DECLARE
  v_rate_ok BOOLEAN;
  v_rows    INTEGER;
BEGIN
  IF p_rsvp NOT IN ('in', 'wavering', 'out') THEN
    RAISE EXCEPTION 'Invalid RSVP status.';
  END IF;

  SELECT public.check_and_increment_rate_limit(
    'rsvp:' || p_response_token::TEXT, 30
  ) INTO v_rate_ok;

  IF NOT v_rate_ok THEN
    RAISE EXCEPTION 'Too many RSVP attempts. Please wait a minute.';
  END IF;

  UPDATE public.plan_invitees
  SET rsvp = p_rsvp
  WHERE response_token = p_response_token;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Invalid response token.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_web_rsvp TO anon, authenticated;
