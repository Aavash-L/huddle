import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  // Allow profile-setup even when authenticated (AppLayout redirects here when name is missing)
  if (session && !pathname.endsWith('/profile-setup')) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0F2027' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
