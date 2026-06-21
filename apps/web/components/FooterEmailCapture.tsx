'use client';

import { useState } from 'react';

export default function FooterEmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform: 'email_footer' }),
      });
    } catch {
      // best-effort
    }
    if (
      typeof window !== 'undefined' &&
      (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
    ) {
      (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
        'waitlist_signup',
        { platform: 'email_footer' }
      );
    }
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <p className="text-sm font-semibold text-[#7BD88F]">
        You&rsquo;re on the list! 🎉
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-[14px] border border-[rgba(255,255,255,0.10)] bg-[#0A0E14] px-4 py-2.5 text-sm text-[#F4F6FB] outline-none focus:border-[#F5B544]"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-[14px] bg-[#F5B544] px-4 py-2.5 text-sm font-bold text-[#0A0E14] disabled:opacity-60"
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
    </form>
  );
}
