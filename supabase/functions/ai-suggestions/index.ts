// ============================================================
// Huddle — ai-suggestions Edge Function
// Supabase Deno runtime
// ============================================================
// Calls Claude (claude-sonnet-4-6) to generate 3 activity
// suggestions for a group, optimized for consensus.
// Results are cached in Postgres for 24 hours.
//
// Security: verifies JWT, checks server-side entitlement,
// enforces per-user daily usage cap.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// Free tier: 3 AI suggestion calls per day per user
const FREE_DAILY_AI_CALLS = 3;
// Pro tier: unlimited (we still cap at 50/day to prevent runaway)
const PRO_DAILY_AI_CALLS = 50;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface ActivitySuggestion {
  name: string;
  why_it_fits: string;
  rough_cost: string;
  distance_description: string;
  booking_url: string | null;
}

const ACTIVITY_SUGGESTION_SCHEMA = {
  required: ['name', 'why_it_fits', 'rough_cost', 'distance_description'],
  types: {
    name: 'string',
    why_it_fits: 'string',
    rough_cost: 'string',
    distance_description: 'string',
  },
};

interface SuggestionsRequest {
  plan_id: string;
  group_size: number;
  location: string;
  vibe: string[];
  budget: string;
  time_of_day: string;
  rejected_activities?: string[];
}

// ─── Server-side entitlement check ───────────────────────────

async function getUserEntitlement(userId: string): Promise<{
  isPro: boolean;
  hasTripPass: boolean;
}> {
  const { data } = await supabase
    .from('entitlements')
    .select('feature, expires_at')
    .eq('user_id', userId)
    .in('feature', ['unlimited_huddles', 'ai_suggestions', 'trip_mode']);

  const now = new Date().toISOString();
  const active = (data ?? []).filter(
    (e: any) => !e.expires_at || e.expires_at > now
  );

  const isPro = active.some((e: any) =>
    ['unlimited_huddles', 'ai_suggestions'].includes(e.feature)
  );

  return { isPro, hasTripPass: isPro };
}

// ─── Per-user daily usage cap ─────────────────────────────────

async function checkAndIncrementUsage(
  userId: string,
  isPro: boolean
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = isPro ? PRO_DAILY_AI_CALLS : FREE_DAILY_AI_CALLS;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Count today's AI suggestion calls for this user
  const { count } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event', 'ai_suggestion_used')
    .gte('sent_at', todayStart.toISOString());

  const used = count ?? 0;
  if (used >= limit) {
    return { allowed: false, used, limit };
  }

  // Log this usage
  await supabase.from('notification_logs').insert({
    user_id: userId,
    event: 'ai_suggestion_used',
  });

  return { allowed: true, used: used + 1, limit };
}

function buildCacheKey(req: SuggestionsRequest): string {
  const vibeStr = [...req.vibe].sort().join(',');
  const rejectedStr = (req.rejected_activities ?? []).sort().join(',');
  return `suggestions:${req.location}:${req.group_size}:${req.budget}:${req.time_of_day}:${vibeStr}:${rejectedStr}`;
}

async function getCachedSuggestions(cacheKey: string): Promise<ActivitySuggestion[] | null> {
  const { data } = await supabase
    .from('ai_suggestion_cache')
    .select('suggestions, expires_at')
    .eq('cache_key', cacheKey)
    .single();

  if (!data) return null;

  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  if (now > expiresAt) {
    await supabase.from('ai_suggestion_cache').delete().eq('cache_key', cacheKey);
    return null;
  }

  return data.suggestions as ActivitySuggestion[];
}

async function cacheSuggestions(cacheKey: string, suggestions: ActivitySuggestion[]): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from('ai_suggestion_cache').upsert({
    cache_key: cacheKey,
    suggestions,
    expires_at: expiresAt.toISOString(),
  });
}

// ─── Schema validation ────────────────────────────────────────

function validateSuggestion(item: unknown): item is ActivitySuggestion {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  for (const [key, type] of Object.entries(ACTIVITY_SUGGESTION_SCHEMA.types)) {
    if (typeof s[key] !== type) return false;
    if (type === 'string' && (s[key] as string).trim() === '') return false;
  }
  return true;
}

function repairSuggestions(raw: unknown[]): ActivitySuggestion[] {
  return raw
    .filter(validateSuggestion)
    .map((s) => ({
      name: s.name.slice(0, 80),
      why_it_fits: s.why_it_fits.slice(0, 200),
      rough_cost: s.rough_cost.slice(0, 40),
      distance_description: s.distance_description.slice(0, 100),
      booking_url: typeof s.booking_url === 'string' ? s.booking_url : null,
    }));
}

async function generateSuggestions(req: SuggestionsRequest): Promise<ActivitySuggestion[]> {
  const vibeText = req.vibe.length > 0 ? req.vibe.join(', ') : 'casual and fun';
  const rejectedText =
    req.rejected_activities && req.rejected_activities.length > 0
      ? `Past picks this group rejected: ${req.rejected_activities.join(', ')}.`
      : 'No previous rejections.';

  const prompt = `You are Huddle's group-activity planner. Suggest 3 activities for a group of ${req.group_size} people in ${req.location}. Vibe: ${vibeText}. Budget: ${req.budget}. Time: ${req.time_of_day}. ${rejectedText} Optimize for CONSENSUS — something everyone will say yes to, not just the single best option. Think about variety: offer different types of activities so the group has real choices.

Return ONLY a JSON array with exactly 3 items. No markdown, no explanation, just the JSON:
[
  {
    "name": "Activity name",
    "why_it_fits": "Why this works for this specific group (1-2 sentences, mention the vibe and group size)",
    "rough_cost": "e.g. $15-20/person or Free",
    "distance_description": "e.g. 10 min from downtown, walkable from most spots",
    "booking_url": "https://... or null if no booking needed"
  }
]`;

  // Try up to 2 times to get valid JSON
  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') continue;

    // Strip accidental markdown code fences
    const rawText = content.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error(`Attempt ${attempt + 1}: Failed to parse JSON:`, rawText.slice(0, 200));
      continue;
    }

    if (!Array.isArray(parsed)) {
      console.error(`Attempt ${attempt + 1}: Response is not an array`);
      continue;
    }

    const valid = repairSuggestions(parsed);
    if (valid.length >= 1) {
      // Pad to 3 if needed (shouldn't happen, but defensive)
      return valid.slice(0, 3);
    }

    console.error(`Attempt ${attempt + 1}: No valid suggestions after repair`);
  }

  // Graceful fallback: return a generic set so the UI doesn't break
  return [
    {
      name: 'Have a casual hangout',
      why_it_fits: 'Sometimes the best plan is just being together without overthinking it.',
      rough_cost: 'Free',
      distance_description: 'Wherever feels right',
      booking_url: null,
    },
  ];
}

async function storeSuggestionsInPlan(
  planId: string,
  suggestions: ActivitySuggestion[]
): Promise<void> {
  const rows = suggestions.map((s) => ({
    plan_id: planId,
    kind: 'activity',
    payload: s,
    ai_generated: true,
    votes: 0,
  }));

  await supabase
    .from('suggestions')
    .delete()
    .eq('plan_id', planId)
    .eq('ai_generated', true)
    .eq('kind', 'activity');

  await supabase.from('suggestions').insert(rows);
}

// ─── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth: extract user from JWT ─────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: SuggestionsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.plan_id || !body.location || !body.group_size) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: plan_id, location, group_size' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ─── Server-side entitlement check ───────────────────────────
  const { isPro } = await getUserEntitlement(user.id);

  // ─── Per-user daily cap ───────────────────────────────────────
  const usageCheck = await checkAndIncrementUsage(user.id, isPro);
  if (!usageCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Daily AI suggestion limit reached',
        used: usageCheck.used,
        limit: usageCheck.limit,
        upgrade_required: !isPro,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify the plan exists and user is a member
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, creator_id')
    .eq('id', body.plan_id)
    .single();

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check user belongs to this plan
  const { count: memberCount } = await supabase
    .from('plan_invitees')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', body.plan_id)
    .eq('user_id', user.id);

  const isCreator = plan.creator_id === user.id;
  if (!isCreator && (memberCount ?? 0) === 0) {
    return new Response(JSON.stringify({ error: 'Not a member of this plan' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cacheKey = buildCacheKey(body);

    // Try cache first (cached responses don't consume daily cap)
    let suggestions = await getCachedSuggestions(cacheKey);
    let cached = true;

    if (!suggestions) {
      cached = false;
      suggestions = await generateSuggestions(body);
      await cacheSuggestions(cacheKey, suggestions);
    }

    await storeSuggestionsInPlan(body.plan_id, suggestions);

    return new Response(
      JSON.stringify({
        suggestions,
        cached,
        usage: { used: usageCheck.used, limit: usageCheck.limit, is_pro: isPro },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ai-suggestions error:', err);
    // Graceful fallback — don't crash the UI
    return new Response(
      JSON.stringify({
        error: 'AI suggestions temporarily unavailable',
        fallback: true,
        suggestions: [],
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
