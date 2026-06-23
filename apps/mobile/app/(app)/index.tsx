import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePlans, type PlanWithMeta } from '@/hooks/usePlans';
import DesktopHome from '@/components/desktop/DesktopHome';
import PlanCard from '@/components/PlanCard';
import type { PlanStatus } from '@huddle/shared';
import { PLAN_STATUSES } from '@huddle/shared';

const STATUS_ORDER: PlanStatus[] = ['locked', 'converging', 'gathering', 'happened'];

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

function MobileHome() {
  const { user } = useAuth();
  const { plans, loading, refreshing, refresh: handleRefresh } = usePlans();

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const group = plans.filter((p) => p.status === status);
    if (group.length > 0) acc.push({ status, plans: group });
    return acc;
  }, [] as { status: PlanStatus; plans: PlanWithMeta[] }[]);

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

      {/* FAB */}
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

export default function HomeScreen() {
  const { isDesktop } = useBreakpoint();
  if (isDesktop) return <DesktopHome />;
  return <MobileHome />;
}
