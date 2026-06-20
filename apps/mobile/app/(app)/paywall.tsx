import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
} from '@/lib/revenuecat';
import { usePro } from '@/hooks/usePro';
import { PRICING, PRO_FEATURES } from '@huddle/shared';
import { trackTrialStarted, trackSubscriptionPurchased, trackTripPassPurchased } from '@/lib/posthog';

const PRO_FEATURE_LIST = [
  { key: 'unlimited_huddles', emoji: '♾️', label: 'Unlimited Huddles', sub: 'No monthly cap' },
  { key: 'ai_suggestions', emoji: '🤖', label: 'AI Activity Ideas', sub: 'Claude picks what everyone agrees on' },
  { key: 'trip_mode', emoji: '✈️', label: 'Trip Mode', sub: 'Full itinerary + cost split' },
  { key: 'priority_reminders', emoji: '🔔', label: 'Smart Reminders', sub: 'Loss-framed nudges that actually work' },
] as const;

type PricingTab = 'annual' | 'monthly';

export default function PaywallScreen() {
  const { trigger, feature } = useLocalSearchParams<{ trigger?: string; feature?: string }>();
  const { refresh } = usePro();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<PricingTab>('annual');
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  useEffect(() => {
    getAvailablePackages().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, []);

  const getPackage = (productId: string): PurchasesPackage | undefined =>
    packages.find((p) => p.product.identifier === productId);

  const handlePurchase = async (productId: string) => {
    const pkg = getPackage(productId);
    if (!pkg) {
      Alert.alert('Not available', 'This purchase option isn\'t available right now. Try again later.');
      return;
    }

    setPurchasing(true);

    const { success, customerInfo, error } = await purchasePackage(pkg);

    setPurchasing(false);

    if (!success) {
      if (error === 'cancelled') return;
      Alert.alert('Purchase failed', error ?? 'Something went wrong. Please try again.');
      return;
    }

    const isTrialing = customerInfo?.entitlements.active['pro']?.periodType === 'TRIAL';

    if (isTrialing) {
      trackTrialStarted({ source: trigger ?? 'paywall' });
    }

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
    setRestoringPurchases(true);
    const { success, error } = await restorePurchases();
    setRestoringPurchases(false);

    if (!success) {
      Alert.alert('Restore failed', error ?? 'Could not restore purchases.');
      return;
    }

    await refresh();
    Alert.alert('Restored!', 'Your purchases have been restored.');
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
    <View className="flex-1 bg-[#0F1117]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          className="pt-14 pb-8 px-4 items-center"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-14 left-4"
          >
            <Text className="text-white/80 text-base">✕</Text>
          </TouchableOpacity>

          <Text className="text-5xl mb-3">⭐</Text>
          <Text className="text-white text-3xl font-bold">Huddle Pro</Text>
          <Text className="text-white/70 text-base mt-2 text-center">
            For people who actually follow through
          </Text>

          {contextMessage && (
            <View className="mt-4 bg-white/10 rounded-2xl px-4 py-3">
              <Text className="text-white/80 text-sm text-center">{contextMessage}</Text>
            </View>
          )}

          {/* Trial badge */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-4">
            <View className="bg-white/20 rounded-full px-5 py-2">
              <Text className="text-white font-bold text-sm">
                🎉 {PRICING.trial_days}-day free trial — no charge until day {PRICING.trial_days + 1}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-4 py-6">
          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            What you get
          </Text>
          {PRO_FEATURE_LIST.map((feature, i) => (
            <View key={feature.key} className="flex-row gap-3 mb-4 items-start">
              <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center flex-shrink-0">
                <Text className="text-xl">{feature.emoji}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{feature.label}</Text>
                <Text className="text-white/50 text-sm">{feature.sub}</Text>
              </View>
              <Text className="text-green-400 text-lg">✓</Text>
            </View>
          ))}
        </Animated.View>

        {/* Pricing tabs */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="px-4">
          {/* Tab switcher */}
          <View className="flex-row bg-white/10 rounded-2xl p-1 mb-4">
            <TouchableOpacity
              onPress={() => setSelectedTab('annual')}
              className={`flex-1 py-2.5 rounded-xl items-center ${selectedTab === 'annual' ? 'bg-white' : ''}`}
            >
              <Text className={`font-bold text-sm ${selectedTab === 'annual' ? 'text-[#0F1117]' : 'text-white/60'}`}>
                Annual — Best Value
              </Text>
              {selectedTab === 'annual' && (
                <Text className="text-green-600 text-xs font-bold mt-0.5">
                  Save {PRICING.pro_annual.savings_percent}%
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('monthly')}
              className={`flex-1 py-2.5 rounded-xl items-center ${selectedTab === 'monthly' ? 'bg-white' : ''}`}
            >
              <Text className={`font-bold text-sm ${selectedTab === 'monthly' ? 'text-[#0F1117]' : 'text-white/60'}`}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price display */}
          {selectedTab === 'annual' ? (
            <View className="bg-white/5 rounded-2xl p-5 mb-3">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-white text-4xl font-bold">
                  ${PRICING.pro_annual.per_month.toFixed(2)}
                </Text>
                <Text className="text-white/50 text-base">/month</Text>
              </View>
              <Text className="text-white/50 text-sm mt-1">
                Billed as ${PRICING.pro_annual.price}/year · cancel anytime
              </Text>

              <TouchableOpacity
                onPress={() => handlePurchase(PRODUCT_IDS.PRO_ANNUAL)}
                disabled={loading || purchasing}
                className="mt-4 bg-[#667EEA] rounded-xl py-4 items-center"
                activeOpacity={0.85}
              >
                {purchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Start {PRICING.trial_days}-Day Free Trial
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white/5 rounded-2xl p-5 mb-3">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-white text-4xl font-bold">
                  ${PRICING.pro_monthly.price.toFixed(2)}
                </Text>
                <Text className="text-white/50 text-base">/month</Text>
              </View>
              <Text className="text-white/50 text-sm mt-1">Cancel anytime</Text>

              <TouchableOpacity
                onPress={() => handlePurchase(PRODUCT_IDS.PRO_MONTHLY)}
                disabled={loading || purchasing}
                className="mt-4 bg-[#667EEA] rounded-xl py-4 items-center"
                activeOpacity={0.85}
              >
                {purchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Start {PRICING.trial_days}-Day Free Trial
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Trip Pass alternative */}
          <View className="bg-white/5 rounded-2xl p-5 mb-6 border border-white/10">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-lg">🎫</Text>
              <Text className="text-white font-semibold">Trip Pass</Text>
            </View>
            <Text className="text-white/50 text-sm mb-4">
              Just need Trip Mode for one trip? One-time purchase, no subscription.
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-bold">{PRICING.trip_pass.label}</Text>
              <TouchableOpacity
                onPress={() => handlePurchase(PRODUCT_IDS.TRIP_PASS)}
                disabled={loading || purchasing}
                className="bg-white/20 rounded-xl px-4 py-2"
              >
                <Text className="text-white font-semibold text-sm">Buy Trip Pass</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Restore + legal */}
          <TouchableOpacity onPress={handleRestore} disabled={restoringPurchases} className="items-center mb-3">
            {restoringPurchases ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white/40 text-sm">Restore Previous Purchases</Text>
            )}
          </TouchableOpacity>

          <Text className="text-white/30 text-xs text-center leading-5">
            Subscription automatically renews. Cancel anytime in App Store settings.
            By subscribing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
