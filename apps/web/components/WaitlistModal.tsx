'use client';

import { useState } from 'react';

function fireSignup(platform: string) {
  if (
    typeof window !== 'undefined' &&
    (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
  ) {
    (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
      'waitlist_signup',
      { platform }
    );
  }
}

export default function WaitlistModal({
  platform,
  open,
  onClose,
}: {
  platform: string;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  if (!open) return null;

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
    fireSignup(platform);
    setStatus('done');
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[22px] border border-[rgba(255,255,255,0.10)] bg-[#121823] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {status === 'done' ? (
          <div className="text-center">
            <div className="text-3xl">🎉</div>
            <p className="mt-3 font-semibold text-[#F4F6FB]">You&rsquo;re on the list!</p>
            <p className="mt-1 text-sm text-[#9AA6B8]">
              We&rsquo;ll let you know the moment it&rsquo;s ready.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-[14px] bg-[#1A2230] px-5 py-2 text-sm font-semibold text-[#F4F6FB]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3
              className="text-lg font-bold text-[#F4F6FB]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Notify me
            </h3>
            <p className="mt-1 text-sm text-[#9AA6B8]">
              Drop your email and we&rsquo;ll tell you when it lands.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-4 w-full rounded-[14px] border border-[rgba(255,255,255,0.10)] bg-[#0A0E14] px-4 py-3 text-sm text-[#F4F6FB] outline-none focus:border-[#F5B544]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex-1 rounded-[14px] bg-[#F5B544] px-5 py-3 text-sm font-bold text-[#0A0E14] disabled:opacity-60"
              >
                {status === 'loading' ? 'Submitting…' : 'Notify me'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[14px] bg-[#1A2230] px-5 py-3 text-sm font-semibold text-[#9AA6B8]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
