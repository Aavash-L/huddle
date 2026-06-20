import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import type { FeatureKey } from '@huddle/shared';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;
const BYPASS_PAYWALL = process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';

// ─── RevenueCat product IDs ───────────────────────────────────
export const PRODUCT_IDS = {
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
  TRIP_PASS: 'trip_pass',
} as const;

// RevenueCat entitlement IDs (configured in RC dashboard)
export const ENTITLEMENT_IDS = {
  PRO: 'pro',
  TRIP_PASS: 'trip_pass',
} as const;

// ─── Initialization ───────────────────────────────────────────

export async function initRevenueCat(): Promise<void> {
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

    await Purchases.configure({ apiKey });
    console.log('RevenueCat initialized');
  } catch (err) {
    console.error('RevenueCat init error:', err);
  }
}

// ─── Identify user ────────────────────────────────────────────

export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.error('RevenueCat identify error:', err);
  }
}

export async function resetUser(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('RevenueCat reset error:', err);
  }
}

// ─── Entitlement checks ───────────────────────────────────────

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('RevenueCat customer info error:', err);
    return null;
  }
}

export async function hasProEntitlement(): Promise<boolean> {
  if (BYPASS_PAYWALL) return true;

  const info = await getCustomerInfo();
  if (!info) return false;

  return !!info.entitlements.active[ENTITLEMENT_IDS.PRO];
}

export async function hasTripPassEntitlement(): Promise<boolean> {
  if (BYPASS_PAYWALL) return true;

  const info = await getCustomerInfo();
  if (!info) return false;

  return (
    !!info.entitlements.active[ENTITLEMENT_IDS.TRIP_PASS] ||
    !!info.entitlements.active[ENTITLEMENT_IDS.PRO]
  );
}

export async function checkFeatureEntitlement(feature: FeatureKey): Promise<boolean> {
  if (BYPASS_PAYWALL) return true;

  switch (feature) {
    case 'unlimited_huddles':
    case 'ai_suggestions':
    case 'priority_reminders':
      return hasProEntitlement();
    case 'trip_mode':
    case 'trip_pass':
      return hasTripPassEntitlement();
    default:
      return false;
  }
}

export async function isInTrial(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;

  const proEntitlement = info.entitlements.active[ENTITLEMENT_IDS.PRO];
  return proEntitlement?.periodType === 'TRIAL';
}

// ─── Available packages ───────────────────────────────────────

export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (err) {
    console.error('RevenueCat offerings error:', err);
    return [];
  }
}

// ─── Purchase ────────────────────────────────────────────────

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (err: any) {
    if (err.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    console.error('Purchase error:', err);
    return { success: false, error: err.message ?? 'Purchase failed' };
  }
}

// ─── Restore purchases ────────────────────────────────────────

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  try {
    await Purchases.restorePurchases();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Restore failed' };
  }
}
