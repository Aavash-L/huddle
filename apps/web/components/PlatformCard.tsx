'use client';

import { useState, type ReactNode } from 'react';

function track(event: string, platform: string, extra: Record<string, unknown> = {}) {
  if (
    typeof window !== 'undefined' &&
    (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
  ) {
    (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
      event,
      { platform, placement: 'download_hub', ...extra }
    );
  }
}

export default function PlatformCard({
  icon,
  title,
  sublabel,
  url,
  enabled,
  platform,
  badge,
  gatekeeperNote,
}: {
  icon: ReactNode;
  title: string;
  sublabel: string;
  url: string;
  enabled: boolean;
  platform: string;
  badge?: string;
  gatekeeperNote?: boolean;
}) {
  const [showCapture, setShowCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform }),
      });
    } catch {
      // best-effort
    }
    track('waitlist_signup', platform);
    setStatus('done');
  }

  return (
    <div className="flex flex-col rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A2230] text-[#F4F6FB]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
              {title}
            </span>
            {badge && (
              <span className="rounded-full bg-[#F5B544]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F5B544]">
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-[#9AA6B8]">{sublabel}</div>
        </div>
      </div>

      <div className="mt-5">
        {enabled && url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_click', platform, { url })}
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#F4F6FB] px-5 py-3 text-sm font-bold text-[#0A0E14] transition-transform active:scale-95"
            >
              {title}
            </a>
            {gatekeeperNote && (
              <p className="mt-2 text-center text-[11px] text-[#9AA6B8]">
                Unsigned beta —{' '}
                <a
                  href="https://support.apple.com/en-us/102445"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[#F5B544]"
                >
                  Trouble opening?
                </a>
              </p>
            )}
          </>
        ) : status === 'done' ? (
          <div className="rounded-[14px] bg-[rgba(123,216,143,0.12)] px-4 py-3 text-center text-sm font-semibold text-[#7BD88F]">
            You&rsquo;re on the list! 🎉
          </div>
        ) : showCapture ? (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-[14px] border border-[rgba(255,255,255,0.10)] bg-[#0A0E14] px-4 py-3 text-sm text-[#F4F6FB] outline-none focus:border-[#F5B544]"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-[14px] bg-[#F5B544] px-5 py-3 text-sm font-bold text-[#0A0E14] disabled:opacity-60"
            >
              {status === 'loading' ? 'Submitting…' : 'Notify me'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCapture(true)}
            className="inline-flex w-full items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.12)] bg-[#1A2230] px-5 py-3 text-sm font-semibold text-[#F4F6FB] transition-colors hover:bg-[#222c3d]"
          >
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}
