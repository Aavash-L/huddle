// ============================================================
// Tests: Entitlement gating logic
// ============================================================

import { describe, it, expect } from 'vitest';

// Mirror the entitlement check from ai-suggestions/index.ts
interface EntitlementRow {
  feature: string;
  expires_at: string | null;
}

function checkEntitlement(
  entitlements: EntitlementRow[],
  requiredFeatures: string[],
  now: string = new Date().toISOString()
): boolean {
  const active = entitlements.filter(
    (e) => !e.expires_at || e.expires_at > now
  );
  return active.some((e) => requiredFeatures.includes(e.feature));
}

// Mirror the usage cap logic
function isWithinDailyCap(usedToday: number, isPro: boolean): boolean {
  const limit = isPro ? 50 : 3;
  return usedToday < limit;
}

describe('Entitlement gating', () => {
  it('grants access when user has ai_suggestions entitlement', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'ai_suggestions', expires_at: null },
    ];
    expect(checkEntitlement(entitlements, ['ai_suggestions', 'unlimited_huddles'])).toBe(true);
  });

  it('denies access when user has no matching entitlement', () => {
    const entitlements: EntitlementRow[] = [];
    expect(checkEntitlement(entitlements, ['trip_mode', 'trip_pass', 'unlimited_huddles'])).toBe(false);
  });

  it('denies access when entitlement is expired', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'trip_mode', expires_at: '2020-01-01T00:00:00Z' },
    ];
    expect(checkEntitlement(entitlements, ['trip_mode'])).toBe(false);
  });

  it('grants access when entitlement has no expiry (lifetime)', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'unlimited_huddles', expires_at: null },
    ];
    expect(checkEntitlement(entitlements, ['unlimited_huddles'])).toBe(true);
  });

  it('grants access when at least one of multiple entitlements is active', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'trip_mode', expires_at: '2020-01-01T00:00:00Z' }, // expired
      { feature: 'trip_pass', expires_at: null },                     // active
    ];
    expect(checkEntitlement(entitlements, ['trip_mode', 'trip_pass'])).toBe(true);
  });
});

describe('Daily usage cap', () => {
  it('allows free user up to 3 calls per day', () => {
    expect(isWithinDailyCap(0, false)).toBe(true);
    expect(isWithinDailyCap(2, false)).toBe(true);
    expect(isWithinDailyCap(3, false)).toBe(false);
    expect(isWithinDailyCap(10, false)).toBe(false);
  });

  it('allows pro user up to 50 calls per day', () => {
    expect(isWithinDailyCap(0, true)).toBe(true);
    expect(isWithinDailyCap(49, true)).toBe(true);
    expect(isWithinDailyCap(50, true)).toBe(false);
  });
});

describe('Trip Mode entitlement', () => {
  it('trip_pass grants access to trip mode', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'trip_pass', expires_at: null },
    ];
    const hasAccess = checkEntitlement(entitlements, ['trip_mode', 'trip_pass', 'unlimited_huddles']);
    expect(hasAccess).toBe(true);
  });

  it('free user without any entitlements is blocked from trip mode', () => {
    const entitlements: EntitlementRow[] = [];
    const hasAccess = checkEntitlement(entitlements, ['trip_mode', 'trip_pass', 'unlimited_huddles']);
    expect(hasAccess).toBe(false);
  });

  it('expired trip_pass does not grant access', () => {
    const entitlements: EntitlementRow[] = [
      { feature: 'trip_pass', expires_at: '2024-01-01T00:00:00Z' },
    ];
    const hasAccess = checkEntitlement(entitlements, ['trip_mode', 'trip_pass', 'unlimited_huddles']);
    expect(hasAccess).toBe(false);
  });
});
