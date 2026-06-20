// ============================================================
// Huddle — Shared Constants
// ============================================================

import type { PlanStatus, PlanType, CommitmentStatus, CrewTheme, FeatureKey } from './types';

// ─── Plan Statuses ───────────────────────────────────────────
export const PLAN_STATUSES: Record<PlanStatus, { label: string; emoji: string; description: string }> = {
  gathering: {
    label: 'Gathering',
    emoji: '🤔',
    description: 'Collecting availability from the group',
  },
  converging: {
    label: 'Converging',
    emoji: '⚡',
    description: 'Best time found, ready to lock in',
  },
  locked: {
    label: 'Locked',
    emoji: '🔒',
    description: "It's happening. Time and place confirmed.",
  },
  happened: {
    label: 'Happened',
    emoji: '✅',
    description: 'This one actually happened!',
  },
  cancelled: {
    label: 'Cancelled',
    emoji: '❌',
    description: 'Plans changed.',
  },
};

// ─── Plan Types ──────────────────────────────────────────────
export const PLAN_TYPES: Record<PlanType, { label: string; emoji: string }> = {
  hangout: { label: 'Hangout', emoji: '🛋️' },
  dinner: { label: 'Dinner', emoji: '🍽️' },
  activity: { label: 'Activity', emoji: '🎯' },
  trip: { label: 'Trip', emoji: '✈️' },
  party: { label: 'Party', emoji: '🎉' },
  other: { label: 'Other', emoji: '📅' },
};

// ─── Commitment Statuses ─────────────────────────────────────
export const COMMITMENT_STATUSES: Record<CommitmentStatus, { label: string; emoji: string; color: string }> = {
  in: {
    label: "I'm in",
    emoji: '✅',
    color: '#22C55E', // green-500
  },
  wavering: {
    label: 'Maybe',
    emoji: '🤔',
    color: '#EAB308', // yellow-500
  },
  out: {
    label: "Can't make it",
    emoji: '❌',
    color: '#EF4444', // red-500
  },
};

// ─── Bail Reasons ─────────────────────────────────────────────
export const BAIL_REASONS = [
  { id: 'work', label: 'Work came up', emoji: '💼' },
  { id: 'sick', label: "Not feeling well", emoji: '🤒' },
  { id: 'family', label: 'Family thing', emoji: '👨‍👩‍👧' },
  { id: 'money', label: 'Money is tight', emoji: '💸' },
  { id: 'tired', label: 'Just exhausted', emoji: '😴' },
  { id: 'transport', label: "Can't get there", emoji: '🚗' },
  { id: 'other', label: 'Something else', emoji: '🙈' },
] as const;

// ─── Themes ──────────────────────────────────────────────────
export const THEMES: Record<CrewTheme, {
  label: string;
  emoji: string;
  gradient: [string, string] | [string, string, string];
  textColor: string;
}> = {
  sunset: {
    label: 'Sunset',
    emoji: '🌅',
    gradient: ['#FF6B6B', '#FFE66D'],
    textColor: '#1a1a1a',
  },
  ocean: {
    label: 'Ocean',
    emoji: '🌊',
    gradient: ['#667EEA', '#764BA2'],
    textColor: '#ffffff',
  },
  neon: {
    label: 'Neon',
    emoji: '⚡',
    gradient: ['#11998E', '#38EF7D'],
    textColor: '#1a1a1a',
  },
  forest: {
    label: 'Forest',
    emoji: '🌲',
    gradient: ['#134E5E', '#71B280'],
    textColor: '#ffffff',
  },
  candy: {
    label: 'Candy',
    emoji: '🍭',
    gradient: ['#F857A6', '#FF5858'],
    textColor: '#ffffff',
  },
  midnight: {
    label: 'Midnight',
    emoji: '🌙',
    gradient: ['#0F2027', '#203A43', '#2C5364'],
    textColor: '#ffffff',
  },
};

// ─── Vibe Chips ──────────────────────────────────────────────
export const VIBE_CHIPS = [
  { id: 'chill', label: 'Chill', emoji: '😌' },
  { id: 'fancy', label: 'Fancy', emoji: '🥂' },
  { id: 'cheap', label: 'Cheap', emoji: '💸' },
  { id: 'active', label: 'Active', emoji: '🏃' },
  { id: 'drinks', label: 'Drinks', emoji: '🍺' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌿' },
  { id: 'new_spot', label: 'New Spot', emoji: '🗺️' },
] as const;

export type VibeChipId = (typeof VIBE_CHIPS)[number]['id'];

// ─── Time Slots ──────────────────────────────────────────────
export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', emoji: '🌅', range: '8am–12pm' },
  { id: 'afternoon', label: 'Afternoon', emoji: '☀️', range: '12pm–5pm' },
  { id: 'evening', label: 'Evening', emoji: '🌆', range: '5pm–10pm' },
  { id: 'late_night', label: 'Late Night', emoji: '🌙', range: '10pm+' },
] as const;

export type TimeSlotId = (typeof TIME_SLOTS)[number]['id'];

// ─── Notification Copy ───────────────────────────────────────
// These strings MUST match exactly per the product brief.
export const NOTIFICATION_COPY = {
  stall_nudge: (freeCount: number, day: string) =>
    `${freeCount} of you are free ${day} 👀 lock it in before this becomes another dead group-chat plan?`,

  convergence: (day: string, time: string) =>
    `Found it — ${day} ${time} works for everyone. Lock it? 🔒`,

  locked: (day: string, time: string, place: string, count: number) =>
    `🔒 It's REAL. ${day} ${time}, ${place}. ${count} people are in.`,

  t_minus_3_days: (place: string, time: string, organizer: string, othersCount: number) =>
    `3 days! ${place} at ${time} with ${organizer} + ${othersCount} others. Still in?`,

  night_before: (names: string, othersCount: number) =>
    `Tomorrow! ${names} + ${othersCount} others are counting on you 🤝`,

  day_of: (place: string, time: string) =>
    `Tonight's the night 🎉 ${place} at ${time}. Don't be the one who bails 👀 (kidding… unless?)`,

  bail_received: (name: string, remainingCount: number) =>
    `Heads up — ${name} can't make it. Still on for the other ${remainingCount}?`,

  quorum_reached: (count: number, quorum: number) =>
    `${count}/${quorum} people are in 🔥 Ready to make it official?`,

  reminder_title: 'Huddle',
  locked_title: '🔒 Locked In',
  bail_title: 'Heads Up',
} as const;

// ─── Pro Features ─────────────────────────────────────────────
export const PRO_FEATURES: Record<FeatureKey, { label: string; description: string; emoji: string }> = {
  unlimited_huddles: {
    label: 'Unlimited Huddles',
    description: 'Create as many plans as you want',
    emoji: '♾️',
  },
  trip_mode: {
    label: 'Trip Mode',
    description: 'Multi-day itinerary planning + cost splitting',
    emoji: '✈️',
  },
  ai_suggestions: {
    label: 'AI Activity Suggestions',
    description: 'Claude picks activities your whole group will love',
    emoji: '🤖',
  },
  priority_reminders: {
    label: 'Priority Reminders',
    description: 'Smart nudges that actually get people to show up',
    emoji: '🔔',
  },
  trip_pass: {
    label: 'Trip Pass',
    description: 'One-time access to Trip Mode for a single trip',
    emoji: '🎫',
  },
};

// ─── Subscription Pricing ─────────────────────────────────────
export const PRICING = {
  pro_monthly: {
    price: 7.99,
    currency: 'USD',
    label: '$7.99/month',
    revenuecat_id: 'pro_monthly',
  },
  pro_annual: {
    price: 49.99,
    currency: 'USD',
    label: '$49.99/year',
    per_month: 4.17,
    savings_percent: 48,
    revenuecat_id: 'pro_annual',
  },
  trip_pass: {
    price: 4.99,
    currency: 'USD',
    label: '$4.99 one-time',
    revenuecat_id: 'trip_pass',
  },
  trial_days: 7,
} as const;

// ─── Free Tier Limits ─────────────────────────────────────────
export const FREE_TIER = {
  max_huddles_per_month: 3,
  max_invitees_per_plan: 10,
} as const;

// ─── Analytics Events ─────────────────────────────────────────
export const ANALYTICS_EVENTS = {
  // Plan lifecycle
  PLAN_CREATED: 'plan_created',
  AVAILABILITY_SUBMITTED: 'availability_submitted',
  PLAN_LOCKED: 'plan_locked',
  PLAN_HAPPENED: 'plan_happened',
  BAIL_SUBMITTED: 'bail_submitted',

  // AI
  AI_SUGGESTION_REQUESTED: 'ai_suggestion_requested',
  AI_SUGGESTION_SELECTED: 'ai_suggestion_selected',

  // Trip
  TRIP_CREATED: 'trip_created',
  TRIP_ITINERARY_GENERATED: 'trip_itinerary_generated',

  // Monetization
  PAYWALL_SHOWN: 'paywall_shown',
  TRIAL_STARTED: 'trial_started',
  SUBSCRIPTION_PURCHASED: 'subscription_purchased',
  TRIP_PASS_PURCHASED: 'trip_pass_purchased',

  // Auth
  PHONE_ENTERED: 'phone_entered',
  OTP_VERIFIED: 'otp_verified',
  PROFILE_CREATED: 'profile_created',

  // Engagement
  CREW_CREATED: 'crew_created',
  CONTACTS_IMPORTED: 'contacts_imported',
  WEB_RSVP_COMPLETED: 'web_rsvp_completed',
  APP_DOWNLOAD_PROMPTED: 'app_download_prompted',
} as const;

// ─── App Config ───────────────────────────────────────────────
export const APP_CONFIG = {
  name: 'Huddle',
  tagline: 'Plans go to die in the group chat. Huddle is where they actually happen.',
  support_email: 'support@huddle.app',
  app_store_url: 'https://apps.apple.com/app/huddle/id0000000000',
  play_store_url: 'https://play.google.com/store/apps/details?id=app.huddle',
  website_url: 'https://huddle.app',
  default_quorum: 3,
  max_plan_title_length: 60,
  max_message_length: 500,
  max_bail_reason_length: 200,
} as const;
