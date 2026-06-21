'use client';

import { useEffect, useState } from 'react';
import { PLATFORMS, SITE_URL } from '@/config/platforms';
import QRCode from './QRCode';

type OS = 'ios' | 'android' | 'desktop';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

function track(platform: string, url: string) {
  if (
    typeof window !== 'undefined' &&
    (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
  ) {
    (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
      'cta_click',
      { platform, placement: 'closing', url }
    );
  }
}

const primaryBtn =
  'inline-flex items-center justify-center rounded-[14px] bg-[#F5B544] px-8 py-4 text-base font-bold text-[#0A0E14] transition-transform active:scale-95 hover:brightness-105';

export default function ClosingCTA() {
  const [os, setOs] = useState<OS>('desktop');
  useEffect(() => setOs(detectOS()), []);

  const qrValue = `${SITE_URL}/get?utm_source=web&utm_medium=closing_qr`;

  return (
    <section className="relative overflow-hidden px-5 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 60% at 50% 50%, rgba(245,181,68,0.08), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-xl">
        <h2
          className="text-3xl font-extrabold tracking-tight md:text-5xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ready to actually hang out?
        </h2>
        <p className="mt-4 text-[#9AA6B8]">7-day free trial. No credit card.</p>

        <div className="mt-8 flex justify-center">
          {os === 'ios' && (
            <a
              href={PLATFORMS.ios.enabled ? PLATFORMS.ios.url : '#download'}
              className={primaryBtn}
              onClick={() => track('ios', PLATFORMS.ios.url || '#download')}
            >
              Download for iPhone
            </a>
          )}
          {os === 'android' && (
            <a
              href={PLATFORMS.android.enabled ? PLATFORMS.android.url : '#download'}
              className={primaryBtn}
              onClick={() => track('android', PLATFORMS.android.url || '#download')}
            >
              Get it on Android
            </a>
          )}
          {os === 'desktop' && (
            <a href="#download" className={primaryBtn} onClick={() => track('desktop', '#download')}>
              Get Huddle Free
            </a>
          )}
        </div>

        {os === 'desktop' && (
          <div className="mt-10 flex justify-center">
            <div className="flex items-center gap-5 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-5">
              <QRCode value={qrValue} size={120} />
              <div className="max-w-[180px] text-left">
                <div className="text-sm font-semibold text-[#F4F6FB]">
                  Scan to get the app
                </div>
                <div className="mt-1 text-xs text-[#9AA6B8]">
                  Works for iPhone and Android.
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-[#9AA6B8]">
          Free to start · No email needed · Just your phone number
        </p>
      </div>
    </section>
  );
}
