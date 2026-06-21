import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const TAGLINE = "Plans go to die in the group chat.";
const TAGLINE_2 = "Huddle is where they actually happen.";

function FloatingEmoji({
  emoji, delay, x, y, size = 38,
}: {
  emoji: string; delay: number; x: number; y: number; size?: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-18, { duration: 2600 + delay * 550, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.32, { duration: 2100 + delay * 380 }),
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
      entering={FadeIn.delay(delay * 180).duration(900)}
      style={[
        style,
        {
          position: 'absolute',
          left: `${x * 100}%` as any,
          top: `${y * 100}%` as any,
          fontSize: size,
          zIndex: 0,
          pointerEvents: 'none' as any,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function DesktopWelcome() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={StyleSheet.absoluteFillObject}
      />

      <FloatingEmoji emoji="🍕" delay={0}   x={0.06} y={0.12} size={36} />
      <FloatingEmoji emoji="🎉" delay={1}   x={0.82} y={0.08} size={42} />
      <FloatingEmoji emoji="🎸" delay={2}   x={0.74} y={0.52} size={38} />
      <FloatingEmoji emoji="🌮" delay={0.5} x={0.04} y={0.66} size={34} />
      <FloatingEmoji emoji="🍻" delay={1.5} x={0.88} y={0.74} size={40} />
      <FloatingEmoji emoji="🎬" delay={3}   x={0.17} y={0.84} size={36} />
      <FloatingEmoji emoji="🏖️" delay={2.5} x={0.91} y={0.32} size={38} />
      <FloatingEmoji emoji="🎮" delay={1.2} x={0.12} y={0.40} size={34} />
      <FloatingEmoji emoji="🎲" delay={0.8} x={0.57} y={0.87} size={36} />
      <FloatingEmoji emoji="🎤" delay={3.5} x={0.44} y={0.05} size={40} />

      <View style={styles.center}>
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={{ fontSize: 54, marginBottom: 6 }}>🤝</Text>
            <Text style={styles.appName}>Huddle</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 18, marginBottom: 32 }}>
            <Text style={styles.tagline1}>{TAGLINE}</Text>
            <Text style={styles.tagline2}>{TAGLINE_2}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(420).springify()} style={{ gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/phone')}
              style={styles.cta}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </TouchableOpacity>

            <Text style={styles.fine}>
              By continuing, you agree to our Terms & Privacy Policy.{'\n'}
              No email. No password. Just your phone number.
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F2027',
    overflow: 'hidden' as any,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 24,
    padding: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.45,
    shadowRadius: 44,
  },
  appName: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 2,
  },
  tagline1: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  tagline2: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  cta: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  ctaText: {
    color: '#0F2027',
    fontSize: 17,
    fontWeight: '700',
  },
  fine: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
