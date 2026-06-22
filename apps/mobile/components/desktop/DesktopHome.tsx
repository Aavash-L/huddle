import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { usePlans, type PlanWithMeta } from '@/hooks/usePlans';
import AvatarCluster from '@/components/AvatarCluster';
import PlanCard from '@/components/PlanCard';
import { THEMES, PLAN_STATUSES, PLAN_TYPES } from '@huddle/shared';
import type { PlanStatus, CrewTheme } from '@huddle/shared';

const STATUS_ORDER: PlanStatus[] = ['locked', 'converging', 'gathering', 'happened'];

function StatusPill({ status }: { status: string }) {
  const meta = PLAN_STATUSES[status as keyof typeof PLAN_STATUSES];
  if (!meta) return null;

  const colors: Record<string, [string, string]> = {
    gathering: ['rgba(59,130,246,0.18)', '#93C5FD'],
    converging: ['rgba(234,179,8,0.18)', '#FDE047'],
    locked: ['rgba(34,197,94,0.18)', '#86EFAC'],
    happened: ['rgba(156,163,175,0.18)', '#D1D5DB'],
    cancelled: ['rgba(239,68,68,0.18)', '#FCA5A5'],
  };
  const [bg, text] = colors[status] ?? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.7)'];

  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
      <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{meta.label}</Text>
    </View>
  );
}

function PlanDetailPane({ planId }: { planId: string }) {
  const { user } = useAuth();
  const { plan, commitments, creator, messages, loading, submitCommitment } = usePlan(planId);

  if (loading) {
    return (
      <View style={[styles.detailPane, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#667EEA" size="large" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.detailPane, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Plan not found</Text>
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
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : null;
  const lockedTime = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null;

  const commitBg: Record<string, string> = {
    in: 'rgba(34,197,94,0.14)',
    wavering: 'rgba(251,191,36,0.14)',
    out: 'rgba(239,68,68,0.14)',
  };
  const commitBorder: Record<string, string> = {
    in: '#22C55E',
    wavering: '#FBBF24',
    out: '#EF4444',
  };
  const commitLabels: Record<string, string> = {
    in: "I'm In ✅",
    wavering: "Maybe 🤔",
    out: "Can't Go ❌",
  };

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.detailPane}>
      {/* Themed header */}
      <LinearGradient
        colors={theme.gradient as [string, string]}
        style={styles.detailHeader}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>
              {PLAN_TYPES[plan.type as keyof typeof PLAN_TYPES]?.emoji ?? '📅'}
            </Text>
            <Text style={styles.planTitle} numberOfLines={2}>{plan.title}</Text>
            <Text style={styles.planCreator}>by {creator?.name ?? 'Unknown'}</Text>
          </View>
          <StatusPill status={plan.status} />
        </View>

        {plan.status === 'locked' && plan.locked_datetime && (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedDate}>📅 {lockedDate}</Text>
            <Text style={styles.lockedTime}>
              🕗 {lockedTime}{plan.location ? ` · 📍 ${plan.location}` : ''}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator
      >
        {/* Who's in */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Who's in</Text>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                {inCount} of {commitments.length} are in 🔥
              </Text>
              {waveringCount > 0 && (
                <Text style={{ color: '#FBBF24', fontSize: 13 }}>{waveringCount} maybe</Text>
              )}
            </View>
            <AvatarCluster inUsers={inUsers} waveringUsers={waveringUsers} size="large" />
          </View>
        </View>

        {/* Are you in? */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Are you in?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['in', 'wavering', 'out'] as const).map((s) => {
              const isSelected = myCommitment?.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => submitCommitment(s)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    backgroundColor: isSelected ? commitBg[s] : 'rgba(255,255,255,0.04)',
                    borderColor: isSelected ? commitBorder[s] : 'rgba(255,255,255,0.09)',
                    cursor: 'pointer' as any,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {commitLabels[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Actions</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { emoji: '📅', label: 'Availability', path: `/(app)/plan/${planId}/availability` },
              { emoji: '💬', label: 'Chat', path: `/(app)/plan/${planId}/chat` },
              { emoji: '🤖', label: 'AI Ideas', path: `/(app)/plan/${planId}/ai-suggestions` },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                onPress={() => router.push(a.path as any)}
                style={styles.actionBtn}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22, marginBottom: 4 }}>{a.emoji}</Text>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lock It In */}
        {isCreator && plan.status !== 'locked' && plan.status !== 'happened' && (
          <View style={[styles.section, { paddingBottom: 0 }]}>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/plan/${planId}/lock` as any)}
              style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer' as any }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 15, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>🔒 Lock It In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Bail */}
        {myCommitment?.status === 'in' && plan.status === 'locked' && (
          <View style={[styles.section, { paddingBottom: 0 }]}>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/plan/${planId}/bail` as any)}
              style={{ paddingVertical: 12, alignItems: 'center', cursor: 'pointer' as any }}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13 }}>
                Something came up? Let the group know →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent chat preview */}
        {messages.length > 0 && (
          <View style={[styles.section, { marginTop: 4 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionLabel}>Recent chat</Text>
              <TouchableOpacity
                onPress={() => router.push(`/(app)/plan/${planId}/chat` as any)}
                style={{ cursor: 'pointer' as any }}
              >
                <Text style={{ color: '#667EEA', fontSize: 12 }}>See all →</Text>
              </TouchableOpacity>
            </View>
            {messages.slice(-4).map((msg) => (
              <View key={msg.id} style={{ marginBottom: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 2 }}>
                  {(msg as any).user?.name ?? 'Unknown'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                  {msg.body}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function EmptyDetail() {
  return (
    <View style={[styles.detailPane, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>👈</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
        Select a huddle
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
        Pick one from the list to see details
      </Text>
    </View>
  );
}

export default function DesktopHome() {
  const { user } = useAuth();
  const { plans, loading, refreshing, refresh: handleRefresh } = usePlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const group = plans.filter((p) => p.status === status);
    if (group.length > 0) acc.push({ status, plans: group });
    return acc;
  }, [] as { status: PlanStatus; plans: PlanWithMeta[] }[]);

  const nextLocked = plans
    .filter((p) => p.status === 'locked' && p.locked_datetime)
    .sort((a, b) => new Date(a.locked_datetime!).getTime() - new Date(b.locked_datetime!).getTime())[0];

  return (
    <View style={styles.root}>
      {/* Plan list pane */}
      <View style={styles.listPane}>
        {/* Header */}
        <LinearGradient colors={['#0F2027', '#1a2f3a']} style={styles.listHeader}>
          <Text style={styles.listHeaderSub}>Hey {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.listHeaderTitle}>Your Huddles</Text>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#667EEA" />
            </View>
          )}

          {/* Up Next */}
          {nextLocked && (
            <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={styles.groupLabel}>🔒 Up Next</Text>
              <TouchableOpacity
                onPress={() => setSelectedPlanId(nextLocked.id)}
                activeOpacity={0.85}
                style={[
                  styles.planRow,
                  selectedPlanId === nextLocked.id && styles.planRowSelected,
                ]}
              >
                <PlanCard
                  plan={nextLocked}
                  myCommitment={nextLocked.my_commitment}
                  inCount={nextLocked.in_count}
                  inviteeCount={nextLocked.invitee_count}
                  onPress={() => setSelectedPlanId(nextLocked.id)}
                  size="large"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state */}
          {!loading && plans.length === 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🤷</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                No huddles yet
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                Stop saying "we should hang out"{'\n'}and actually make it happen.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/plan/new' as any)}
                style={styles.emptyBtn}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>＋ New Huddle</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Grouped lists */}
          {grouped.map(({ status, plans: group }) => {
            const meta = PLAN_STATUSES[status];
            return (
              <View key={status} style={{ paddingHorizontal: 12, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13 }}>{meta.emoji}</Text>
                  <Text style={styles.groupLabel}>{meta.label}</Text>
                  <View style={styles.groupCount}>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' }}>{group.length}</Text>
                  </View>
                </View>
                {group.map((plan) => (
                  <Animated.View key={plan.id} entering={FadeInDown.springify()}>
                    <TouchableOpacity
                      onPress={() => setSelectedPlanId(plan.id)}
                      activeOpacity={0.85}
                      style={[
                        styles.planRow,
                        selectedPlanId === plan.id && styles.planRowSelected,
                      ]}
                    >
                      <PlanCard
                        plan={plan}
                        myCommitment={plan.my_commitment}
                        inCount={plan.in_count}
                        inviteeCount={plan.invitee_count}
                        onPress={() => setSelectedPlanId(plan.id)}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Detail pane */}
      {selectedPlanId ? (
        <PlanDetailPane planId={selectedPlanId} />
      ) : (
        <EmptyDetail />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F1117',
  },
  listPane: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'column',
    overflow: 'hidden' as any,
  },
  listHeader: {
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  listHeaderSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  listHeaderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCount: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  planRow: {
    borderRadius: 10,
    marginBottom: 6,
    cursor: 'pointer' as any,
  },
  planRowSelected: {
    backgroundColor: 'rgba(102,126,234,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.3)',
  },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: '#667EEA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    cursor: 'pointer' as any,
  },
  detailPane: {
    flex: 1,
    backgroundColor: '#0F1117',
    overflow: 'hidden' as any,
  },
  detailHeader: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  planTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  planCreator: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  lockedBox: {
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedDate: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  lockedTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 3,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  detailPaneInner: {
    flex: 1,
    backgroundColor: '#0F1117',
    overflow: 'hidden' as any,
  },
});
