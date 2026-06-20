import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Plan, CommitmentStatus, CrewTheme } from '@huddle/shared';
import { THEMES, PLAN_STATUSES, PLAN_TYPES } from '@huddle/shared';
import AvatarCluster from './AvatarCluster';

interface PlanCardProps {
  plan: Plan;
  myCommitment: CommitmentStatus | null;
  inCount: number;
  inviteeCount: number;
  onPress: () => void;
  size?: 'default' | 'large';
}

function StatusPill({ status }: { status: string }) {
  const meta = PLAN_STATUSES[status as keyof typeof PLAN_STATUSES];
  if (!meta) return null;

  const pillColors: Record<string, string> = {
    gathering: 'rgba(59,130,246,0.2)',
    converging: 'rgba(234,179,8,0.2)',
    locked: 'rgba(34,197,94,0.2)',
    happened: 'rgba(107,114,128,0.2)',
    cancelled: 'rgba(239,68,68,0.2)',
  };

  const pillText: Record<string, string> = {
    gathering: '#93C5FD',
    converging: '#FDE68A',
    locked: '#86EFAC',
    happened: '#D1D5DB',
    cancelled: '#FCA5A5',
  };

  return (
    <View
      style={{ backgroundColor: pillColors[status] ?? 'rgba(255,255,255,0.1)' }}
      className="flex-row items-center gap-1 px-2 py-1 rounded-full"
    >
      <Text style={{ fontSize: 10 }}>{meta.emoji}</Text>
      <Text
        style={{ fontSize: 10, fontWeight: '700', color: pillText[status] ?? 'white' }}
      >
        {meta.label.toUpperCase()}
      </Text>
    </View>
  );
}

export default function PlanCard({
  plan,
  myCommitment,
  inCount,
  inviteeCount,
  onPress,
  size = 'default',
}: PlanCardProps) {
  const theme = THEMES[plan.theme as CrewTheme] ?? THEMES.ocean;
  const planType = PLAN_TYPES[plan.type as keyof typeof PLAN_TYPES] ?? PLAN_TYPES.hangout;
  const isLarge = size === 'large';

  const lockedDate = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
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

  const myCommitmentBadge = myCommitment
    ? { in: '✅', wavering: '🤔', out: '❌' }[myCommitment]
    : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={theme.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={`rounded-3xl overflow-hidden ${isLarge ? 'p-5' : 'p-4'}`}
        style={{
          shadowColor: theme.gradient[0],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Top row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text style={{ fontSize: isLarge ? 20 : 16 }}>{planType.emoji}</Text>
              {myCommitmentBadge && (
                <Text style={{ fontSize: 12 }}>{myCommitmentBadge}</Text>
              )}
            </View>
            <Text
              style={{ color: theme.textColor, fontSize: isLarge ? 20 : 16, fontWeight: '700', lineHeight: isLarge ? 26 : 22 }}
              numberOfLines={2}
            >
              {plan.title}
            </Text>
          </View>
          <StatusPill status={plan.status} />
        </View>

        {/* Date/time for locked plans */}
        {plan.status === 'locked' && lockedDate && (
          <View className="mb-3">
            <Text style={{ color: theme.textColor, opacity: 0.8, fontSize: 13, fontWeight: '600' }}>
              📅 {lockedDate} · {lockedTime}
            </Text>
            {plan.location && (
              <Text style={{ color: theme.textColor, opacity: 0.7, fontSize: 12, marginTop: 2 }}>
                📍 {plan.location}
              </Text>
            )}
          </View>
        )}

        {/* Bottom row: avatar cluster + count */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text style={{ color: theme.textColor, opacity: 0.8, fontSize: 12, fontWeight: '600' }}>
              {inCount} of {inviteeCount} in 🔥
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
