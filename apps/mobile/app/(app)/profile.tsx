import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { usePro } from '@/hooks/usePro';
import ReliabilityBadge from '@/components/ReliabilityBadge';

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View className="flex-1 bg-white/5 rounded-2xl p-4 items-center gap-1">
      <Text className="text-2xl">{emoji}</Text>
      <Text className="text-white text-xl font-bold">{value}</Text>
      <Text className="text-white/50 text-xs text-center">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isPro, isTrialing, trialDaysLeft } = usePro();

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const showsUpPercent = user.reliability_score;

  return (
    <View className="flex-1 bg-[#0F1117]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header gradient */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          className="pt-14 pb-8 px-4 items-center"
        >
          {/* Avatar */}
          <View className="w-24 h-24 rounded-full bg-white/20 overflow-hidden mb-4 border-2 border-white/30">
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Text className="text-4xl">{user.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
          </View>

          <Text className="text-white text-2xl font-bold">{user.name}</Text>
          <Text className="text-white/60 text-sm mt-1">{user.phone}</Text>

          {/* Pro badge */}
          {(isPro || isTrialing) && (
            <View className="mt-3 bg-white/20 rounded-full px-4 py-1.5 flex-row items-center gap-2">
              <Text className="text-base">⭐</Text>
              <Text className="text-white font-bold text-sm">
                {isTrialing ? `Pro Trial — ${trialDaysLeft} days left` : 'Huddle Pro'}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View className="px-4 mt-6">
          {/* Reliability section */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              Your Reputation
            </Text>
            <ReliabilityBadge
              score={user.reliability_score}
              streak={user.never_bail_streak}
              large
            />
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="flex-row gap-3 mt-6 mb-6">
            <StatCard
              label="Reliability Score"
              value={`${user.reliability_score}%`}
              emoji="🎯"
            />
            <StatCard
              label="Never-Bail Streak"
              value={`${user.never_bail_streak} 🔥`}
              emoji="⚡"
            />
          </Animated.View>

          {/* Pro upgrade / manage */}
          {!isPro && !isTrialing ? (
            <Animated.View entering={FadeInDown.delay(300).springify()} className="mb-6">
              <TouchableOpacity
                onPress={() => router.push('/(app)/paywall')}
                className="rounded-2xl overflow-hidden"
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#667EEA', '#764BA2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="p-4 flex-row items-center justify-between"
                >
                  <View>
                    <Text className="text-white font-bold text-base">Upgrade to Pro</Text>
                    <Text className="text-white/70 text-sm">7-day free trial, cancel anytime</Text>
                  </View>
                  <Text className="text-white text-2xl">⭐</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {/* Settings / actions */}
          <Animated.View entering={FadeInDown.delay(400).springify()} className="gap-3">
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Settings
            </Text>

            <TouchableOpacity
              className="bg-white/5 rounded-2xl px-4 py-4 flex-row items-center justify-between"
              onPress={() => router.push('/(auth)/profile-setup')}
            >
              <Text className="text-white font-medium">Edit Profile</Text>
              <Text className="text-white/40">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white/5 rounded-2xl px-4 py-4 flex-row items-center justify-between"
              onPress={handleSignOut}
            >
              <Text className="text-red-400 font-medium">Sign Out</Text>
              <Text className="text-white/40">→</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
