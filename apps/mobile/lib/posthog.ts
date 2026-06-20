import PostHog from 'posthog-react-native';
import { ANALYTICS_EVENTS } from '@huddle/shared';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY!;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Singleton PostHog client
let posthog: PostHog | null = null;

export async function initPostHog(): Promise<PostHog> {
  if (posthog) return posthog;

  posthog = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    captureMode: 'form',
    disableGeoip: false,
  });

  return posthog;
}

export function getPostHog(): PostHog | null {
  return posthog;
}

// ─── Identify user ────────────────────────────────────────────

export function identifyUser(
  userId: string,
  traits?: {
    name?: string;
    phone?: string;
    reliability_score?: number;
    created_at?: string;
  }
): void {
  posthog?.identify(userId, traits);
}

export function resetAnalytics(): void {
  posthog?.reset();
}

// ─── Core event tracking ──────────────────────────────────────

export function trackPlanCreated(props: {
  plan_id: string;
  plan_type: string;
  theme: string;
  invitee_count: number;
  has_crew: boolean;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.PLAN_CREATED, props);
}

export function trackAvailabilitySubmitted(props: {
  plan_id: string;
  slots_selected: number;
  is_web_responder: boolean;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.AVAILABILITY_SUBMITTED, props);
}

export function trackPlanLocked(props: {
  plan_id: string;
  days_to_lock: number;
  in_count: number;
  wavering_count: number;
  has_activity: boolean;
  has_location: boolean;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.PLAN_LOCKED, props);
}

export function trackBailSubmitted(props: {
  plan_id: string;
  reason: string;
  hours_before: number;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.BAIL_SUBMITTED, props);
}

export function trackAISuggestionRequested(props: {
  plan_id: string;
  vibe_chips: string[];
  location: string;
  group_size: number;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.AI_SUGGESTION_REQUESTED, props);
}

export function trackAISuggestionSelected(props: {
  plan_id: string;
  suggestion_name: string;
  rank: number;
  vote_count: number;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.AI_SUGGESTION_SELECTED, props);
}

export function trackTripCreated(props: {
  trip_id: string;
  destination: string;
  duration_days: number;
  budget_per_person: number;
  group_size: number;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.TRIP_CREATED, props);
}

export function trackTripItineraryGenerated(props: {
  trip_id: string;
  item_count: number;
  days: number;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.TRIP_ITINERARY_GENERATED, props);
}

export function trackPaywallShown(props: {
  trigger: string; // which feature triggered the paywall
  plan_id?: string;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.PAYWALL_SHOWN, props);
}

export function trackTrialStarted(props: {
  source: string;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.TRIAL_STARTED, props);
}

export function trackSubscriptionPurchased(props: {
  product_id: string;
  price: number;
  currency: string;
  is_trial: boolean;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.SUBSCRIPTION_PURCHASED, props);
}

export function trackTripPassPurchased(): void {
  posthog?.capture(ANALYTICS_EVENTS.TRIP_PASS_PURCHASED, {});
}

export function trackOTPVerified(props: {
  is_new_user: boolean;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.OTP_VERIFIED, props);
}

export function trackProfileCreated(): void {
  posthog?.capture(ANALYTICS_EVENTS.PROFILE_CREATED, {});
}

export function trackWebRSVPCompleted(props: {
  plan_id: string;
  commitment_status: string;
}): void {
  posthog?.capture(ANALYTICS_EVENTS.WEB_RSVP_COMPLETED, props);
}

export function trackAppDownloadPrompted(props: {
  plan_id: string;
  action_taken: 'opened_store' | 'dismissed';
}): void {
  posthog?.capture(ANALYTICS_EVENTS.APP_DOWNLOAD_PROMPTED, props);
}

// ─── Screen tracking ──────────────────────────────────────────

export function trackScreen(screenName: string, props?: Record<string, unknown>): void {
  posthog?.screen(screenName, props);
}

// ─── Generic event capture ────────────────────────────────────

export function track(event: string, props?: Record<string, unknown>): void {
  posthog?.capture(event, props);
}
