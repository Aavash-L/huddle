import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Huddle — Plans that actually happen',
  description: 'Plans go to die in the group chat. Huddle is where they actually happen.',
};

const FEATURES = [
  {
    emoji: '⚡',
    title: 'No more "when is everyone free?"',
    description: 'A tap-to-select grid shows everyone\'s availability at once. Best slot highlighted automatically.',
  },
  {
    emoji: '🔒',
    title: 'The Lock It In moment',
    description: 'When it\'s real, it feels real. Confetti, haptics, and notifications to everyone.',
  },
  {
    emoji: '🤖',
    title: 'AI picks what you\'ll all agree on',
    description: 'Claude suggests activities optimized for group consensus, not just the single best option.',
  },
  {
    emoji: '🤝',
    title: 'Commitment tracking',
    description: 'In / wavering / out — with loss-framed reminders that actually get people to show up.',
  },
  {
    emoji: '✈️',
    title: 'Trip Mode',
    description: 'AI-planned multi-day itineraries with day-by-day schedules and cost splitting.',
  },
  {
    emoji: '📱',
    title: 'No-install RSVP',
    description: 'Invite anyone by phone number. They respond via link — no app needed.',
  },
];

export default function HomePage() {
  const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL ?? '#';
  const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? '#';

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section
        className="relative px-5 pt-20 pb-16 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
        }}
      >
        {/* Floating emoji decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="absolute text-4xl opacity-20 top-12 left-8 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🍕</span>
          <span className="absolute text-4xl opacity-20 top-20 right-10 animate-bounce" style={{ animationDelay: '1s', animationDuration: '2.5s' }}>🎉</span>
          <span className="absolute text-3xl opacity-15 bottom-20 left-12 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>🍻</span>
          <span className="absolute text-3xl opacity-15 bottom-24 right-8 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}>🎸</span>
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          <div className="text-7xl mb-4">🤝</div>
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Huddle
          </h1>
          <p className="text-xl text-white/70 mb-2 leading-relaxed">
            Plans go to die in the group chat.
          </p>
          <p className="text-xl text-white font-bold mb-10 leading-relaxed">
            Huddle is where they actually happen.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={IOS_URL}
              className="bg-white text-gray-950 font-bold text-lg py-4 px-8 rounded-2xl text-center block active:scale-95 transition-transform"
            >
              📱 Download for iPhone
            </a>
            <a
              href={ANDROID_URL}
              className="bg-white/10 text-white font-semibold text-base py-3 px-8 rounded-2xl text-center block active:scale-95 transition-transform border border-white/20"
            >
              🤖 Get it on Android
            </a>
          </div>

          <p className="text-white/30 text-sm mt-6">
            Free to start · No email needed · Just your phone number
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Why Huddle works
        </h2>
        <div className="flex flex-col gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4 items-start">
              <div className="text-3xl flex-shrink-0 mt-0.5">{feature.emoji}</div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section
        className="px-5 py-12 text-center"
        style={{ background: 'linear-gradient(135deg, #667EEA15, #764BA215)' }}
      >
        <p className="text-white/40 text-sm mb-2 uppercase tracking-wider font-semibold">The problem we solve</p>
        <p className="text-white text-2xl font-bold leading-snug mb-4">
          "We should hang out sometime"
        </p>
        <p className="text-white/50 text-base">
          → Group chat created<br />
          → 47 messages<br />
          → "Thursday works for everyone?"<br />
          → silence<br />
          → plan dies
        </p>
        <p className="text-white text-xl font-bold mt-6">
          Not anymore. 🔒
        </p>
      </section>

      {/* CTA repeat */}
      <section className="px-5 py-16 text-center max-w-lg mx-auto">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to actually hang out?
        </h2>
        <p className="text-white/60 mb-8">7-day free trial. No credit card.</p>
        <a
          href={IOS_URL}
          className="bg-white text-gray-950 font-bold text-lg py-4 px-8 rounded-2xl text-center block active:scale-95 transition-transform"
        >
          Get Huddle Free
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-5 py-8 text-center">
        <p className="text-white/30 text-sm">
          © 2025 Huddle · <a href="#" className="hover:text-white/50">Privacy</a> · <a href="#" className="hover:text-white/50">Terms</a>
        </p>
      </footer>
    </main>
  );
}
