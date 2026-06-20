// ============================================================
// Huddle — Home Screen Widget Module
// ============================================================
// This module provides a home screen widget showing "Your next Huddle"
// using Expo's widget support (WidgetKit on iOS, App Widgets on Android).
//
// NOTE: Full native widget implementation requires native code via
// Expo Modules API or a custom Expo plugin. This file provides:
//  1. The data-sync logic to keep widget data current
//  2. TypeScript types for widget data
//  3. Configuration constants
//
// The actual WidgetKit Swift code lives in the iOS target, and
// the Android Glance code lives in the Android module.
// See the expo plugin at ./plugin/index.js for build-time setup.
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';

export const WIDGET_DATA_KEY = 'huddle_widget_data';

export interface WidgetPlanData {
  id: string;
  title: string;
  theme: string;
  status: 'gathering' | 'converging' | 'locked' | 'happened';
  locked_datetime: string | null;
  location: string | null;
  in_count: number;
  total_count: number;
  emoji: string;
  days_until: number | null;
}

export interface WidgetData {
  next_plan: WidgetPlanData | null;
  updated_at: string;
}

// Sync the next upcoming locked plan to widget storage
export async function syncWidgetData(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const now = new Date();

    // Find the next locked plan
    const { data: plans } = await supabase
      .from('plans')
      .select(`
        id, title, theme, status, locked_datetime, location, type,
        plan_invitees(user_id),
        commitments(user_id, status)
      `)
      .eq('status', 'locked')
      .gte('locked_datetime', now.toISOString())
      .or(`creator_id.eq.${session.user.id},plan_invitees.user_id.eq.${session.user.id}`)
      .order('locked_datetime', { ascending: true })
      .limit(1);

    const plan = plans?.[0];

    const widgetData: WidgetData = {
      next_plan: plan
        ? {
            id: plan.id,
            title: plan.title,
            theme: plan.theme,
            status: plan.status,
            locked_datetime: plan.locked_datetime,
            location: plan.location,
            in_count: (plan.commitments as any[]).filter((c: any) => c.status === 'in').length,
            total_count: (plan.plan_invitees as any[]).length,
            emoji: getPlanEmoji(plan.type),
            days_until: plan.locked_datetime
              ? Math.ceil(
                  (new Date(plan.locked_datetime).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
          }
        : null,
      updated_at: now.toISOString(),
    };

    await SecureStore.setItemAsync(WIDGET_DATA_KEY, JSON.stringify(widgetData));
  } catch (err) {
    console.error('Widget sync error:', err);
  }
}

function getPlanEmoji(type: string): string {
  const emojis: Record<string, string> = {
    hangout: '🛋️',
    dinner: '🍽️',
    activity: '🎯',
    trip: '✈️',
    party: '🎉',
    other: '📅',
  };
  return emojis[type] ?? '📅';
}

// Widget configuration for app.json
export const WIDGET_CONFIG = {
  ios: {
    extensionName: 'HuddleWidget',
    bundleIdentifier: 'app.huddle.mobile.widget',
    displayName: 'Huddle',
    description: "See your next Huddle at a glance",
    supportedFamilies: ['systemSmall', 'systemMedium'] as const,
  },
  android: {
    name: 'HuddleWidget',
    minWidth: 2,
    minHeight: 1,
    targetWidth: 4,
    targetHeight: 2,
    updatePeriodMillis: 30 * 60 * 1000, // 30 minutes
  },
};
