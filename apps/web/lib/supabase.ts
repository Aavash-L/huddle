/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient<any> | undefined;

function getClient(): SupabaseClient<any> {
  if (!_client) {
    _client = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Lazy proxy — real client is created on first property access (request time),
// never at module import time, so the build never throws on missing env vars.
export const supabase = new Proxy({} as SupabaseClient<any>, {
  get(_, prop: string | symbol): any {
    const client = getClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
}) as SupabaseClient<any>;

export function createTokenClient(responseToken: string): SupabaseClient<any> {
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { 'x-response-token': responseToken },
      },
    }
  );
}

export interface PlanInviteeRow {
  plan_id: string;
  user_id: string | null;
  phone: string | null;
  invited_at: string;
}

export interface PlanRow {
  id: string;
  title: string;
  type: string | null;
  theme: string | null;
  status: string;
  locked_datetime: string | null;
  location: string | null;
  activity: string | null;
  quorum_n: number;
  creator: { id: string; name: string; avatar_url: string | null }[];
  plan_invitees: { user_id: string | null; phone: string | null }[];
  commitments: { user_id: string | null; status: string }[];
  availability: { user_id: string | null; response_token: string | null; time_window: any; available: boolean }[];
}

export async function resolveResponseToken(token: string): Promise<PlanInviteeRow | null> {
  const { data, error } = await supabase
    .from('plan_invitees')
    .select('plan_id, user_id, phone, invited_at')
    .eq('response_token', token)
    .single();

  if (error || !data) return null;
  return data as PlanInviteeRow;
}

export async function fetchPlanForToken(planId: string, token: string): Promise<PlanRow | null> {
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
  return data as PlanRow;
}
