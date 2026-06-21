'use client';

import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, Animated } from 'react-native';

export interface ConfettiLockRef {
  celebrate: () => void;
}

interface ConfettiLockProps {
  onComplete?: () => void;
}

const COLORS = [
  '#667EEA', '#764BA2', '#F857A6', '#FF5858',
  '#38EF7D', '#FFE66D', '#FF6B6B', '#F5B544',
];
const PARTICLE_COUNT = 60;

const ConfettiLock = forwardRef<ConfettiLockRef, ConfettiLockProps>(({ onComplete }, ref) => {
  const lockScale = useRef(new Animated.Value(0)).current;
  const lockOpacity = useRef(new Animated.Value(0)).current;
  const [particles, setParticles] = useState<
    { id: number; color: string; x: number; delay: number; duration: number; isCircle: boolean }[]
  >([]);
  const [celebrating, setCelebrating] = useState(false);

  useImperativeHandle(ref, () => ({
    celebrate: () => {
      setCelebrating(true);
      lockOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(lockScale, { toValue: 1.6, useNativeDriver: true, damping: 6, stiffness: 300 }),
        Animated.spring(lockScale, { toValue: 1.2, useNativeDriver: true, damping: 8, stiffness: 200 }),
      ]).start();
      setParticles(
        Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
          id: i,
          color: COLORS[i % COLORS.length],
          x: Math.random() * 100,
          delay: Math.random() * 500,
          duration: 800 + Math.random() * 700,
          isCircle: i % 3 !== 0,
        }))
      );
      if (onComplete) setTimeout(onComplete, 2000);
    },
  }));

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => {
      setCelebrating(false);
      setParticles([]);
      lockOpacity.setValue(0);
      lockScale.setValue(0);
    }, 2600);
    return () => clearTimeout(t);
  }, [celebrating, lockOpacity, lockScale]);

  return (
    <View style={{ position: 'relative' }}>
      {celebrating && (
        <>
          {/* @ts-expect-error — style tag is valid HTML in web builds */}
          <style>{`
            @keyframes confetti-fall {
              0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
              100% { transform: translateY(220px) rotate(720deg); opacity: 0; }
            }
          `}</style>
          {particles.map((p) => (
            // @ts-expect-error — div is valid HTML in web builds
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: 0,
                left: `${p.x}%`,
                width: 9,
                height: 9,
                borderRadius: p.isCircle ? '50%' : '2px',
                backgroundColor: p.color,
                animation: `confetti-fall ${p.duration}ms ease-in ${p.delay}ms forwards`,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          ))}
        </>
      )}

      <Animated.Text
        // @ts-expect-error — pointerEvents on Text is web-only
        style={{
          position: 'absolute',
          top: '30%',
          alignSelf: 'center',
          fontSize: 72,
          zIndex: 20,
          textAlign: 'center',
          opacity: lockOpacity,
          transform: [{ scale: lockScale }],
          pointerEvents: 'none',
        }}
      >
        🔒
      </Animated.Text>
    </View>
  );
});

ConfettiLock.displayName = 'ConfettiLock';
export default ConfettiLock;
