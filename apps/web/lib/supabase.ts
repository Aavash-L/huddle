import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Standard client for server components and API routes
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Client factory for use with response_token (no-account web flow)
// The response_token is passed as a custom header so RLS policies can identify the web responder
export function createTokenClient(responseToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'x-response-token': responseToken,
      },
    },
  });
}

// Resolve a response_token to its plan_invitee row
export async function resolveResponseToken(token: string) {
  const { data, error } = await supabase
    .from('plan_invitees')
    .select('plan_id, user_id, phone, invited_at')
    .eq('response_token', token)
    .single();

  if (error || !data) return null;
  return data;
}

// Fetch plan data viewable by a response_token holder
export async function fetchPlanForToken(planId: string, token: string) {
  const client = createTokenClient(token);

  const { data, error } = await client
    .from('plans')
    .select(`
      id,
      title,
      type,
      theme,
      status,
      locked_datetime,
      location,
      activity,
      quorum_n,
      creator:users!creator_id(id, name, avatar_url),
      plan_invitees(user_id, phone),
      commitments(user_id, status),
      availability(user_id, response_token, time_window, available)
    `)
    .eq('id', planId)
    .single();

  if (error) return null;
  return data;
}
