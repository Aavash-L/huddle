// Web shim — home screen widgets are native-only.
// Re-exports types and constants; syncWidgetData is a no-op.

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

export async function syncWidgetData(): Promise<void> {}

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
    updatePeriodMillis: 30 * 60 * 1000,
  },
};
