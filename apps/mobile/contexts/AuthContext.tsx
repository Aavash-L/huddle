import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
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

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<HuddleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (authUser: User): Promise<void> => {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError);
      // Use a shell so (app)/_layout never sees session+null user simultaneously,
      // which would create a redirect loop with (auth)/_layout.
      setUser((prev) => prev ?? { id: authUser.id, phone: authUser.phone ?? '', name: '', avatar_url: null, reliability_score: 0, never_bail_streak: 0, created_at: '' } as any);
      return;
    }

    if (data) {
      setUser(data as HuddleUser);
      identifyUser(authUser.id, {
        name: data.name,
        phone: data.phone,
        reliability_score: data.reliability_score,
        created_at: data.created_at,
      });
      rcIdentifyUser(authUser.id);
    } else {
      const phone = authUser.phone ?? '';
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ id: authUser.id, phone })
        .select()
        .single();
      if (!insertError && newUser) setUser(newUser as HuddleUser);
    }
  }, []);

  useEffect(() => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; setLoading(false); } };

    // Safety net: force loading=false after 8 s so the app never stays black forever
    const timeout = setTimeout(finish, 8000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchUserProfile(s.user).finally(() => { clearTimeout(timeout); finish(); });
      } else {
        clearTimeout(timeout);
        finish();
      }
    }).catch(() => { clearTimeout(timeout); finish(); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'INITIAL_SESSION') return;
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchUserProfile(newSession.user);
          if (Platform.OS !== 'web') {
            try {
              const token = await registerForPushNotifications();
              if (token && newSession.user.id) await savePushToken(newSession.user.id, token);
            } catch {}
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, [fetchUserProfile]);

  const sendOTP = useCallback(async (phone: string): Promise<{ error?: string }> => {
    setError(null);
    const normalized = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
    if (otpError) { setError(otpError.message); return { error: otpError.message }; }
    return {};
  }, []);

  const verifyOTP = useCallback(async (phone: string, token: string): Promise<{ error?: string; isNewUser?: boolean }> => {
    setError(null);
    const normalized = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: normalized, token, type: 'sms' });
    if (verifyError) { setError(verifyError.message); return { error: verifyError.message }; }
    if (!data.user) return { error: 'Verification failed — no user returned' };
    const { data: profile } = await supabase.from('users').select('id, name').eq('id', data.user.id).single();
    return { isNewUser: !profile || !profile.name };
  }, []);

  const updateProfile = useCallback(async (updates: { name: string; avatar_url?: string }): Promise<{ error?: string }> => {
    if (!session?.user) return { error: 'Not authenticated' };
    const { error: updateError } = await supabase.from('users').update(updates).eq('id', session.user.id);
    if (updateError) return { error: updateError.message };
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
    return {};
  }, [session]);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!session?.user) return;
    await fetchUserProfile(session.user);
  }, [session, fetchUserProfile]);

  return (
    <AuthContext.Provider value={{ session, user, loading, error, sendOTP, verifyOTP, updateProfile, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
