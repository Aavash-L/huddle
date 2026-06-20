-- ============================================================
-- Huddle — Row Level Security Policies
-- ============================================================
-- Depends on: 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;

-- ─── Helper Functions ─────────────────────────────────────────

-- Check if the current user is invited to a plan (by user_id OR response token)
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.plan_invitees pi
    WHERE pi.plan_id = p_plan_id
      AND (
        pi.user_id = auth.uid()
        OR pi.user_id IS NULL -- web responder rows
      )
  ) OR EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = p_plan_id AND p.creator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if the current user is a crew member
CREATE OR REPLACE FUNCTION public.is_crew_member(p_crew_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.crew_members cm
    WHERE cm.crew_id = p_crew_id AND cm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if request has a valid response_token (for no-account web flow)
-- The token is passed as a claim in the JWT or as a request header
CREATE OR REPLACE FUNCTION public.get_response_token()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.headers', true)::json->>'x-response-token', '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── Users ────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- Users can read profiles of people they share a plan or crew with
CREATE POLICY "users_select_plan_members"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      JOIN public.plan_invitees pi2 ON pi.plan_id = pi2.plan_id
      WHERE pi.user_id = auth.uid()
        AND pi2.user_id = users.id
    ) OR EXISTS (
      SELECT 1 FROM public.plans p
      JOIN public.plan_invitees pi ON pi.plan_id = p.id
      WHERE p.creator_id = auth.uid()
        AND pi.user_id = users.id
    )
  );

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- New user creation is handled by the trigger (SECURITY DEFINER)
-- We still allow insert for the initial profile setup
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── Push Tokens ─────────────────────────────────────────────

CREATE POLICY "push_tokens_select_own"
  ON public.push_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own"
  ON public.push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_delete_own"
  ON public.push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- ─── Crews ───────────────────────────────────────────────────

CREATE POLICY "crews_select_member"
  ON public.crews FOR SELECT
  USING (public.is_crew_member(id) OR created_by = auth.uid());

CREATE POLICY "crews_insert_own"
  ON public.crews FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "crews_update_admin"
  ON public.crews FOR UPDATE
  USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crews.id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

CREATE POLICY "crews_delete_creator"
  ON public.crews FOR DELETE
  USING (created_by = auth.uid());

-- ─── Crew Members ─────────────────────────────────────────────

CREATE POLICY "crew_members_select_member"
  ON public.crew_members FOR SELECT
  USING (public.is_crew_member(crew_id));

CREATE POLICY "crew_members_insert_admin"
  ON public.crew_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crews c
      WHERE c.id = crew_id AND c.created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_members.crew_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

CREATE POLICY "crew_members_delete_self_or_admin"
  ON public.crew_members FOR DELETE
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.crew_members cm
      WHERE cm.crew_id = crew_members.crew_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- ─── Plans ───────────────────────────────────────────────────

-- Authenticated users can see plans they created or are invited to
CREATE POLICY "plans_select_involved"
  ON public.plans FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = plans.id AND pi.user_id = auth.uid()
    )
  );

CREATE POLICY "plans_insert_own"
  ON public.plans FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "plans_update_creator"
  ON public.plans FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "plans_delete_creator"
  ON public.plans FOR DELETE
  USING (creator_id = auth.uid());

-- ─── Plan Invitees ────────────────────────────────────────────

CREATE POLICY "plan_invitees_select_involved"
  ON public.plan_invitees FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_invitees.plan_id AND p.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = plan_invitees.plan_id AND pi.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_invitees_insert_creator"
  ON public.plan_invitees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "plan_invitees_delete_creator"
  ON public.plan_invitees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_id AND p.creator_id = auth.uid()
    )
  );

-- Web responders (no auth) can read their own invitee row using response_token
CREATE POLICY "plan_invitees_select_by_token"
  ON public.plan_invitees FOR SELECT
  USING (response_token = public.get_response_token());

-- ─── Availability ─────────────────────────────────────────────

-- Plan members can see all availability for their plans
CREATE POLICY "availability_select_plan_members"
  ON public.availability FOR SELECT
  USING (
    -- Authenticated user who is part of the plan
    (auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.plan_invitees pi
        WHERE pi.plan_id = availability.plan_id AND pi.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.plans p
        WHERE p.id = availability.plan_id AND p.creator_id = auth.uid()
      )
    ))
    -- OR web responder matching the response_token
    OR response_token = public.get_response_token()
  );

-- Authenticated users can insert their own availability
CREATE POLICY "availability_insert_own"
  ON public.availability FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND response_token IS NULL)
    OR (response_token = public.get_response_token() AND user_id IS NULL)
  );

-- Authenticated users can update their own availability
CREATE POLICY "availability_update_own"
  ON public.availability FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR response_token = public.get_response_token()
  );

CREATE POLICY "availability_delete_own"
  ON public.availability FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR response_token = public.get_response_token()
  );

-- ─── Commitments ──────────────────────────────────────────────

-- Plan members can see commitments for their plans
CREATE POLICY "commitments_select_plan_members"
  ON public.commitments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = commitments.plan_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = commitments.plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "commitments_insert_own"
  ON public.commitments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "commitments_update_own"
  ON public.commitments FOR UPDATE
  USING (user_id = auth.uid());

-- ─── Suggestions ──────────────────────────────────────────────

CREATE POLICY "suggestions_select_plan_members"
  ON public.suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = suggestions.plan_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = suggestions.plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "suggestions_insert_plan_members"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    (created_by = auth.uid() OR (ai_generated = TRUE AND auth.uid() IS NOT NULL))
    AND (
      EXISTS (
        SELECT 1 FROM public.plan_invitees pi
        WHERE pi.plan_id = plan_id AND pi.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.plans p
        WHERE p.id = plan_id AND p.creator_id = auth.uid()
      )
    )
  );

-- ─── Suggestion Votes ─────────────────────────────────────────

CREATE POLICY "suggestion_votes_select"
  ON public.suggestion_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.suggestions s
      JOIN public.plan_invitees pi ON pi.plan_id = s.plan_id
      WHERE s.id = suggestion_votes.suggestion_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.suggestions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.id = suggestion_votes.suggestion_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "suggestion_votes_insert_own"
  ON public.suggestion_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "suggestion_votes_delete_own"
  ON public.suggestion_votes FOR DELETE
  USING (user_id = auth.uid());

-- ─── Trips ───────────────────────────────────────────────────

CREATE POLICY "trips_select_plan_members"
  ON public.trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = trips.plan_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = trips.plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "trips_insert_creator"
  ON public.trips FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "trips_update_creator"
  ON public.trips FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = trips.plan_id AND p.creator_id = auth.uid()
    )
  );

-- ─── Itinerary Items ──────────────────────────────────────────

CREATE POLICY "itinerary_items_select_plan_members"
  ON public.itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plan_invitees pi ON pi.plan_id = t.plan_id
      WHERE t.id = itinerary_items.trip_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plans p ON p.id = t.plan_id
      WHERE t.id = itinerary_items.trip_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "itinerary_items_insert_plan_members"
  ON public.itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plan_invitees pi ON pi.plan_id = t.plan_id
      WHERE t.id = trip_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plans p ON p.id = t.plan_id
      WHERE t.id = trip_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "itinerary_items_update_plan_members"
  ON public.itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plan_invitees pi ON pi.plan_id = t.plan_id
      WHERE t.id = itinerary_items.trip_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plans p ON p.id = t.plan_id
      WHERE t.id = itinerary_items.trip_id AND p.creator_id = auth.uid()
    )
  );

-- ─── Trip Payments ────────────────────────────────────────────

CREATE POLICY "trip_payments_select_plan_members"
  ON public.trip_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plan_invitees pi ON pi.plan_id = t.plan_id
      WHERE t.id = trip_payments.trip_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plans p ON p.id = t.plan_id
      WHERE t.id = trip_payments.trip_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "trip_payments_insert_plan_members"
  ON public.trip_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plan_invitees pi ON pi.plan_id = t.plan_id
      WHERE t.id = trip_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.plans p ON p.id = t.plan_id
      WHERE t.id = trip_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "trip_payments_update_own"
  ON public.trip_payments FOR UPDATE
  USING (user_id = auth.uid());

-- ─── Messages ─────────────────────────────────────────────────

CREATE POLICY "messages_select_plan_members"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_invitees pi
      WHERE pi.plan_id = messages.plan_id AND pi.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = messages.plan_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_plan_members"
  ON public.messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.plan_invitees pi
        WHERE pi.plan_id = plan_id AND pi.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.plans p
        WHERE p.id = plan_id AND p.creator_id = auth.uid()
      )
    )
  );

-- Users can delete their own messages
CREATE POLICY "messages_delete_own"
  ON public.messages FOR DELETE
  USING (user_id = auth.uid());

-- ─── Subscriptions ────────────────────────────────────────────

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Subscriptions are managed by Edge Functions (service role), not users directly
-- But allow insert/update from authenticated user for client-side RevenueCat webhook fallback
CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions FOR UPDATE
  USING (user_id = auth.uid());

-- ─── Entitlements ─────────────────────────────────────────────

CREATE POLICY "entitlements_select_own"
  ON public.entitlements FOR SELECT
  USING (user_id = auth.uid());

-- Entitlements are granted by Edge Functions via service role; direct insert restricted
CREATE POLICY "entitlements_insert_service_role"
  ON public.entitlements FOR INSERT
  WITH CHECK (FALSE); -- Only service role can grant (bypasses RLS)

-- ─── Notification Logs ────────────────────────────────────────

CREATE POLICY "notification_logs_select_own"
  ON public.notification_logs FOR SELECT
  USING (user_id = auth.uid());

-- Only Edge Functions (service role) write notification logs
CREATE POLICY "notification_logs_insert_deny"
  ON public.notification_logs FOR INSERT
  WITH CHECK (FALSE);

-- ─── AI Suggestion Cache ──────────────────────────────────────

-- Cache is read by Edge Functions (service role); no direct user access
CREATE POLICY "ai_cache_deny_all"
  ON public.ai_suggestion_cache FOR ALL
  USING (FALSE);

-- ─── Grant service_role bypass (already default in Supabase) ──
-- Service role bypasses RLS by default, so Edge Functions using the service key
-- can read/write anything without these policies blocking them.
