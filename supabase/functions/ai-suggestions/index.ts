// ============================================================
// Huddle — ai-suggestions Edge Function
// Supabase Deno runtime
// ============================================================
// Calls Claude (claude-sonnet-4-6) to generate 3 activity
// suggestions for a group, optimized for consensus.
// Results are cached in Postgres for 24 hours.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface ActivitySuggestion {
  name: string;
  why_it_fits: string;
  rough_cost: string;
  distance_description: string;
  booking_url: string | null;
}

interface SuggestionsRequest {
  plan_id: string;
  group_size: number;
  location: string;
  vibe: string[];
  budget: string;
  time_of_day: string;
  rejected_activities?: string[];
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
    // Expired — delete and return null
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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Strip any accidental markdown code fences
  const rawText = content.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  let suggestions: ActivitySuggestion[];
  try {
    suggestions = JSON.parse(rawText);
  } catch (e) {
    console.error('Failed to parse Claude response:', content.text);
    throw new Error('Invalid JSON response from Claude');
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error('Claude returned empty suggestions array');
  }

  return suggestions.slice(0, 3);
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

  // Delete existing AI suggestions for this plan before inserting new ones
  await supabase
    .from('suggestions')
    .delete()
    .eq('plan_id', planId)
    .eq('ai_generated', true)
    .eq('kind', 'activity');

  await supabase.from('suggestions').insert(rows);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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

  // Verify the plan exists
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id')
    .eq('id', body.plan_id)
    .single();

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cacheKey = buildCacheKey(body);

    // Try cache first
    let suggestions = await getCachedSuggestions(cacheKey);
    let cached = true;

    if (!suggestions) {
      cached = false;
      suggestions = await generateSuggestions(body);
      await cacheSuggestions(cacheKey, suggestions);
    }

    // Always store in plan's suggestions table (so group can vote)
    await storeSuggestionsInPlan(body.plan_id, suggestions);

    return new Response(
      JSON.stringify({ suggestions, cached }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('ai-suggestions error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
