import { useRef, useImperativeHandle, forwardRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';

export interface ConfettiLockRef {
  celebrate: () => void;
}

interface ConfettiLockProps {
  onComplete?: () => void;
}

// Imperative handle so parent can trigger the celebration
const ConfettiLock = forwardRef<ConfettiLockRef, ConfettiLockProps>(
  ({ onComplete }, ref) => {
    const confettiRef = useRef<any>(null);
    const lockScale = useSharedValue(0);
    const lockRotate = useSharedValue(0);
    const lockOpacity = useSharedValue(0);
    const cardScale = useSharedValue(1);

    const lockStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: lockScale.value },
        { rotate: `${lockRotate.value}deg` },
      ],
      opacity: lockOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }],
    }));

    const triggerHaptics = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 200);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 500);
    };

    useImperativeHandle(ref, () => ({
      celebrate: () => {
        // 1. Haptic feedback
        triggerHaptics();

        // 2. Card snap animation
        cardScale.value = withSequence(
          withSpring(0.95, { damping: 15, stiffness: 400 }),
          withSpring(1.02, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 10 })
        );

        // 3. Lock emoji pop in
        lockOpacity.value = withTiming(1, { duration: 100 });
        lockScale.value = withSequence(
          withSpring(1.6, { damping: 6, stiffness: 300 }),
          withDelay(100, withSpring(1.2, { damping: 8 }))
        );
        lockRotate.value = withSequence(
          withTiming(-15, { duration: 80 }),
          withTiming(15, { duration: 80 }),
          withTiming(-5, { duration: 60 }),
          withTiming(0, { duration: 60 })
        );

        // 4. Confetti burst
        setTimeout(() => {
          confettiRef.current?.start();
        }, 50);

        // 5. Callback after celebration
        if (onComplete) {
          setTimeout(() => {
            runOnJS(onComplete)();
          }, 2000);
        }
      },
    }));

    return (
      <View style={{ position: 'relative' }}>
        {/* Confetti layer (pointer-events none) */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} pointerEvents="none">
          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: '50%' as any, y: 0 }}
            autoStart={false}
            fadeOut
            fallSpeed={2500}
            explosionSpeed={450}
            colors={[
              '#667EEA', '#764BA2', '#F857A6',
              '#FF5858', '#38EF7D', '#FFE66D',
              '#FF6B6B', '#11998E',
            ]}
          />
        </View>

        {/* Animated card wrapper */}
        <Animated.View style={cardStyle}>
          {/* Lock emoji overlay — positioned by parent */}
        </Animated.View>

        {/* Floating lock emoji */}
        <Animated.Text
          style={[
            lockStyle,
            {
              position: 'absolute',
              top: '30%',
              alignSelf: 'center',
              fontSize: 72,
              zIndex: 20,
              textAlign: 'center',
            },
          ]}
          pointerEvents="none"
        >
          🔒
        </Animated.Text>
      </View>
    );
  }
);

ConfettiLock.displayName = 'ConfettiLock';
export default ConfettiLock;
