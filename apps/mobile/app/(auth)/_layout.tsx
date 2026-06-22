import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { session, loading, user } = useAuth();

  if (loading) return null;

  // Only redirect to the app when the user has a complete profile.
  // If session exists but user.name is missing we're still in onboarding —
  // don't redirect or we create a loop with (app)/_layout → profile-setup.
  const hasProfile = !!user?.name && !/^\d+$/.test(user.name);
  if (session && hasProfile) {
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
