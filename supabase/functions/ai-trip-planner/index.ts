// ============================================================
// Huddle — ai-trip-planner Edge Function
// Supabase Deno runtime
// ============================================================
// Calls Claude (claude-sonnet-4-6) with extended thinking to
// generate a detailed multi-day trip itinerary as structured JSON.
// Stores results in itinerary_items table.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface ItineraryItemPayload {
  time: string;
  title: string;
  description: string;
  type: 'stay' | 'activity' | 'food' | 'transport';
  estimated_cost: number;
  notes: string | null;
}

interface DayItinerary {
  day: number;
  date: string;
  items: ItineraryItemPayload[];
}

interface TripPlannerRequest {
  trip_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_per_person: number;
  group_size: number;
  vibe: string | null;
  musts: string | null;
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function generateItinerary(req: TripPlannerRequest): Promise<DayItinerary[]> {
  const days = calculateDays(req.start_date, req.end_date);
  const vibeText = req.vibe ?? 'balanced mix of relaxation and exploration';
  const mustsText = req.musts ? `Must-dos/must-sees: ${req.musts}.` : '';

  const prompt = `You are Huddle's group trip planner. Create a detailed ${days}-day itinerary for ${req.group_size} people going to ${req.destination}. Budget: $${req.budget_per_person}/person total for the trip. Vibe: ${vibeText}. ${mustsText}

Trip dates: ${req.start_date} to ${req.end_date}.

Important guidelines:
- Be specific and realistic — use actual place names, neighborhoods, and local gems
- Balance the budget across accommodation, food, activities, and transport
- Group activities by logical proximity to minimize travel time
- Include at least one meal per day plus breakfast suggestions
- Account for travel/transport between locations
- Day 1 should include arrival and check-in; last day should include check-out and departure
- Mix popular highlights with authentic local experiences
- For a group of ${req.group_size}, consider logistics and group dynamics

Return ONLY a JSON array. No markdown, no explanation, just valid JSON:
[
  {
    "day": 1,
    "date": "${req.start_date}",
    "items": [
      {
        "time": "2:00 PM",
        "title": "Item title",
        "description": "Detailed description with specific names and why it's great for the group",
        "type": "stay",
        "estimated_cost": 85,
        "notes": "Optional tips or booking advice, or null"
      }
    ]
  }
]

Types: "stay" (accommodation), "activity" (sightseeing, tours, experiences), "food" (restaurants, cafes, markets), "transport" (flights, trains, rideshares).
estimated_cost is in USD per person.`;

  // Use extended thinking for complex multi-day planning
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 10000,
    },
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  } as Parameters<typeof anthropic.messages.create>[0]);

  // Find the text content block (skip thinking blocks)
  const textBlock = message.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const rawText = textBlock.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  let itinerary: DayItinerary[];
  try {
    itinerary = JSON.parse(rawText);
  } catch (e) {
    console.error('Failed to parse Claude trip response:', textBlock.text.substring(0, 500));
    throw new Error('Invalid JSON response from Claude trip planner');
  }

  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    throw new Error('Claude returned empty itinerary');
  }

  // Ensure dates are correct
  return itinerary.map((day, index) => ({
    ...day,
    day: index + 1,
    date: addDays(req.start_date, index),
    items: day.items ?? [],
  }));
}

async function storeItinerary(tripId: string, itinerary: DayItinerary[]): Promise<void> {
  // Clear existing AI-generated itinerary items
  await supabase.from('itinerary_items').delete().eq('trip_id', tripId);

  const rows: Array<{
    trip_id: string;
    day: number;
    payload: ItineraryItemPayload;
    status: string;
    added_by: null;
  }> = [];

  for (const day of itinerary) {
    for (const item of day.items) {
      rows.push({
        trip_id: tripId,
        day: day.day,
        payload: item,
        status: 'proposed',
        added_by: null,
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('itinerary_items').insert(rows);
    if (error) {
      console.error('Error storing itinerary:', error);
      throw new Error(`Failed to store itinerary: ${error.message}`);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth: extract and verify JWT ────────────────────────────
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

  // ─── Server-side entitlement check (Trip Mode = Pro or Trip Pass) ─
  const now = new Date().toISOString();
  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('feature, expires_at')
    .eq('user_id', user.id)
    .in('feature', ['trip_mode', 'trip_pass', 'unlimited_huddles', 'ai_suggestions']);

  const hasAccess = (entitlements ?? []).some((e: any) => {
    const notExpired = !e.expires_at || e.expires_at > now;
    return notExpired && ['trip_mode', 'trip_pass', 'unlimited_huddles'].includes(e.feature);
  });

  if (!hasAccess) {
    return new Response(
      JSON.stringify({
        error: 'Trip Mode requires Huddle Pro or a Trip Pass',
        upgrade_required: true,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: TripPlannerRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const required = ['trip_id', 'destination', 'start_date', 'end_date', 'budget_per_person', 'group_size'];
  const missing = required.filter((k) => !(body as any)[k]);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify trip exists and user is the plan creator
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, plan_id, plans!inner(creator_id)')
    .eq('id', body.trip_id)
    .single();

  if (tripError || !trip) {
    return new Response(JSON.stringify({ error: 'Trip not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify user belongs to the plan
  const { count: memberCount } = await supabase
    .from('plan_invitees')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', trip.plan_id)
    .eq('user_id', user.id);

  const tripPlan = (trip as any).plans;
  const isCreator = tripPlan?.creator_id === user.id;
  if (!isCreator && (memberCount ?? 0) === 0) {
    return new Response(JSON.stringify({ error: 'Not a member of this trip' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const days = calculateDays(body.start_date, body.end_date);
  if (days < 1 || days > 14) {
    return new Response(
      JSON.stringify({ error: 'Trip duration must be 1-14 days' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log(`Generating ${days}-day itinerary for ${body.destination}...`);
    const itinerary = await generateItinerary(body);
    await storeItinerary(body.trip_id, itinerary);

    return new Response(
      JSON.stringify({
        days: itinerary,
        total_days: days,
        destination: body.destination,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('ai-trip-planner error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
