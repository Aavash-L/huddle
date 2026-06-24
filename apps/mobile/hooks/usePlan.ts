import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Plan,
  Commitment,
  CommitmentWithUser,
  Availability,
  Message,
  MessageWithUser,
  Suggestion,
  UserPublic,
} from '@huddle/shared';

interface PlanState {
  plan: Plan | null;
  commitments: CommitmentWithUser[];
  availability: Availability[];
  messages: MessageWithUser[];
  suggestions: Suggestion[];
  creator: UserPublic | null;
  webInCount: number;
  loading: boolean;
  error: string | null;
}

interface PlanActions {
  refresh: () => Promise<void>;
  sendMessage: (body: string) => Promise<{ error?: string }>;
  submitCommitment: (status: 'in' | 'wavering' | 'out', reason?: string) => Promise<{ error?: string }>;
  submitAvailability: (slots: { date: string; slot: string }[], available: boolean) => Promise<{ error?: string }>;
  lockPlan: (datetime: string, location?: string) => Promise<{ error?: string }>;
  voteForSuggestion: (suggestionId: string) => Promise<{ error?: string }>;
  cancelVote: (suggestionId: string) => Promise<{ error?: string }>;
}

export function usePlan(planId: string): PlanState & PlanActions {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [commitments, setCommitments] = useState<CommitmentWithUser[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [creator, setCreator] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webInCount, setWebInCount] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── Initial data fetch ──────────────────────────────────────
  const fetchPlanData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [planRes, commitmentsRes, availRes, messagesRes, suggestionsRes] = await Promise.all([
        supabase
          .from('plans')
          .select('*, creator:users!creator_id(id, name, avatar_url, reliability_score, never_bail_streak)')
          .eq('id', planId)
          .single(),

        supabase
          .from('commitments')
          .select('*, user:users(id, name, avatar_url, reliability_score, never_bail_streak)')
          .eq('plan_id', planId)
          .order('updated_at', { ascending: false }),

        supabase
          .from('availability')
          .select('*')
          .eq('plan_id', planId)
          .eq('available', true),

        supabase
          .from('messages')
          .select('*, user:users(id, name, avatar_url, reliability_score, never_bail_streak)')
          .eq('plan_id', planId)
          .order('created_at', { ascending: true })
          .limit(100),

        supabase
          .from('suggestions')
          .select('*')
          .eq('plan_id', planId)
          .order('votes', { ascending: false }),
      ]);

      if (planRes.error) throw new Error(planRes.error.message);

      const planData = planRes.data as any;
      setCreator(planData.creator ?? null);
      const { creator: _c, ...planOnly } = planData;
      setPlan(planOnly as Plan);

      setCommitments((commitmentsRes.data ?? []) as unknown as CommitmentWithUser[]);
      setAvailability((availRes.data ?? []) as Availability[]);
      setMessages((messagesRes.data ?? []) as unknown as MessageWithUser[]);
      setSuggestions((suggestionsRes.data ?? []) as Suggestion[]);

      // Web RSVPs from anonymous plan_invitees
      const { data: webRows } = await supabase
        .from('plan_invitees')
        .select('rsvp')
        .eq('plan_id', planId)
        .is('user_id', null);
      setWebInCount((webRows ?? []).filter((r: any) => r.rsvp === 'in').length);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  // ─── Realtime subscriptions ───────────────────────────────────
  useEffect(() => {
    fetchPlanData();

    // Set up realtime channel
    const channel = supabase
      .channel(`plan:${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commitments',
          filter: `plan_id=eq.${planId}`,
        },
        async (payload) => {
          // Re-fetch commitments with user data when any commitment changes
          const { data } = await supabase
            .from('commitments')
            .select('*, user:users(id, name, avatar_url, reliability_score, never_bail_streak)')
            .eq('plan_id', planId)
            .order('updated_at', { ascending: false });

          if (data) {
            setCommitments(data as unknown as CommitmentWithUser[]);
          }

          // Also refresh plan status (quorum trigger may have changed it)
          const { data: updatedPlan } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single();

          if (updatedPlan) {
            setPlan(updatedPlan as Plan);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `plan_id=eq.${planId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          // Fetch with user data
          const { data } = await supabase
            .from('messages')
            .select('*, user:users(id, name, avatar_url, reliability_score, never_bail_streak)')
            .eq('id', newMsg.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as unknown as MessageWithUser]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability',
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase
            .from('availability')
            .select('*')
            .eq('plan_id', planId)
            .eq('available', true);

          if (data) {
            setAvailability(data as Availability[]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase
            .from('suggestions')
            .select('*')
            .eq('plan_id', planId)
            .order('votes', { ascending: false });

          if (data) {
            setSuggestions(data as Suggestion[]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plans',
          filter: `id=eq.${planId}`,
        },
        (payload) => {
          setPlan(payload.new as Plan);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_invitees',
          filter: `plan_id=eq.${planId}`,
        },
        async () => {
          const { data } = await supabase
            .from('plan_invitees')
            .select('rsvp')
            .eq('plan_id', planId)
            .is('user_id', null);
          setWebInCount((data ?? []).filter((r: any) => r.rsvp === 'in').length);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [planId, fetchPlanData]);

  // ─── Actions ──────────────────────────────────────────────────
  const sendMessage = useCallback(async (body: string): Promise<{ error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const { error: insertError } = await supabase.from('messages').insert({
      plan_id: planId,
      user_id: session.user.id,
      body: body.trim(),
    });

    return insertError ? { error: insertError.message } : {};
  }, [planId]);

  const submitCommitment = useCallback(async (
    status: 'in' | 'wavering' | 'out',
    reason?: string
  ): Promise<{ error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const { error: upsertError } = await supabase.from('commitments').upsert(
      {
        plan_id: planId,
        user_id: session.user.id,
        status,
        reason: reason ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,user_id' }
    );

    return upsertError ? { error: upsertError.message } : {};
  }, [planId]);

  const submitAvailability = useCallback(async (
    slots: { date: string; slot: string }[],
    available: boolean
  ): Promise<{ error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const rows = slots.map((slot) => ({
      plan_id: planId,
      user_id: session.user.id,
      time_window: slot,
      available,
    }));

    // Delete existing availability for these slots
    for (const slot of slots) {
      await supabase
        .from('availability')
        .delete()
        .eq('plan_id', planId)
        .eq('user_id', session.user.id)
        .contains('time_window', slot);
    }

    const { error: insertError } = await supabase.from('availability').insert(rows);
    return insertError ? { error: insertError.message } : {};
  }, [planId]);

  const lockPlan = useCallback(async (
    datetime: string,
    location?: string
  ): Promise<{ error?: string }> => {
    const { error: updateError } = await supabase
      .from('plans')
      .update({
        status: 'locked',
        locked_datetime: datetime,
        location: location ?? null,
      })
      .eq('id', planId);

    return updateError ? { error: updateError.message } : {};
  }, [planId]);

  const voteForSuggestion = useCallback(async (
    suggestionId: string
  ): Promise<{ error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const { error } = await supabase.from('suggestion_votes').insert({
      suggestion_id: suggestionId,
      user_id: session.user.id,
    });

    return error ? { error: error.message } : {};
  }, []);

  const cancelVote = useCallback(async (
    suggestionId: string
  ): Promise<{ error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('suggestion_votes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', session.user.id);

    return error ? { error: error.message } : {};
  }, []);

  return {
    plan,
    commitments,
    availability,
    messages,
    suggestions,
    creator,
    webInCount,
    loading,
    error,
    refresh: fetchPlanData,
    sendMessage,
    submitCommitment,
    submitAvailability,
    lockPlan,
    voteForSuggestion,
    cancelVote,
  };
}
