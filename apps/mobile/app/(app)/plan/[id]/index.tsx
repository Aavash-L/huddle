import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import AvatarCluster from '@/components/AvatarCluster';
import { THEMES, PLAN_STATUSES, PLAN_TYPES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://huddle.app';

function StatusPill({ status }: { status: string }) {
  const meta = PLAN_STATUSES[status as keyof typeof PLAN_STATUSES];
  if (!meta) return null;

  const bgColors: Record<string, string> = {
    gathering: 'bg-blue-500/20',
    converging: 'bg-yellow-500/20',
    locked: 'bg-green-500/20',
    happened: 'bg-gray-500/20',
    cancelled: 'bg-red-500/20',
  };

  const textColors: Record<string, string> = {
    gathering: 'text-blue-300',
    converging: 'text-yellow-300',
    locked: 'text-green-300',
    happened: 'text-gray-300',
    cancelled: 'text-red-300',
  };

  return (
    <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${bgColors[status] ?? 'bg-white/10'}`}>
      <Text className="text-sm">{meta.emoji}</Text>
      <Text className={`text-sm font-semibold ${textColors[status] ?? 'text-white/70'}`}>
        {meta.label}
      </Text>
    </View>
  );
}

function ActionButton({ emoji, label, onPress, color = 'bg-white/10' }: {
  emoji: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 ${color} rounded-2xl py-4 items-center gap-1`}
      activeOpacity={0.8}
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text className="text-white text-xs font-medium">{label}</Text>
    </TouchableOpacity>
  );
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isDesktop } = useBreakpoint();
  const [shareCopied, setShareCopied] = useState(false);
  const {
    plan,
    commitments,
    availability,
    creator,
    loading,
    submitCommitment,
  } = usePlan(id ?? '');

  const handleShare = async () => {
    if (!plan?.share_token) return;
    const url = `${WEB_URL}/join/${plan.share_token}`;
    if (Platform.OS !== 'web') {
      await Share.share({ message: url, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center">
        <ActivityIndicator color="#667EEA" size="large" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View className="flex-1 bg-[#0F1117] items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-2">Huddle not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-[#667EEA]">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const theme = THEMES[plan.theme as CrewTheme] ?? THEMES.ocean;
  const isCreator = user?.id === plan.creator_id;
  const myCommitment = commitments.find((c) => c.user_id === user?.id);
  const inCount = commitments.filter((c) => c.status === 'in').length;
  const waveringCount = commitments.filter((c) => c.status === 'wavering').length;
  const inUsers = commitments.filter((c) => c.status === 'in').map((c) => (c as any).user);
  const waveringUsers = commitments.filter((c) => c.status === 'wavering').map((c) => (c as any).user);

  const lockedDate = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const lockedTime = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <View className="flex-1 bg-[#0F1117]">
      {/* Themed header */}
      <LinearGradient
        colors={theme.gradient as [string, string]}
        style={{ paddingTop: isDesktop ? 20 : 56, paddingBottom: 28, paddingHorizontal: 24 }}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white/80 text-base font-medium">← Back</Text>
        </TouchableOpacity>

        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-3xl mb-1">{PLAN_TYPES[plan.type as keyof typeof PLAN_TYPES]?.emoji ?? '📅'}</Text>
            <Text className="text-white text-2xl font-bold leading-tight" numberOfLines={2}>
              {plan.title}
            </Text>
            <Text className="text-white/70 text-sm mt-1">
              by {creator?.name ?? 'Unknown'}
            </Text>
          </View>
          <StatusPill status={plan.status} />
        </View>

        {/* Locked datetime / location */}
        {plan.status === 'locked' && plan.locked_datetime && (
          <View className="mt-4 bg-black/20 rounded-2xl px-4 py-3">
            <Text className="text-white font-bold text-base">
              📅 {lockedDate}
            </Text>
            <Text className="text-white/80 text-sm mt-0.5">
              🕗 {lockedTime} {plan.location ? `· 📍 ${plan.location}` : ''}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40, maxWidth: isDesktop ? 680 : undefined, alignSelf: isDesktop ? 'center' as any : undefined, width: '100%' }}>
        {/* Commitment roster */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-4 py-5">
          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
            Who's in
          </Text>

          <View className="bg-white/5 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">
                {inCount} of {commitments.length} are in 🔥
              </Text>
              {waveringCount > 0 && (
                <Text className="text-yellow-400 text-sm">
                  {waveringCount} maybe
                </Text>
              )}
            </View>

            <AvatarCluster
              inUsers={inUsers}
              waveringUsers={waveringUsers}
              size="large"
            />
          </View>
        </Animated.View>

        {/* Quick action grid */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="px-4 mb-4">
          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
            Actions
          </Text>
          <View className="flex-row gap-3">
            <ActionButton
              emoji="📅"
              label="Availability"
              onPress={() => router.push(`/(app)/plan/${id}/availability`)}
            />
            <ActionButton
              emoji="💬"
              label="Chat"
              onPress={() => router.push(`/(app)/plan/${id}/chat`)}
            />
            <ActionButton
              emoji="🤖"
              label="AI Ideas"
              onPress={() => router.push(`/(app)/plan/${id}/ai-suggestions`)}
            />
          </View>
        </Animated.View>

        {/* Share / Invite */}
        <Animated.View entering={FadeInDown.delay(250).springify()} className="px-4 mb-4">
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/15 bg-white/5"
          >
            <Text className="text-lg">{shareCopied ? '✅' : '🔗'}</Text>
            <Text className="text-white font-semibold text-sm">
              {shareCopied ? 'Link copied!' : 'Share / Invite'}
            </Text>
          </TouchableOpacity>
          {shareCopied && (
            <Text className="text-white/40 text-xs text-center mt-1.5">
              Anyone with the link can RSVP — no account needed
            </Text>
          )}
        </Animated.View>

        {/* My commitment */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="px-4 mb-4">
          <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
            Are you in?
          </Text>
          <View className="flex-row gap-3">
            {(['in', 'wavering', 'out'] as const).map((status) => {
              const labels = { in: "I'm In ✅", wavering: "Maybe 🤔", out: "Can't Go ❌" };
              const isSelected = myCommitment?.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => submitCommitment(status)}
                  className={`flex-1 py-3 rounded-xl items-center border-2 ${
                    isSelected
                      ? status === 'in'
                        ? 'bg-green-500/20 border-green-500'
                        : status === 'wavering'
                        ? 'bg-yellow-500/20 border-yellow-500'
                        : 'bg-red-500/20 border-red-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-sm font-medium text-center">{labels[status]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Creator-only: Lock It In */}
        {isCreator && plan.status !== 'locked' && plan.status !== 'happened' && (
          <Animated.View entering={FadeInDown.delay(400).springify()} className="px-4 mb-4">
            <TouchableOpacity
              onPress={() => router.push(`/(app)/plan/${id}/lock`)}
              className="rounded-2xl overflow-hidden"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 items-center flex-row justify-center gap-2"
              >
                <Text className="text-white font-bold text-lg">🔒 Lock It In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bail button */}
        {myCommitment?.status === 'in' && plan.status === 'locked' && (
          <Animated.View entering={FadeInDown.delay(500).springify()} className="px-4">
            <TouchableOpacity
              onPress={() => router.push(`/(app)/plan/${id}/bail`)}
              className="py-3 items-center"
            >
              <Text className="text-white/40 text-sm">Something came up? Let the group know →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
