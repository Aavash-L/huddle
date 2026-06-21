const cardBase =
  'rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-6 transition-transform duration-200 hover:-translate-y-1';

function AvailabilityGrid() {
  // 3x3, one "best" cell highlighted in gold
  const best = 4; // center cell
  const filled = new Set([0, 1, 3, 4, 5, 7]);
  return (
    <div className="mt-4 grid w-[132px] grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 36,
            borderRadius: 8,
            background:
              i === best
                ? '#F5B544'
                : filled.has(i)
                  ? 'rgba(245,181,68,0.16)'
                  : '#1A2230',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  );
}

export default function BentoGrid() {
  return (
    <section id="why-it-works" className="px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-center text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Why Huddle works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[#9AA6B8]">
          The structure your group chat never had.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* A — large */}
          <div className={`${cardBase} md:col-span-2`}>
            <div className="text-2xl">⚡</div>
            <h3 className="mt-3 text-xl font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              No more &ldquo;when is everyone free?&rdquo;
            </h3>
            <p className="mt-2 max-w-md text-sm text-[#9AA6B8]">
              A tap-to-select grid shows everyone&rsquo;s availability at once. The best
              slot gets highlighted automatically.
            </p>
            <AvailabilityGrid />
          </div>

          {/* B — medium */}
          <div className={`${cardBase} flex flex-col`}>
            <style>{`
              @keyframes huddle-lock-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(245,181,68,0.0); }
                50% { box-shadow: 0 0 36px 4px rgba(245,181,68,0.45); }
              }
            `}</style>
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{
                background: 'rgba(245,181,68,0.12)',
                animation: 'huddle-lock-pulse 2.4s ease-in-out infinite',
              }}
            >
              🔒
            </div>
            <h3 className="text-lg font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              The Lock It In moment
            </h3>
            <p className="mt-2 text-sm text-[#9AA6B8]">
              When it&rsquo;s real, it feels real. Confetti, haptics, and notifications to
              everyone.
            </p>
          </div>

          {/* C — small */}
          <div className={cardBase}>
            <div className="text-2xl">🤖</div>
            <h3 className="mt-3 text-lg font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              AI picks what you&rsquo;ll all agree on
            </h3>
            <p className="mt-2 text-sm text-[#9AA6B8]">
              Claude suggests activities optimized for group consensus.
            </p>
          </div>

          {/* D — medium */}
          <div className={cardBase}>
            <div className="text-2xl">🤝</div>
            <h3 className="mt-3 text-lg font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              Commitment tracking
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[rgba(123,216,143,0.14)] px-3 py-1 text-xs font-semibold text-[#7BD88F]">
                ✓ In · 3
              </span>
              <span className="rounded-full bg-[rgba(245,181,68,0.14)] px-3 py-1 text-xs font-semibold text-[#F5B544]">
                ～ Wavering · 1
              </span>
              <span className="rounded-full bg-[rgba(154,166,184,0.14)] px-3 py-1 text-xs font-semibold text-[#9AA6B8]">
                ✗ Out · 0
              </span>
            </div>
            <p className="mt-3 text-sm text-[#9AA6B8]">
              Loss-framed reminders that actually get people to show up.
            </p>
          </div>

          {/* E — small */}
          <div className={cardBase}>
            <div className="text-2xl">✈️</div>
            <h3 className="mt-3 text-lg font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              Trip Mode
            </h3>
            <p className="mt-2 text-sm text-[#9AA6B8]">
              Multi-day AI itineraries + cost split. 🌍
            </p>
          </div>

          {/* F — medium / wide */}
          <div className={`${cardBase} md:col-span-3`}>
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-md">
                <div className="text-2xl">📱</div>
                <h3 className="mt-3 text-lg font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
                  No-install RSVP
                </h3>
                <p className="mt-2 text-sm text-[#9AA6B8]">
                  Invite anyone by phone. They RSVP by link — no app download needed.
                </p>
              </div>
              <div
                className="w-full max-w-xs rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1A2230] p-4 md:w-72"
              >
                <div className="text-xs text-[#9AA6B8]">huddle.app/plan/…</div>
                <div className="mt-1 text-sm font-semibold text-[#F4F6FB]">
                  🤝 You&rsquo;re invited: Ramen night
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-lg bg-[#F5B544] px-3 py-1 text-xs font-bold text-[#0A0E14]">
                    I&rsquo;m in
                  </span>
                  <span className="rounded-lg border border-[rgba(255,255,255,0.12)] px-3 py-1 text-xs font-semibold text-[#9AA6B8]">
                    Maybe
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
