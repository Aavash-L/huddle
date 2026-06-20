// ============================================================
// Huddle — Shared TypeScript Types
// ============================================================

// ─── Core User ───────────────────────────────────────────────
export interface User {
  id: string;
  phone: string;
  name: string;
  avatar_url: string | null;
  reliability_score: number; // 0-100
  never_bail_streak: number; // consecutive kept commitments
  created_at: string;
}

export type UserPublic = Pick<User, 'id' | 'name' | 'avatar_url' | 'reliability_score' | 'never_bail_streak'>;

// ─── Crews ───────────────────────────────────────────────────
export type CrewTheme = 'sunset' | 'ocean' | 'neon' | 'forest' | 'candy' | 'midnight';

export interface Crew {
  id: string;
  name: string;
  theme: CrewTheme;
  created_by: string;
  created_at: string;
}

export type CrewRole = 'admin' | 'member';

export interface CrewMember {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
}

export interface CrewWithMembers extends Crew {
  members: (CrewMember & { user: UserPublic })[];
}

// ─── Plans ───────────────────────────────────────────────────
export type PlanType = 'hangout' | 'dinner' | 'activity' | 'trip' | 'party' | 'other';
export type PlanStatus = 'gathering' | 'converging' | 'locked' | 'happened' | 'cancelled';

export interface Plan {
  id: string;
  title: string;
  type: PlanType;
  theme: CrewTheme;
  status: PlanStatus;
  creator_id: string;
  crew_id: string | null;
  locked_datetime: string | null; // ISO timestamp when locked
  location: string | null;
  activity: string | null; // final chosen activity
  quorum_n: number; // min "in" count to auto-lock
  created_at: string;
}

export interface PlanInvitee {
  plan_id: string;
  user_id: string | null; // null if non-app user
  phone: string;
  response_token: string; // UUID used for no-account web flow
  invited_at: string;
}

export interface PlanWithDetails extends Plan {
  creator: UserPublic;
  crew: Crew | null;
  invitees: PlanInvitee[];
  commitments: Commitment[];
  availability_count: number;
}

// ─── Availability ────────────────────────────────────────────
export type TimeWindow = {
  date: string; // YYYY-MM-DD
  slot: 'morning' | 'afternoon' | 'evening' | string; // can also be "HH:00" for hourly
};

export interface Availability {
  id: string;
  plan_id: string;
  user_id: string | null; // null = web responder using token
  response_token: string | null;
  time_window: TimeWindow;
  available: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  time_window: TimeWindow;
  available_user_ids: string[];
  available_tokens: string[];
  total_available: number;
}

// ─── Commitments ─────────────────────────────────────────────
export type CommitmentStatus = 'in' | 'wavering' | 'out';

export interface Commitment {
  id: string;
  plan_id: string;
  user_id: string;
  status: CommitmentStatus;
  reason: string | null; // for bail reason
  updated_at: string;
}

export interface CommitmentWithUser extends Commitment {
  user: UserPublic;
}

// ─── AI Suggestions ──────────────────────────────────────────
export type SuggestionKind = 'activity' | 'itinerary_item';

export interface ActivitySuggestionPayload {
  name: string;
  why_it_fits: string;
  rough_cost: string;
  distance_description: string;
  booking_url: string | null;
}

export interface ItineraryItemPayload {
  time: string;
  title: string;
  description: string;
  type: 'stay' | 'activity' | 'food' | 'transport';
  estimated_cost: number;
  notes: string | null;
}

export interface Suggestion {
  id: string;
  plan_id: string;
  kind: SuggestionKind;
  payload: ActivitySuggestionPayload | ItineraryItemPayload;
  votes: number;
  created_at: string;
}

export interface SuggestionVote {
  suggestion_id: string;
  user_id: string;
  voted_at: string;
}

// ─── Trips ───────────────────────────────────────────────────
export interface Trip {
  id: string;
  plan_id: string;
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  budget_per_person: number;
  vibe: string | null;
  musts: string | null;
  created_at: string;
}

export type ItineraryItemStatus = 'proposed' | 'confirmed' | 'vetoed';

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day: number; // 1-indexed
  payload: ItineraryItemPayload;
  status: ItineraryItemStatus;
  added_by: string | null; // user_id
  created_at: string;
}

export interface TripPayment {
  id: string;
  trip_id: string;
  user_id: string;
  amount: number;
  description: string | null;
  paid: boolean;
  due_date: string | null;
  created_at: string;
}

export interface TripWithDetails extends Trip {
  plan: Plan;
  itinerary: ItineraryItem[];
  payments: TripPayment[];
  duration_days: number;
}

// ─── Messages (per-plan chat) ─────────────────────────────────
export interface Message {
  id: string;
  plan_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface MessageWithUser extends Message {
  user: UserPublic;
}

// ─── Subscriptions ───────────────────────────────────────────
export type SubscriptionTier = 'free' | 'pro' | 'trip_pass';
export type SubscriptionSource = 'ios_iap' | 'android_iap' | 'web' | 'promo';

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  trial_ends_at: string | null;
  expires_at: string | null;
  source: SubscriptionSource;
  revenuecat_id: string | null;
  created_at: string;
}

export type FeatureKey =
  | 'unlimited_huddles'
  | 'trip_mode'
  | 'ai_suggestions'
  | 'priority_reminders'
  | 'trip_pass';

export interface Entitlement {
  id: string;
  user_id: string;
  feature: FeatureKey;
  granted_at: string;
  expires_at: string | null;
}

// ─── Notifications ───────────────────────────────────────────
export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export type NotificationEvent =
  | 'plan_locked'
  | 'stall_nudge'
  | 'convergence_found'
  | 't_minus_3_days'
  | 'night_before'
  | 'day_of'
  | 'bail_received';

export interface NotificationLog {
  id: string;
  user_id: string;
  plan_id: string | null;
  event: NotificationEvent;
  sent_at: string;
  expo_ticket_id: string | null;
}

// ─── Realtime Payloads ────────────────────────────────────────
export interface RealtimeCommitmentPayload {
  plan_id: string;
  commitment: Commitment;
  user: UserPublic;
}

export interface RealtimeAvailabilityPayload {
  plan_id: string;
  availability: Availability;
}

export interface RealtimeMessagePayload {
  plan_id: string;
  message: MessageWithUser;
}

// ─── API Request/Response Types ───────────────────────────────
export interface AISuggestionsRequest {
  plan_id: string;
  group_size: number;
  location: string;
  vibe: string[];
  budget: string;
  time_of_day: string;
  rejected_activities?: string[];
}

export interface AISuggestionsResponse {
  suggestions: ActivitySuggestionPayload[];
  cached: boolean;
}

export interface AITripPlannerRequest {
  trip_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_per_person: number;
  group_size: number;
  vibe: string | null;
  musts: string | null;
}

export interface AITripPlannerResponse {
  days: {
    day: number;
    date: string;
    items: ItineraryItemPayload[];
  }[];
}

export interface ConvergenceResult {
  best_slot: TimeWindow & { available_count: number; available_user_ids: string[] };
  runner_up: TimeWindow & { available_count: number; available_user_ids: string[] } | null;
  would_miss_best: string[]; // user_ids
  would_miss_runner_up: string[] | null;
  total_responded: number;
  stall_detected: boolean;
}
