-- plan_invitees was added in migration 005 but never added to the realtime
-- publication, so client-side subscriptions never received events for it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_invitees;
