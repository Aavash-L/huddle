import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  hasProEntitlement,
  hasTripPassEntitlement,
  checkFeatureEntitlement,
  getCustomerInfo,
  isInTrial,
} from '@/lib/revenuecat';
import { trackPaywallShown } from '@/lib/posthog';
import type { FeatureKey } from '@huddle/shared';
import { FREE_TIER } from '@huddle/shared';

interface ProState {
  isPro: boolean;
  hasTripPass: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  loading: boolean;
}

interface ProActions {
  checkFeature: (feature: FeatureKey) => Promise<boolean>;
  requireFeature: (feature: FeatureKey, trigger: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePro(): ProState & ProActions {
  const [isPro, setIsPro] = useState(false);
  const [hasTripPass, setHasTripPass] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [pro, tripPass, trialing, info] = await Promise.all([
        hasProEntitlement(),
        hasTripPassEntitlement(),
        isInTrial(),
        getCustomerInfo(),
      ]);

      setIsPro(pro);
      setHasTripPass(tripPass);
      setIsTrialing(trialing);

      // Calculate trial days remaining
      if (trialing && info) {
        const proEntitlement = info.entitlements.active['pro'];
        if (proEntitlement?.expirationDate) {
          const expiresAt = new Date(proEntitlement.expirationDate);
          const now = new Date();
          const diff = expiresAt.getTime() - now.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, days));
        }
      } else {
        setTrialDaysLeft(null);
      }
    } catch (err) {
      console.error('usePro refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkFeature = useCallback(async (feature: FeatureKey): Promise<boolean> => {
    return checkFeatureEntitlement(feature);
  }, []);

  // Check feature and show paywall if not entitled
  const requireFeature = useCallback(async (
    feature: FeatureKey,
    trigger: string
  ): Promise<boolean> => {
    const hasAccess = await checkFeatureEntitlement(feature);

    if (!hasAccess) {
      trackPaywallShown({ trigger });
      // Navigate to paywall with the trigger context
      router.push({
        pathname: '/(app)/paywall',
        params: { trigger, feature },
      });
      return false;
    }

    return true;
  }, []);

  return {
    isPro,
    hasTripPass,
    isTrialing,
    trialDaysLeft,
    loading,
    checkFeature,
    requireFeature,
    refresh,
  };
}

// Hook to check huddle creation limits for free users
export function useHuddleLimit(): {
  canCreate: boolean;
  usedThisMonth: number;
  limit: number;
  loading: boolean;
} {
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLimit = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', session.user.id)
        .gte('created_at', startOfMonth.toISOString());

      setUsedThisMonth(count ?? 0);
      setLoading(false);
    };

    checkLimit();
  }, []);

  return {
    canCreate: usedThisMonth < FREE_TIER.max_huddles_per_month,
    usedThisMonth,
    limit: FREE_TIER.max_huddles_per_month,
    loading,
  };
}
