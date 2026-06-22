import { Tabs, Redirect } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import DesktopShell from '@/components/desktop/DesktopShell';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-1 pt-1">
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          color: focused ? '#667EEA' : 'rgba(255,255,255,0.4)',
          fontWeight: focused ? '700' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const { session, loading, user } = useAuth();
  const { isDesktop } = useBreakpoint();

  if (loading) return <View style={{ flex: 1, backgroundColor: '#0A0E14' }} />;
  if (!session) return <Redirect href="/(auth)/welcome" />;

  // No user profile after load → new user or failed fetch; profile-setup handles both
  if (!user || !user.name || /^\d+$/.test(user.name)) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  if (isDesktop) {
    return <DesktopShell />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 72,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
      {/* These routes exist but are not tabs */}
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="trip" options={{ href: null }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
    </Tabs>
  );
}
