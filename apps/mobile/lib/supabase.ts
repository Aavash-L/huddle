import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Secure storage adapter for Supabase auth tokens ─────────
// Uses expo-secure-store on native, localStorage on web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ─── Type-safe query helpers ──────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          avatar_url: string | null;
          reliability_score: number;
          never_bail_streak: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      plans: {
        Row: {
          id: string;
          title: string;
          type: string;
          theme: string;
          status: string;
          creator_id: string;
          crew_id: string | null;
          locked_datetime: string | null;
          location: string | null;
          activity: string | null;
          quorum_n: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
      };
      commitments: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          status: 'in' | 'wavering' | 'out';
          reason: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['commitments']['Row'], 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['commitments']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      availability: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string | null;
          response_token: string | null;
          time_window: { date: string; slot: string };
          available: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['availability']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['availability']['Insert']>;
      };
    };
  };
};

// Realtime channel builder for a specific plan
export function getPlanChannel(planId: string) {
  return supabase.channel(`plan:${planId}`);
}
