// ============================================================
// Huddle — convergence Edge Function
// Supabase Deno runtime
// ============================================================
// Given a plan_id, finds the max-overlap time window from the
// availability table. Returns best + runner-up slots plus who'd
// miss each. Triggers stall nudge if 3+ responded but no lock.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TimeWindow {
  date: string;
  slot: string;
}

interface SlotData {
  time_window: TimeWindow;
  available_user_ids: string[];
  available_tokens: string[];
  total_available: number;
}

interface ConvergenceResult {
  best_slot: SlotData | null;
  runner_up: SlotData | null;
  would_miss_best: string[];
  would_miss_runner_up: string[] | null;
  total_responded: number;
  total_invited: number;
  stall_detected: boolean;
  response_rate: number;
}

function windowKey(tw: TimeWindow): string {
  return `${tw.date}::${tw.slot}`;
}

async function sendStallNudge(
  creatorId: string,
  planId: string,
  inCount: number,
  bestDay: string
): Promise<void> {
  // Check if already sent
  const { count } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', creatorId)
    .eq('plan_id', planId)
    .eq('event', 'stall_nudge');

  if ((count ?? 0) > 0) return;

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', creatorId)
    .limit(1);

  if (!tokens || tokens.length === 0) return;

  const body = `${inCount} of you are free ${bestDay} 👀 lock it in before this becomes another dead group-chat plan?`;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to: tokens[0].token,
      title: 'Huddle',
      body,
      data: { planId, event: 'stall_nudge' },
      sound: 'default',
      priority: 'high',
    }]),
  });

  await supabase.from('notification_logs').insert({
    user_id: creatorId,
    plan_id: planId,
    event: 'stall_nudge',
  });
}

async function sendConvergenceNotification(
  creatorId: string,
  planId: string,
  bestDay: string,
  bestTime: string
): Promise<void> {
  const { count } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', creatorId)
    .eq('plan_id', planId)
    .eq('event', 'convergence');

  if ((count ?? 0) > 0) return;

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', creatorId)
    .limit(1);

  if (!tokens || tokens.length === 0) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to: tokens[0].token,
      title: 'Huddle',
      body: `Found it — ${bestDay} ${bestTime} works for everyone. Lock it? 🔒`,
      data: { planId, event: 'convergence' },
      sound: 'default',
      priority: 'high',
    }]),
  });

  await supabase.from('notification_logs').insert({
    user_id: creatorId,
    plan_id: planId,
    event: 'convergence',
  });
}

function formatSlotLabel(tw: TimeWindow): string {
  const date = new Date(tw.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const slotLabels: Record<string, string> = {
    morning: '8am–12pm',
    afternoon: '12pm–5pm',
    evening: '5pm–10pm',
    late_night: '10pm+',
  };
  const timeLabel = slotLabels[tw.slot] ?? tw.slot;
  return `${dayName} ${timeLabel}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let planId: string;

  if (req.method === 'GET') {
    const url = new URL(req.url);
    planId = url.searchParams.get('plan_id') ?? '';
  } else {
    const body = await req.json().catch(() => ({}));
    planId = body.plan_id ?? '';
  }

  if (!planId) {
    return new Response(JSON.stringify({ error: 'plan_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch the plan
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, status, creator_id, quorum_n, plan_invitees(user_id, response_token)')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (plan.status === 'locked' || plan.status === 'happened' || plan.status === 'cancelled') {
    return new Response(
      JSON.stringify({ error: `Plan is already ${plan.status}` }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Collect all invitee identifiers
  const invitees = (plan.plan_invitees as any[]) ?? [];
  const allUserIds = invitees.map((i: any) => i.user_id).filter(Boolean) as string[];
  const allTokens = invitees.map((i: any) => i.response_token).filter(Boolean) as string[];
  const totalInvited = invitees.length;

  // Fetch all availability for this plan
  const { data: availabilityRows, error: availError } = await supabase
    .from('availability')
    .select('user_id, response_token, time_window, available')
    .eq('plan_id', planId)
    .eq('available', true);

  if (availError) {
    return new Response(JSON.stringify({ error: 'Failed to fetch availability' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!availabilityRows || availabilityRows.length === 0) {
    return new Response(
      JSON.stringify({
        best_slot: null,
        runner_up: null,
        would_miss_best: [],
        would_miss_runner_up: null,
        total_responded: 0,
        total_invited: totalInvited,
        stall_detected: false,
        response_rate: 0,
      } as ConvergenceResult),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Aggregate availability by time window
  const slotMap = new Map<string, SlotData>();

  for (const row of availabilityRows) {
    const tw = row.time_window as TimeWindow;
    const key = windowKey(tw);

    if (!slotMap.has(key)) {
      slotMap.set(key, {
        time_window: tw,
        available_user_ids: [],
        available_tokens: [],
        total_available: 0,
      });
    }

    const slot = slotMap.get(key)!;
    if (row.user_id) {
      if (!slot.available_user_ids.includes(row.user_id)) {
        slot.available_user_ids.push(row.user_id);
        slot.total_available++;
      }
    } else if (row.response_token) {
      if (!slot.available_tokens.includes(row.response_token)) {
        slot.available_tokens.push(row.response_token);
        slot.total_available++;
      }
    }
  }

  // Sort slots by availability count (descending)
  const sortedSlots = Array.from(slotMap.values()).sort(
    (a, b) => b.total_available - a.total_available
  );

  if (sortedSlots.length === 0) {
    return new Response(
      JSON.stringify({
        best_slot: null,
        runner_up: null,
        would_miss_best: [],
        would_miss_runner_up: null,
        total_responded: 0,
        total_invited: totalInvited,
        stall_detected: false,
        response_rate: 0,
      } as ConvergenceResult),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Calculate who responded at all
  const respondedUserIds = new Set<string>();
  const respondedTokens = new Set<string>();
  for (const row of availabilityRows) {
    if (row.user_id) respondedUserIds.add(row.user_id);
    if (row.response_token) respondedTokens.add(row.response_token);
  }
  const totalResponded = respondedUserIds.size + respondedTokens.size;

  const bestSlot = sortedSlots[0];
  const runnerUp = sortedSlots.length > 1 ? sortedSlots[1] : null;

  // Who'd miss the best slot
  const wouldMissBest = allUserIds.filter(
    (uid) => !bestSlot.available_user_ids.includes(uid)
  );
  const wouldMissRunnerUp = runnerUp
    ? allUserIds.filter((uid) => !runnerUp.available_user_ids.includes(uid))
    : null;

  const responseRate = totalInvited > 0 ? totalResponded / totalInvited : 0;

  // Detect stall: 3+ responded but plan is still in gathering
  const stallDetected =
    totalResponded >= 3 &&
    plan.status === 'gathering' &&
    bestSlot.total_available >= 3;

  // Auto-advance to converging if best slot covers quorum
  if (
    bestSlot.total_available >= (plan.quorum_n ?? 3) &&
    plan.status === 'gathering'
  ) {
    await supabase
      .from('plans')
      .update({ status: 'converging' })
      .eq('id', planId);

    // Notify creator
    const bestLabel = formatSlotLabel(bestSlot.time_window);
    await sendConvergenceNotification(
      plan.creator_id,
      planId,
      bestSlot.time_window.date,
      bestLabel
    );
  } else if (stallDetected) {
    // Send stall nudge to creator
    const bestLabel = formatSlotLabel(bestSlot.time_window);
    await sendStallNudge(
      plan.creator_id,
      planId,
      bestSlot.total_available,
      bestLabel
    );
  }

  const result: ConvergenceResult = {
    best_slot: bestSlot,
    runner_up: runnerUp,
    would_miss_best: wouldMissBest,
    would_miss_runner_up: wouldMissRunnerUp,
    total_responded: totalResponded,
    total_invited: totalInvited,
    stall_detected: stallDetected,
    response_rate: responseRate,
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
