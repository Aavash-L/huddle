import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown, useSharedValue, withSpring, useAnimatedStyle,
  withSequence, withDelay,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { usePlan } from '@/hooks/usePlan';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { THEMES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';
import { trackPlanLocked } from '@/lib/posthog';

export default function LockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDesktop } = useBreakpoint();
  const { plan, commitments, lockPlan, loading } = usePlan(id ?? '');

  const [date, setDate] = useState(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState(plan?.location ?? '');
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const confettiRef = useRef<any>(null);
  const lockScale = useSharedValue(1);
  const lockOpacity = useSharedValue(0);

  const theme = plan ? (THEMES[plan.theme as CrewTheme] ?? THEMES.ocean) : THEMES.ocean;
  const inCount = commitments.filter((c) => c.status === 'in').length;

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
    opacity: lockOpacity.value,
  }));

  const handleLock = async () => {
    if (locking) return;
    setLocking(true);
    setErrorMsg(null);

    const { error } = await lockPlan(date.toISOString(), location.trim() || undefined);

    if (error) {
      setErrorMsg(error);
      setLocking(false);
      return;
    }

    setLocked(true);

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    lockOpacity.value = 1;
    lockScale.value = withSequence(
      withSpring(1.5, { damping: 6, stiffness: 200 }),
      withDelay(200, withSpring(1, { damping: 8 }))
    );

    setTimeout(() => { confettiRef.current?.start(); }, 100);

    if (Platform.OS !== 'web') {
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 300);
    }

    trackPlanLocked({
      plan_id: id ?? '',
      days_to_lock: Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      in_count: inCount,
      wavering_count: commitments.filter((c) => c.status === 'wavering').length,
      has_activity: !!plan?.activity,
      has_location: !!location.trim(),
    });

    setTimeout(() => { router.replace(`/(app)/plan/${id}`); }, 2500);
  };

  // Local datetime string for web input (datetime-local format = YYYY-MM-DDTHH:mm)
  const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const minIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <View className="flex-1 bg-[#0F1117]">
      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut
        fallSpeed={3000}
        colors={['#667EEA', '#764BA2', '#F857A6', '#FF5858', '#38EF7D', '#FFE66D']}
      />

      <LinearGradient
        colors={theme.gradient as [string, string]}
        style={{ paddingTop: isDesktop ? 20 : 56, paddingBottom: 24, paddingHorizontal: 16 }}
      >
        {!locked && (
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
            <Text className="text-white/80">← Back</Text>
          </TouchableOpacity>
        )}
        <Text className="text-white text-2xl font-bold">
          {locked ? '🔒 LOCKED!' : 'Lock It In'}
        </Text>
        {!locked && (
          <Text className="text-white/70 text-sm mt-1">
            {inCount} {inCount === 1 ? 'person is' : 'people are'} in. Make it real.
          </Text>
        )}
      </LinearGradient>

      {locked ? (
        <View className="flex-1 items-center justify-center px-6">
          <Animated.Text style={[lockStyle, { fontSize: 80, textAlign: 'center' }]}>
            🔒
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(400).springify()} className="items-center mt-6">
            <Text className="text-white text-3xl font-bold text-center mb-2">It's HAPPENING!</Text>
            <Text className="text-white/70 text-base text-center">
              {formattedDate} at {formattedTime}
              {location ? `\n📍 ${location}` : ''}
            </Text>
            <Text className="text-white/50 text-sm mt-4 text-center">
              {inCount} people are counting on this 🔥
            </Text>
          </Animated.View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 24,
            maxWidth: isDesktop ? 560 : undefined,
            alignSelf: isDesktop ? 'center' as any : undefined,
            width: '100%',
          }}
        >
          <Animated.View entering={FadeInDown.springify()}>
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Date &amp; Time
            </Text>
            <View className="bg-white/10 rounded-2xl p-4 mb-4">
              {Platform.OS === 'web' ? (
                // Web: native datetime-local input
                <input
                  type="datetime-local"
                  value={localIso}
                  min={minIso}
                  onChange={(e) => {
                    if (e.target.value) setDate(new Date(e.target.value));
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: 16,
                    width: '100%',
                    colorScheme: 'dark',
                    outline: 'none',
                    cursor: 'pointer',
                  } as any}
                />
              ) : Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display="inline"
                  minimumDate={new Date()}
                  onChange={(_, d) => d && setDate(d)}
                  style={{ height: 300 }}
                  themeVariant="dark"
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="flex-row justify-between items-center py-2"
                  >
                    <Text className="text-white">📅 {formattedDate}</Text>
                    <Text className="text-white/40">Change →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="flex-row justify-between items-center py-2 mt-2 border-t border-white/10"
                  >
                    <Text className="text-white">🕗 {formattedTime}</Text>
                    <Text className="text-white/40">Change →</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={date}
                      mode="time"
                      display="default"
                      onChange={(_, d) => { setShowTimePicker(false); if (d) setDate(d); }}
                    />
                  )}
                </>
              )}
            </View>

            <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Location (optional)
            </Text>
            <View className="bg-white/10 rounded-2xl px-4 py-3 mb-4">
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Where's it happening?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ color: 'white', fontSize: 16 }}
              />
            </View>

            {errorMsg && (
              <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-400 text-sm">{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleLock}
              disabled={locking}
              className="rounded-2xl overflow-hidden mb-4"
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-5 items-center justify-center"
              >
                {locking ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <Text className="text-white text-xl font-bold">🔒 Lock It In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text className="text-white/30 text-sm text-center">
              Everyone in the group will be notified immediately.
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
