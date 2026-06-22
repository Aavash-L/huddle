import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePlan } from '@/hooks/usePlan';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { BAIL_REASONS, THEMES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';
import { trackBailSubmitted } from '@/lib/posthog';

export default function BailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDesktop } = useBreakpoint();
  const { plan, submitCommitment, loading } = usePlan(id ?? '');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = plan ? (THEMES[plan.theme as CrewTheme] ?? THEMES.ocean) : THEMES.ocean;

  const lockedDate = plan?.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    : null;

  const handleBail = async () => {
    setErrorMsg(null);

    if (!selectedReason && !customReason.trim()) {
      setErrorMsg('Pick a reason or write your own so your friends understand.');
      return;
    }

    const confirmMsg = `Your friends are counting on you${lockedDate ? ` for ${lockedDate}` : ''}. Everyone will be notified when you bail.`;
    const ok = typeof window !== 'undefined' && window.confirm
      ? window.confirm(confirmMsg)
      : true;
    if (!ok) return;

    setSubmitting(true);
    const reason = customReason.trim() ||
      (BAIL_REASONS.find((r) => r.id === selectedReason)?.label ?? 'Something came up');

    const { error } = await submitCommitment('out', reason);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    trackBailSubmitted({
      plan_id: id ?? '',
      reason: selectedReason ?? 'custom',
      hours_before: plan?.locked_datetime
        ? (new Date(plan.locked_datetime).getTime() - Date.now()) / (1000 * 60 * 60)
        : 0,
    });

    router.replace(`/(app)/plan/${id}`);
  };

  return (
    <View className="flex-1 bg-[#0F1117]">
      <LinearGradient
        colors={['#1a0a0a', '#2a0f0f']}
        style={{ paddingTop: isDesktop ? 20 : 56, paddingBottom: 24, paddingHorizontal: 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text className="text-white/80">← Actually I'm in</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">😬 Something came up?</Text>
        <Text className="text-white/60 text-sm mt-1">
          Your friends deserve to know. Help them out.
        </Text>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{
          paddingBottom: 120,
          maxWidth: isDesktop ? 560 : undefined,
          alignSelf: isDesktop ? 'center' as any : undefined,
          width: '100%',
        }}
      >
        <Animated.View entering={FadeInDown.springify()}>
          {plan && (
            <View className="bg-white/5 rounded-2xl p-4 mb-6">
              <Text className="text-white font-medium">{plan.title}</Text>
              {lockedDate && (
                <Text className="text-white/50 text-sm mt-1">📅 {lockedDate}</Text>
              )}
            </View>
          )}

          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            What happened?
          </Text>

          <View className="gap-3 mb-6">
            {BAIL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => { setSelectedReason(reason.id); setCustomReason(''); setErrorMsg(null); }}
                className={`flex-row items-center gap-3 px-4 py-4 rounded-2xl border-2 ${
                  selectedReason === reason.id
                    ? 'bg-red-500/10 border-red-500/50'
                    : 'bg-white/5 border-white/10'
                }`}
                activeOpacity={0.8}
                style={{ cursor: 'pointer' as any }}
              >
                <Text className="text-xl">{reason.emoji}</Text>
                <Text className={`font-medium ${selectedReason === reason.id ? 'text-red-300' : 'text-white/80'}`}>
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <View className="ml-auto w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
            Or write your own
          </Text>
          <View className="bg-white/10 rounded-2xl px-4 py-3 mb-6">
            <TextInput
              value={customReason}
              onChangeText={(text) => { setCustomReason(text); if (text) setSelectedReason(null); setErrorMsg(null); }}
              placeholder="Tell them what happened..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={{ color: 'white', fontSize: 16 }}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
          </View>

          {errorMsg && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{errorMsg}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingBottom: isDesktop ? 24 : 40, paddingTop: 12,
          backgroundColor: '#0F1117',
          maxWidth: isDesktop ? 560 : undefined,
          alignSelf: isDesktop ? 'center' as any : undefined,
          width: '100%',
        }}
      >
        <TouchableOpacity
          onPress={handleBail}
          disabled={submitting || (!selectedReason && !customReason.trim())}
          className="bg-red-500/80 rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Notify the group I can't make it
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
