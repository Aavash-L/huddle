// Web shim — react-native-purchases has no web support.
// Payments on web/desktop go through Stripe (Phase 5).
// All entitlement checks return false unless BYPASS_PAYWALL is set.

import type { FeatureKey } from '@huddle/shared';

const BYPASS_PAYWALL = process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';

export const PRODUCT_IDS = {
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
  TRIP_PASS: 'trip_pass',
} as const;

export const ENTITLEMENT_IDS = {
  PRO: 'pro',
  TRIP_PASS: 'trip_pass',
} as const;

export async function initRevenueCat(): Promise<void> {}

export async function identifyUser(_userId: string): Promise<void> {}

export async function resetUser(): Promise<void> {}

export async function getCustomerInfo(): Promise<null> {
  return null;
}

export async function hasProEntitlement(): Promise<boolean> {
  return BYPASS_PAYWALL;
}

export async function hasTripPassEntitlement(): Promise<boolean> {
  return BYPASS_PAYWALL;
}

export async function checkFeatureEntitlement(_feature: FeatureKey): Promise<boolean> {
  return BYPASS_PAYWALL;
}

export async function isInTrial(): Promise<boolean> {
  return false;
}

export async function getAvailablePackages(): Promise<[]> {
  return [];
}

export async function purchasePackage(
  _pkg: unknown
): Promise<{ success: boolean; customerInfo?: undefined; error?: string }> {
  return { success: false, error: 'Use Stripe for web purchases' };
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Use Stripe for web purchases' };
}
