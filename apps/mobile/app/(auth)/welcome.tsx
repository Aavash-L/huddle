import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import DesktopWelcome from '@/components/desktop/DesktopWelcome';

const TAGLINE = "Plans go to die in the group chat.";
const TAGLINE_2 = "Huddle is where they actually happen.";

function FloatingEmoji({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-20, { duration: 2000 + delay * 500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(1, { duration: 1500 + delay * 300 }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        style,
        {
          position: 'absolute',
          left: `${x * 100}%` as any,
          top: `${y * 100}%` as any,
          fontSize: 32,
          zIndex: 0,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function WelcomeScreen() {
  const { isDesktop } = useBreakpoint();
  if (isDesktop) return <DesktopWelcome />;

  return (
    <View className="flex-1 bg-[#0F2027] overflow-hidden">
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Floating emoji decoration */}
      <FloatingEmoji emoji="🍕" delay={0} x={0.1} y={0.15} />
      <FloatingEmoji emoji="🎉" delay={1} x={0.75} y={0.2} />
      <FloatingEmoji emoji="🎸" delay={2} x={0.6} y={0.45} />
      <FloatingEmoji emoji="🌮" delay={0.5} x={0.08} y={0.55} />
      <FloatingEmoji emoji="🍻" delay={1.5} x={0.85} y={0.6} />
      <FloatingEmoji emoji="🎬" delay={3} x={0.3} y={0.08} />

      <View className="flex-1 justify-end px-6 pb-16 z-10">
        {/* Logo / app name */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text className="text-7xl font-bold text-white mb-2">
            🤝
          </Text>
          <Text className="text-5xl font-bold text-white tracking-tight">
            Huddle
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View entering={FadeInDown.delay(400).springify()} className="mt-6 mb-12">
          <Text className="text-xl text-white/70 leading-8 font-medium">
            {TAGLINE}
          </Text>
          <Text className="text-xl text-white font-bold leading-8">
            {TAGLINE_2}
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(600).springify()} className="gap-4">
          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            className="bg-white rounded-2xl py-4 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-[#0F2027] text-lg font-bold">
              Get Started
            </Text>
          </TouchableOpacity>

          <Text className="text-white/40 text-center text-sm">
            By continuing, you agree to our Terms & Privacy Policy.{'\n'}
            No email. No password. Just your phone number.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
