import { Platform } from 'react-native';
import { supabase } from './supabase';

// Lazily-imported so native modules never load on web
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants').default | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Permission request + token registration ──────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications || !Device || !Constants) return null;

  if (!Device.isDevice) {
    console.log('Push notifications are only available on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Huddle',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667EEA',
      sound: 'notification.wav',
    });

    await Notifications.setNotificationChannelAsync('plans', {
      name: 'Plan Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#22C55E',
    });
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  if (!projectId) {
    console.error('No EAS project ID found in app.json');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('Expo push token:', tokenData.data);
  return tokenData.data;
}

// ─── Save token to Supabase ───────────────────────────────────

export async function savePushToken(userId: string, token: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android';

  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform },
    { onConflict: 'token' }
  );

  if (error) {
    console.error('Failed to save push token:', error);
  }
}

// ─── Remove token on logout ───────────────────────────────────

export async function removePushToken(token: string): Promise<void> {
  await supabase.from('push_tokens').delete().eq('token', token);
}

// ─── Local notification helpers ───────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  triggerSeconds?: number
): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: triggerSeconds
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
      : null,
  });
}

export async function cancelNotification(id: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  await Notifications.setBadgeCountAsync(0);
}
