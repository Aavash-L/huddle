// Web shim — expo-notifications has no web support.
// All functions are no-ops that return safe defaults.

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function savePushToken(_userId: string, _token: string): Promise<void> {}

export async function removePushToken(_token: string): Promise<void> {}

export async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _data: Record<string, unknown> = {},
  _triggerSeconds?: number
): Promise<string> {
  return '';
}

export async function cancelNotification(_id: string): Promise<void> {}

export async function cancelAllNotifications(): Promise<void> {}

export async function setBadgeCount(_count: number): Promise<void> {}

export async function clearBadge(): Promise<void> {}
