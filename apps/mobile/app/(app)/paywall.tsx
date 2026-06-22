import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
} from '@/lib/revenuecat';
import { usePro } from '@/hooks/usePro';
import { PRICING } from '@huddle/shared';
import { trackTrialStarted, trackSubscriptionPurchased, trackTripPassPurchased } from '@/lib/posthog';

const PRO_FEATURE_LIST = [
  { key: 'unlimited_huddles', emoji: '♾️', label: 'Unlimited Huddles', sub: 'No monthly cap' },
  { key: 'ai_suggestions', emoji: '🤖', label: 'AI Activity Ideas', sub: 'Claude picks what everyone agrees on' },
  { key: 'trip_mode', emoji: '✈️', label: 'Trip Mode', sub: 'Full itinerary + cost split' },
  { key: 'priority_reminders', emoji: '🔔', label: 'Smart Reminders', sub: 'Loss-framed nudges that actually work' },
] as const;

type PricingTab = 'annual' | 'monthly';

export default function PaywallScreen() {
  const { trigger } = useLocalSearchParams<{ trigger?: string; feature?: string }>();
  const { refresh } = usePro();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<PricingTab>('annual');
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getAvailablePackages().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, []);

  const getPackage = (productId: string): PurchasesPackage | undefined =>
    packages.find((p) => p.product.identifier === productId);

  const handlePurchase = async (productId: string) => {
    setErrorMsg(null);
    const pkg = getPackage(productId);
    if (!pkg) {
      setErrorMsg("This purchase option isn't available right now. Try again later.");
      return;
    }

    setPurchasing(true);
    const { success, customerInfo, error } = await purchasePackage(pkg);
    setPurchasing(false);

    if (!success) {
      if (error !== 'cancelled') setErrorMsg(error ?? 'Something went wrong. Please try again.');
      return;
    }

    const isTrialing = customerInfo?.entitlements.active['pro']?.periodType === 'TRIAL';
    if (isTrialing) trackTrialStarted({ source: trigger ?? 'paywall' });

    if (productId === PRODUCT_IDS.TRIP_PASS) {
      trackTripPassPurchased();
    } else {
      trackSubscriptionPurchased({
        product_id: productId,
        price: productId === PRODUCT_IDS.PRO_ANNUAL ? PRICING.pro_annual.price : PRICING.pro_monthly.price,
        currency: 'USD',
        is_trial: isTrialing,
      });
    }

    await refresh();
    router.back();
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    setRestoringPurchases(true);
    const { success, error } = await restorePurchases();
    setRestoringPurchases(false);

    if (!success) {
      setErrorMsg(error ?? 'Could not restore purchases.');
      return;
    }

    await refresh();
    router.back();
  };

  const contextMessage = trigger === 'huddle_limit'
    ? "You've hit the free plan limit of 3 huddles/month."
    : trigger === 'ai_activity_suggestions'
    ? 'AI activity suggestions are a Pro feature.'
    : trigger === 'trip_creation'
    ? 'Trip Mode is a Pro feature.'
    : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Centered column for desktop */}
        <View style={styles.column}>
          {/* Header */}
          <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 52, marginBottom: 10 }}>⭐</Text>
            <Text style={styles.heroTitle}>Huddle Pro</Text>
            <Text style={styles.heroSub}>For people who actually follow through</Text>

            {contextMessage && (
              <View style={styles.contextBox}>
                <Text style={styles.contextText}>{contextMessage}</Text>
              </View>
            )}

            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>
                🎉 {PRICING.trial_days}-day free trial — no charge until day {PRICING.trial_days + 1}
              </Text>
            </Animated.View>
          </LinearGradient>

          {/* Features */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>What you get</Text>
            {PRO_FEATURE_LIST.map((feat) => (
              <View key={feat.key} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Text style={{ fontSize: 18 }}>{feat.emoji}</Text>
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{feat.label}</Text>
                  <Text style={styles.featureSub}>{feat.sub}</Text>
                </View>
                <View style={styles.checkBadge}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Pricing tabs */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            {/* Tab switcher */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                onPress={() => setSelectedTab('annual')}
                style={[styles.tab, selectedTab === 'annual' && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, selectedTab === 'annual' && styles.tabLabelActive]}>
                  Annual — Best Value
                </Text>
                {selectedTab === 'annual' && (
                  <Text style={styles.tabSavings}>Save {PRICING.pro_annual.savings_percent}%</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedTab('monthly')}
                style={[styles.tab, selectedTab === 'monthly' && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, selectedTab === 'monthly' && styles.tabLabelActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>

            {/* Price card */}
            <View style={styles.priceCard}>
              {selectedTab === 'annual' ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={styles.priceBig}>${PRICING.pro_annual.per_month.toFixed(2)}</Text>
                    <Text style={styles.priceUnit}>/month</Text>
                  </View>
                  <Text style={styles.priceSub}>
                    Billed as ${PRICING.pro_annual.price}/year · cancel anytime
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePurchase(PRODUCT_IDS.PRO_ANNUAL)}
                    disabled={loading || purchasing}
                    style={styles.ctaBtn}
                    activeOpacity={0.85}
                  >
                    {purchasing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.ctaBtnText}>
                        Start {PRICING.trial_days}-Day Free Trial
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={styles.priceBig}>${PRICING.pro_monthly.price.toFixed(2)}</Text>
                    <Text style={styles.priceUnit}>/month</Text>
                  </View>
                  <Text style={styles.priceSub}>Cancel anytime</Text>
                  <TouchableOpacity
                    onPress={() => handlePurchase(PRODUCT_IDS.PRO_MONTHLY)}
                    disabled={loading || purchasing}
                    style={styles.ctaBtn}
                    activeOpacity={0.85}
                  >
                    {purchasing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.ctaBtnText}>
                        Start {PRICING.trial_days}-Day Free Trial
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Trip Pass */}
            <View style={styles.tripPassCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 18 }}>🎫</Text>
                <Text style={styles.tripPassTitle}>Trip Pass</Text>
              </View>
              <Text style={styles.tripPassSub}>
                Just need Trip Mode once? One-time purchase, no subscription.
              </Text>
              <View style={styles.tripPassFooter}>
                <Text style={styles.tripPassPrice}>{PRICING.trip_pass.label}</Text>
                <TouchableOpacity
                  onPress={() => handlePurchase(PRODUCT_IDS.TRIP_PASS)}
                  disabled={loading || purchasing}
                  style={styles.tripPassBtn}
                >
                  <Text style={styles.tripPassBtnText}>Buy Trip Pass</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Restore */}
            <TouchableOpacity onPress={handleRestore} disabled={restoringPurchases} style={styles.restoreBtn}>
              {restoringPurchases ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.restoreText}>Restore Previous Purchases</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.legal}>
              Subscription automatically renews. Cancel anytime in App Store settings.{'\n'}
              By subscribing you agree to our Terms of Service and Privacy Policy.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  column: {
    maxWidth: 600,
    alignSelf: 'center' as any,
    width: '100%',
  },
  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    cursor: 'pointer' as any,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  contextBox: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  trialBadge: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  trialBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  featureSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 1,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkMark: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    fontSize: 13,
  },
  tabLabelActive: {
    color: '#0F1117',
  },
  tabSavings: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },
  priceBig: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  priceUnit: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 16,
  },
  priceSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 4,
  },
  ctaBtn: {
    marginTop: 16,
    backgroundColor: '#667EEA',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tripPassCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 20,
  },
  tripPassTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  tripPassSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  tripPassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripPassPrice: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tripPassBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    cursor: 'pointer' as any,
  },
  tripPassBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12,
    cursor: 'pointer' as any,
  },
  restoreText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
  legal: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingBottom: 8,
  },
});
