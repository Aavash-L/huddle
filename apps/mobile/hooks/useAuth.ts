import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { User as HuddleUser } from '@huddle/shared';
import { identifyUser } from '@/lib/posthog';
import { identifyUser as rcIdentifyUser } from '@/lib/revenuecat';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';

interface AuthState {
  session: Session | null;
  user: HuddleUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  sendOTP: (phone: string) => Promise<{ error?: string }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error?: string; isNewUser?: boolean }>;
  updateProfile: (updates: { name: string; avatar_url?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<HuddleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full user profile from our users table
  const fetchUserProfile = useCallback(async (authUser: User): Promise<void> => {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError);
      return;
    }

    if (data) {
      setUser(data as HuddleUser);
      // Identify in analytics
      identifyUser(authUser.id, {
        name: data.name,
        phone: data.phone,
        reliability_score: data.reliability_score,
        created_at: data.created_at,
      });
      // Identify in RevenueCat
      rcIdentifyUser(authUser.id);
    } else {
      // New user — create profile skeleton
      const phone = authUser.phone ?? '';
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ id: authUser.id, phone })
        .select()
        .single();

      if (!insertError && newUser) {
        setUser(newUser as HuddleUser);
      }
    }
  }, []);

  // Set up auth state listener on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchUserProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchUserProfile(newSession.user);
          // Register push notifications on sign in
          const token = await registerForPushNotifications();
          if (token && newSession.user.id) {
            await savePushToken(newSession.user.id, token);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // ─── Send OTP ──────────────────────────────────────────────
  const sendOTP = useCallback(async (phone: string): Promise<{ error?: string }> => {
    setError(null);
    // Normalize phone to E.164
    const normalized = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalized,
    });

    if (otpError) {
      setError(otpError.message);
      return { error: otpError.message };
    }

    return {};
  }, []);

  // ─── Verify OTP ────────────────────────────────────────────
  const verifyOTP = useCallback(async (
    phone: string,
    token: string
  ): Promise<{ error?: string; isNewUser?: boolean }> => {
    setError(null);
    const normalized = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalized,
      token,
      type: 'sms',
    });

    if (verifyError) {
      setError(verifyError.message);
      return { error: verifyError.message };
    }

    if (!data.user) {
      return { error: 'Verification failed — no user returned' };
    }

    // Check if user profile exists (new vs returning)
    const { data: profile } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', data.user.id)
      .single();

    const isNewUser = !profile || !profile.name;
    return { isNewUser };
  }, []);

  // ─── Update profile ────────────────────────────────────────
  const updateProfile = useCallback(async (updates: {
    name: string;
    avatar_url?: string;
  }): Promise<{ error?: string }> => {
    if (!session?.user) return { error: 'Not authenticated' };

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id);

    if (updateError) {
      return { error: updateError.message };
    }

    // Refresh local state
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
    return {};
  }, [session]);

  // ─── Sign out ──────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // ─── Refresh user profile ──────────────────────────────────
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!session?.user) return;
    await fetchUserProfile(session.user);
  }, [session, fetchUserProfile]);

  return {
    session,
    user,
    loading,
    error,
    sendOTP,
    verifyOTP,
    updateProfile,
    signOut,
    refreshUser,
  };
}
