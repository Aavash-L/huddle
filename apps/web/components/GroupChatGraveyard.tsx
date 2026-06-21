'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

const MESSAGES: { from: string; text: string; me?: boolean }[] = [
  { from: 'system', text: '👥 Group created: "Weekend plans 🎉"' },
  { from: 'Alex', text: 'we should hang out this weekend!!!' },
  { from: 'Sam', text: 'YESSS im so down', me: true },
  { from: 'Mia', text: "ok let's actually do it this time" },
  { from: 'Alex', text: 'when is everyone free?' },
  { from: 'system', text: '… silence …' },
  { from: 'Jordan', text: 'Thursday works for me' },
  { from: 'Sam', text: 'maybe Saturday?', me: true },
  { from: 'Alex', text: 'actually nm I might have something' },
  { from: 'system', text: '… 47 more messages …' },
  { from: 'Sam', text: 'so are we doing this or not lol', me: true },
  { from: 'system', text: '… silence …' },
];

function Bubble({ m }: { m: (typeof MESSAGES)[number] }) {
  if (m.from === 'system') {
    return (
      <div className="my-2 text-center text-xs italic text-[#9AA6B8]">{m.text}</div>
    );
  }
  return (
    <div className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        {!m.me && (
          <div className="mb-0.5 ml-1 text-[11px] font-medium text-[#9AA6B8]">
            {m.from}
          </div>
        )}
        <div
          className="rounded-2xl px-3.5 py-2 text-sm"
          style={{
            background: m.me ? '#1A2230' : '#121823',
            color: '#F4F6FB',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {m.text}
        </div>
      </div>
    </div>
  );
}

function HuddleCard() {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-[22px] p-6"
      style={{
        background: '#121823',
        border: '1px solid rgba(245,181,68,0.55)',
        boxShadow: '0 0 60px -10px rgba(245,181,68,0.45)',
      }}
    >
      <div className="text-xs text-[#9AA6B8]">Huddle</div>
      <div
        className="mt-1 text-xl font-bold text-[#F4F6FB]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        🤝 Dinner at that new ramen place
      </div>
      <div
        className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
        style={{ background: 'rgba(245,181,68,0.12)', color: '#F5B544' }}
      >
        🔒 Locked · Thursday 8pm
      </div>
      <div className="mt-4 text-sm text-[#7BD88F]">
        ✓ Alex, Sam, Mia, Jordan — all in
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#F5B544', '#6BA8F5', '#F56B9B', '#7BD88F', '#F5B544', '#6BA8F5', '#F56B9B', '#7BD88F'];
  return (
    <>
      <style>{`
        @keyframes huddle-confetti {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {colors.map((c, i) => {
          const angle = (i / colors.length) * Math.PI * 2;
          const dx = Math.cos(angle) * 120;
          const dy = Math.sin(angle) * 120;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: c,
                ['--dx' as string]: `${dx}px`,
                ['--dy' as string]: `${dy}px`,
                animation: `huddle-confetti 1.1s ease-out ${i * 0.04}s infinite`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

function Cinematic({ progress }: { progress: MotionValue<number> }) {
  // Phase 1 (0–0.35): chat appears. Phase 2 (0.35–0.65): dies. Phase 3 (0.65–0.85): Huddle card. Phase 4 (0.85–1): "Not anymore"
  const chatOpacity = useTransform(progress, [0, 0.05, 0.55, 0.68], [0, 1, 1, 0]);
  const chatGrey = useTransform(progress, [0.35, 0.6], [1, 0.25]);
  const chatY = useTransform(progress, [0, 0.35], [30, 0]);

  const deadOpacity = useTransform(progress, [0.42, 0.55, 0.66], [0, 1, 0]);

  const cardOpacity = useTransform(progress, [0.66, 0.74, 0.9, 0.97], [0, 1, 1, 0]);
  const cardScale = useTransform(progress, [0.66, 0.78], [0.7, 1]);

  const finalOpacity = useTransform(progress, [0.88, 0.96], [0, 1]);
  const finalScale = useTransform(progress, [0.88, 1], [0.85, 1]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Chat stack */}
      <motion.div
        style={{ opacity: chatOpacity }}
        className="absolute inset-0 flex items-center justify-center px-5"
      >
        <motion.div
          style={{ opacity: chatGrey, y: chatY }}
          className="flex w-full max-w-md flex-col gap-2"
        >
          {MESSAGES.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
        </motion.div>
      </motion.div>

      {/* Plan died overlay */}
      <motion.div
        style={{ opacity: deadOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="text-3xl font-bold text-[#9AA6B8]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          💀 Plan died
        </div>
      </motion.div>

      {/* Huddle card */}
      <motion.div
        style={{ opacity: cardOpacity, scale: cardScale }}
        className="absolute inset-0 flex items-center justify-center px-5"
      >
        <div className="relative">
          <Confetti />
          <HuddleCard />
        </div>
      </motion.div>

      {/* Not anymore */}
      <motion.div
        style={{ opacity: finalOpacity, scale: finalScale }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="text-5xl font-extrabold text-[#F5B544] md:text-7xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Not anymore. 🔒
        </div>
      </motion.div>
    </div>
  );
}

export default function GroupChatGraveyard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reduced) {
    return (
      <section id="how-it-works" className="px-5 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="relative">
            <HuddleCard />
          </div>
          <div
            className="mt-10 text-4xl font-extrabold text-[#F5B544]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Not anymore. 🔒
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="how-it-works" ref={ref} style={{ height: '300vh', position: 'relative' }}>
      <div
        className="overflow-hidden"
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        <Cinematic progress={scrollYProgress} />
      </div>
    </section>
  );
}
