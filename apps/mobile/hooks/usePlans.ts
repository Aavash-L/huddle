import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Plan, PlanStatus } from '@huddle/shared';

export interface PlanWithMeta extends Plan {
  creator_name: string;
  in_count: number;
  invitee_count: number;
  my_commitment: 'in' | 'wavering' | 'out' | null;
}

export function usePlans() {
  const [plans, setPlans] = useState<PlanWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

    if (error) { console.error('usePlans:', error); return; }

    const mapped: PlanWithMeta[] = (data ?? []).map((p: any) => {
      const cs = p.commitments ?? [];
      const mine = cs.find((c: any) => c.user_id === session.user.id);
      return {
        ...p,
        creator_name: p.creator?.name ?? 'Someone',
        in_count: cs.filter((c: any) => c.status === 'in').length,
        invitee_count: p.plan_invitees?.length ?? 0,
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
