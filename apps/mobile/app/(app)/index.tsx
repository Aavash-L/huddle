import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import PlanCard from '@/components/PlanCard';
import type { Plan, PlanStatus } from '@huddle/shared';
import { PLAN_STATUSES } from '@huddle/shared';

const STATUS_ORDER: PlanStatus[] = ['locked', 'converging', 'gathering', 'happened'];

interface PlanWithMeta extends Plan {
  creator_name: string;
  in_count: number;
  invitee_count: number;
  my_commitment: 'in' | 'wavering' | 'out' | null;
}

function SectionHeader({ status, count }: { status: PlanStatus; count: number }) {
  const meta = PLAN_STATUSES[status];
  return (
    <View className="flex-row items-center gap-2 px-4 mb-3 mt-2">
      <Text className="text-base">{meta.emoji}</Text>
      <Text className="text-white/60 text-sm font-semibold uppercase tracking-wider">
        {meta.label}
      </Text>
      <View className="bg-white/10 rounded-full px-2 py-0.5">
        <Text className="text-white/50 text-xs font-bold">{count}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        creator:users!creator_id(name),
        plan_invitees(user_id),
        commitments(user_id, status)
      `)
      .or(`creator_id.eq.${session.user.id},plan_invitees.user_id.eq.${session.user.id}`)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
      return;
    }

    const mapped: PlanWithMeta[] = (data ?? []).map((p: any) => {
      const commitments = p.commitments ?? [];
      const myCommitment = commitments.find((c: any) => c.user_id === session.user.id);
      const inCount = commitments.filter((c: any) => c.status === 'in').length;

      return {
        ...p,
        creator_name: p.creator?.name ?? 'Someone',
        in_count: inCount,
        invitee_count: p.plan_invitees?.length ?? 0,
        my_commitment: myCommitment?.status ?? null,
      };
    });

    setPlans(mapped);
  }, []);

  useEffect(() => {
    fetchPlans().finally(() => setLoading(false));
  }, [fetchPlans]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  };

  // Group by status
  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const group = plans.filter((p) => p.status === status);
    if (group.length > 0) acc.push({ status, plans: group });
    return acc;
  }, [] as { status: PlanStatus; plans: PlanWithMeta[] }[]);

  // Next locked plan for pinned card
  const nextLockedPlan = plans
    .filter((p) => p.status === 'locked' && p.locked_datetime)
    .sort((a, b) =>
      new Date(a.locked_datetime!).getTime() - new Date(b.locked_datetime!).getTime()
    )[0];

  const isEmpty = plans.length === 0 && !loading;

  return (
    <View className="flex-1 bg-[#0F1117]">
      <StatusBar barStyle="light-content" />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={['#0F2027', '#203A43']}
          className="pt-14 pb-6 px-4"
        >
          <Text className="text-white/50 text-sm font-medium">
            Hey {user?.name?.split(' ')[0] ?? 'there'} 👋
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            Your Huddles
          </Text>
        </LinearGradient>

        {/* Pinned: Next locked plan */}
        {nextLockedPlan && (
          <Animated.View entering={FadeInDown.springify()} className="mx-4 mt-4 mb-2">
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              🔒 Up Next
            </Text>
            <PlanCard
              plan={nextLockedPlan}
              myCommitment={nextLockedPlan.my_commitment}
              inCount={nextLockedPlan.in_count}
              inviteeCount={nextLockedPlan.invitee_count}
              onPress={() => router.push(`/(app)/plan/${nextLockedPlan.id}`)}
              size="large"
            />
          </Animated.View>
        )}

        {/* Empty state */}
        {isEmpty && (
          <Animated.View entering={FadeInDown.delay(200).springify()} className="items-center px-6 py-16">
            <Text className="text-6xl mb-4">🤷</Text>
            <Text className="text-white text-xl font-bold text-center mb-2">
              No huddles yet
            </Text>
            <Text className="text-white/50 text-base text-center">
              Stop saying "we should hang out" and actually make it happen.
            </Text>
          </Animated.View>
        )}

        {/* Grouped plan lists */}
        {grouped.map(({ status, plans: groupPlans }) => (
          <View key={status} className="mt-4">
            <SectionHeader status={status} count={groupPlans.length} />
            {groupPlans.map((plan, index) => (
              <Animated.View
                key={plan.id}
                entering={FadeInDown.delay(index * 50).springify()}
                className="mx-4 mb-3"
              >
                <PlanCard
                  plan={plan}
                  myCommitment={plan.my_commitment}
                  inCount={plan.in_count}
                  inviteeCount={plan.invitee_count}
                  onPress={() => router.push(`/(app)/plan/${plan.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* FAB: New Huddle */}
      <View className="absolute bottom-24 right-5">
        <TouchableOpacity
          onPress={() => router.push('/(app)/plan/new')}
          className="bg-[#667EEA] rounded-full w-16 h-16 items-center justify-center shadow-lg"
          activeOpacity={0.85}
          style={{
            shadowColor: '#667EEA',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text className="text-white text-3xl font-light">＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
