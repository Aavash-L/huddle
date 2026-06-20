-- ============================================================
-- Huddle — Migration 004: pg_cron schedule for send-reminders
-- ============================================================
-- Requires: pg_cron extension enabled in Supabase project.
-- Enable it in: Supabase dashboard → Extensions → pg_cron
-- OR via: CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- The send-reminders Edge Function is a pure HTTP handler.
-- pg_cron calls it via net.http_post() (requires pg_net extension).
-- Both are available on Supabase hosted projects by default.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Helper: call send-reminders via HTTP ─────────────────────
-- Wrapped in a function so pg_cron can call it cleanly.
CREATE OR REPLACE FUNCTION public.trigger_send_reminders()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
BEGIN
  -- These come from Supabase's vault / env; set them via:
  --   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-reminders';
  v_service_key := current_setting('app.service_role_key', true);

  IF v_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'trigger_send_reminders: missing app.supabase_url or app.service_role_key settings';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── pg_cron schedule ─────────────────────────────────────────
-- Run every hour at :00. The function itself is idempotent
-- (deduped via notification_logs). Hourly is sufficient:
--   - Day-of reminders: fires same hour as the event
--   - Night-before: fires the evening before
--   - T-3 days: fires in the 3-day window
--   - Stall nudges: fires if plan has been gathering for 3+ days
SELECT cron.schedule(
  'send-huddle-reminders',   -- job name (unique)
  '0 * * * *',               -- every hour at :00
  $$SELECT public.trigger_send_reminders();$$
);

-- ─── Configure app settings so the function can read them ─────
-- Run these ONCE after deploying:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
-- (Or use Supabase Vault for the service key)

-- ─── Verify the schedule was created ──────────────────────────
-- Run: SELECT * FROM cron.job WHERE jobname = 'send-huddle-reminders';
