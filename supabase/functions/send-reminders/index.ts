// ============================================================
// Huddle — send-reminders Edge Function
// Supabase Deno runtime
// ============================================================
// Scheduled via Supabase cron or external trigger.
// Sends loss-framed push notifications at key moments:
//   - On lock (immediate)
//   - T-3 days
//   - Night before
//   - Day-of
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Max notifications per user per plan per event (dedup)
const MAX_NOTIFS_PER_EVENT = 1;
// Max batch size for Expo push API
const EXPO_BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface PlanReminderRow {
  plan_id: string;
  plan_title: string;
  plan_status: string;
  locked_datetime: string | null;
  location: string | null;
  creator_name: string;
  user_id: string;
  user_name: string;
  push_token: string | null;
  commitment_status: string | null;
  in_count: number;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Notification copy (loss-framed, matches constants.ts) ────

function buildStallNudge(freeCount: number, day: string): { title: string; body: string } {
  return {
    title: 'Huddle',
    body: `${freeCount} of you are free ${day} 👀 lock it in before this becomes another dead group-chat plan?`,
  };
}

function buildConvergence(day: string, time: string): { title: string; body: string } {
  return {
    title: 'Huddle',
    body: `Found it — ${day} ${time} works for everyone. Lock it? 🔒`,
  };
}

function buildLocked(day: string, time: string, place: string, count: number): { title: string; body: string } {
  return {
    title: '🔒 Locked In',
    body: `It's REAL. ${day} ${time}, ${place}. ${count} people are in.`,
  };
}

function buildTMinus3(place: string, time: string, organizer: string, othersCount: number): { title: string; body: string } {
  return {
    title: 'Huddle',
    body: `3 days! ${place} at ${time} with ${organizer} + ${othersCount} others. Still in?`,
  };
}

function buildNightBefore(names: string, othersCount: number): { title: string; body: string } {
  return {
    title: 'Huddle',
    body: `Tomorrow! ${names} + ${othersCount} others are counting on you 🤝`,
  };
}

function buildDayOf(place: string, time: string): { title: string; body: string } {
  return {
    title: "Tonight's the night 🎉",
    body: `${place} at ${time}. Don't be the one who bails 👀 (kidding… unless?)`,
  };
}

function buildBailReceived(name: string, remainingCount: number): { title: string; body: string } {
  return {
    title: 'Heads Up',
    body: `${name} can't make it. Still on for the other ${remainingCount}?`,
  };
}

// ─── Dedup check ──────────────────────────────────────────────

async function hasAlreadySentNotification(
  userId: string,
  planId: string,
  event: string
): Promise<boolean> {
  const { count } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('event', event);

  return (count ?? 0) >= MAX_NOTIFS_PER_EVENT;
}

async function logNotification(
  userId: string,
  planId: string,
  event: string,
  ticketId?: string
): Promise<void> {
  await supabase.from('notification_logs').insert({
    user_id: userId,
    plan_id: planId,
    event,
    expo_ticket_id: ticketId ?? null,
  });
}

// ─── Expo push sender ─────────────────────────────────────────

async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    const result = await response.json();
    if (result.data) {
      tickets.push(...result.data);
    }
  }

  return tickets;
}

// ─── Format datetime helpers ──────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isToday(iso: string): boolean {
  const now = new Date();
  const target = new Date(iso);
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

function isTomorrow(iso: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(iso);
  return (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  );
}

// ─── Main reminder engine ─────────────────────────────────────

async function processLockedPlans(): Promise<void> {
  const now = new Date();

  // Fetch all locked plans with upcoming datetimes
  const { data: plans, error } = await supabase
    .from('plans')
    .select(`
      id,
      title,
      status,
      locked_datetime,
      location,
      creator:users!creator_id(name),
      commitments(user_id, status),
      plan_invitees(user_id, phone),
      push_tokens:users!inner(id, name, push_tokens(token, platform))
    `)
    .eq('status', 'locked')
    .gte('locked_datetime', now.toISOString())
    .not('locked_datetime', 'is', null);

  if (error) {
    console.error('Error fetching locked plans:', error);
    return;
  }

  if (!plans || plans.length === 0) {
    console.log('No locked plans to process');
    return;
  }

  const pushMessages: Array<{
    message: ExpoPushMessage;
    userId: string;
    planId: string;
    event: string;
  }> = [];

  for (const plan of plans) {
    if (!plan.locked_datetime) continue;

    const days = daysUntil(plan.locked_datetime);
    const day = formatDate(plan.locked_datetime);
    const time = formatTime(plan.locked_datetime);
    const place = plan.location ?? 'the spot';
    const creatorName = (plan.creator as any)?.name ?? 'your organizer';

    // Get in-count
    const inCount = ((plan.commitments as any[]) ?? []).filter((c: any) => c.status === 'in').length;

    // Get invitee user IDs
    const inviteeUserIds: string[] = ((plan.plan_invitees as any[]) ?? [])
      .map((i: any) => i.user_id)
      .filter(Boolean);

    // Fetch push tokens for invitees
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', inviteeUserIds);

    const userTokenMap: Record<string, string> = {};
    for (const t of tokens ?? []) {
      userTokenMap[t.user_id] = t.token;
    }

    // Fetch user names for night-before copy
    const { data: userNames } = await supabase
      .from('users')
      .select('id, name')
      .in('id', inviteeUserIds.slice(0, 3)); // first 3 names

    const namesList = (userNames ?? [])
      .map((u: any) => u.name.split(' ')[0])
      .join(', ');
    const othersCount = Math.max(0, inviteeUserIds.length - 3);

    for (const userId of inviteeUserIds) {
      const token = userTokenMap[userId];
      if (!token) continue;

      let event: string | null = null;
      let notif: { title: string; body: string } | null = null;

      if (days === 3) {
        event = 't_minus_3_days';
        notif = buildTMinus3(place, time, creatorName, inCount - 1);
      } else if (isTomorrow(plan.locked_datetime)) {
        event = 'night_before';
        notif = buildNightBefore(namesList || creatorName, othersCount);
      } else if (isToday(plan.locked_datetime)) {
        event = 'day_of';
        notif = buildDayOf(place, time);
      }

      if (!event || !notif) continue;

      const alreadySent = await hasAlreadySentNotification(userId, plan.id, event);
      if (alreadySent) continue;

      pushMessages.push({
        message: {
          to: token,
          title: notif.title,
          body: notif.body,
          data: { planId: plan.id, event },
          sound: 'default',
          priority: 'high',
        },
        userId,
        planId: plan.id,
        event,
      });
    }
  }

  // Send in batches
  if (pushMessages.length > 0) {
    const tickets = await sendExpoPushBatch(pushMessages.map((m) => m.message));

    // Log sent notifications
    for (let i = 0; i < pushMessages.length; i++) {
      const { userId, planId, event } = pushMessages[i];
      const ticket = tickets[i];
      const ticketId = ticket?.status === 'ok' ? ticket.id : undefined;
      await logNotification(userId, planId, event, ticketId);
    }

    console.log(`Sent ${pushMessages.length} reminder notifications`);
  } else {
    console.log('No notifications to send');
  }
}

// ─── Stall nudge processor ────────────────────────────────────

async function processStallNudges(): Promise<void> {
  // Find plans in 'gathering' or 'converging' that have 3+ responses but aren't locked
  // and the creator hasn't been nudged recently
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: plans, error } = await supabase
    .from('plans')
    .select(`
      id,
      title,
      status,
      creator_id,
      created_at,
      commitments(user_id, status)
    `)
    .in('status', ['gathering', 'converging'])
    .lt('created_at', threeDaysAgo.toISOString());

  if (error || !plans) return;

  for (const plan of plans) {
    const inCount = ((plan.commitments as any[]) ?? []).filter((c: any) => c.status === 'in').length;

    if (inCount < 3) continue;

    // Check if we already sent a stall nudge
    const alreadySent = await hasAlreadySentNotification(plan.creator_id, plan.id, 'stall_nudge');
    if (alreadySent) continue;

    // Get creator's push token
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', plan.creator_id)
      .limit(1);

    if (!tokens || tokens.length === 0) continue;

    const day = 'soon'; // We don't have a specific day yet
    const notif = buildStallNudge(inCount, day);

    const tickets = await sendExpoPushBatch([{
      to: tokens[0].token,
      title: notif.title,
      body: notif.body,
      data: { planId: plan.id, event: 'stall_nudge' },
      sound: 'default',
      priority: 'high',
    }]);

    const ticketId = tickets[0]?.status === 'ok' ? tickets[0].id : undefined;
    await logNotification(plan.creator_id, plan.id, 'stall_nudge', ticketId);
    console.log(`Sent stall nudge for plan ${plan.id}`);
  }
}

// ─── HTTP handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Allow GET (cron) or POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await Promise.all([
      processLockedPlans(),
      processStallNudges(),
    ]);

    return new Response(JSON.stringify({ ok: true, message: 'Reminders processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-reminders error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
