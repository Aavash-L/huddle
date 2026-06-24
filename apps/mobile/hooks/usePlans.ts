import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Plan, PlanStatus } from '@huddle/shared';

export interface PlanWithMeta extends Plan {
  creator_name: string;
  in_count: number;
  invitee_count: number;
  my_commitment: 'in' | 'wavering' | 'out' | null;
}

const PLAN_SELECT = `
  *,
  creator:users!creator_id(name),
  plan_invitees(user_id, rsvp),
  commitments(user_id, status)
`;

export function usePlans() {
  const [plans, setPlans] = useState<PlanWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchPlans = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const uid = session.user.id;

    // Query 1: plans I created
    const { data: created, error: e1 } = await supabase
      .from('plans')
      .select(PLAN_SELECT)
      .eq('creator_id', uid)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false });

    if (e1) console.error('usePlans (created):', e1);

    // Query 2: plan_ids where I'm an invitee
    const { data: inviteRows, error: e2 } = await supabase
      .from('plan_invitees')
      .select('plan_id')
      .eq('user_id', uid);

    if (e2) console.error('usePlans (invites):', e2);

    const invitedIds = (inviteRows ?? []).map((r: any) => r.plan_id as string);

    // Query 3: fetch those invited plans (skip if none)
    let invited: any[] = [];
    if (invitedIds.length > 0) {
      const { data, error: e3 } = await supabase
        .from('plans')
        .select(PLAN_SELECT)
        .in('id', invitedIds)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false });

      if (e3) console.error('usePlans (invited plans):', e3);
      invited = data ?? [];
    }

    // Merge + dedupe (created takes precedence), sort by created_at desc
    const seen = new Set((created ?? []).map((p: any) => p.id));
    const merged = [
      ...(created ?? []),
      ...invited.filter((p: any) => !seen.has(p.id)),
    ].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const mapped: PlanWithMeta[] = merged.map((p: any) => {
      const cs = p.commitments ?? [];
      const invitees = p.plan_invitees ?? [];
      const mine = cs.find((c: any) => c.user_id === uid);
      const webInCount = invitees.filter((pi: any) => pi.user_id === null && pi.rsvp === 'in').length;
      return {
        ...p,
        creator_name: p.creator?.name ?? 'Someone',
        in_count: cs.filter((c: any) => c.status === 'in').length + webInCount,
        invitee_count: invitees.length,
        my_commitment: mine?.status ?? null,
      };
    });

    setPlans(mapped);
  }, []);

  useEffect(() => {
    fetchPlans().finally(() => setLoading(false));

    const channel = supabase
      .channel(`plans-list-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => fetchPlans())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_invitees' }, () => fetchPlans())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commitments' }, () => fetchPlans())
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [fetchPlans]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  };

  return { plans, loading, refreshing, refresh };
}
