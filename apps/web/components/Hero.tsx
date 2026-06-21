'use client';

import { useEffect, useState } from 'react';
import { PLATFORMS, SITE_URL } from '@/config/platforms';
import DeviceMockup from './DeviceMockup';
import QRCode from './QRCode';

type OS = 'ios' | 'android' | 'mac' | 'desktop';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  return 'desktop';
}

function track(platform: string, url: string) {
  if (
    typeof window !== 'undefined' &&
    (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
  ) {
    (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
      'cta_click',
      { platform, placement: 'hero', url }
    );
  }
}

const primaryBtn =
  'inline-flex items-center justify-center rounded-[14px] bg-[#F5B544] px-7 py-4 text-base font-bold text-[#0A0E14] transition-transform active:scale-95 hover:brightness-105';
const secondaryBtn =
  'inline-flex items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.12)] bg-[#121823] px-6 py-3 text-sm font-semibold text-[#F4F6FB] transition-colors hover:bg-[#1A2230]';

export default function Hero() {
  const [os, setOs] = useState<OS>('desktop');

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const qrValue = `${SITE_URL}/get?utm_source=web&utm_medium=hero_qr`;

  return (
    <section id="top" className="relative overflow-hidden px-5 pt-16 pb-20 md:pt-24 md:pb-28">
      {/* subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 0%, rgba(245,181,68,0.10), transparent 70%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full border border-[rgba(255,255,255,0.10)] bg-[#121823] px-3 py-1 text-xs font-medium text-[#9AA6B8]">
            Free to start · No email needed · Just your phone number
          </span>

          <h1
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-[#9AA6B8]">Plans go to die in the group chat.</span>
            <br />
            <span className="text-[#F4F6FB]">Huddle is where they </span>
            <span className="text-[#F5B544]">actually happen.</span>
          </h1>

          <div className="mt-8">
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

            {(os === 'desktop' || os === 'mac') && (
              <div className="flex flex-col gap-4">
                {os === 'mac' && PLATFORMS.mac.enabled && (
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={PLATFORMS.mac.url}
                      className={primaryBtn}
                      onClick={() => track('mac', PLATFORMS.mac.url)}
                    >
                      Download for Mac
                    </a>
                    <span className="text-xs text-[#9AA6B8]">Apple Silicon + Intel</span>
                  </div>
                )}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-4">
                    <QRCode value={qrValue} size={104} />
                    <div className="max-w-[140px]">
                      <div className="text-sm font-semibold text-[#F4F6FB]">
                        Scan to get the app
                      </div>
                      <div className="mt-1 text-xs text-[#9AA6B8]">
                        Works for iPhone and Android.
                      </div>
                    </div>
                  </div>
                  {PLATFORMS.web.enabled && (
                    <a
                      href={PLATFORMS.web.url}
                      className={secondaryBtn}
                      onClick={() => track('web', PLATFORMS.web.url)}
                    >
                      Open web app
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-[#9AA6B8]">
            No credit card. Invite anyone by phone — they RSVP by link, no download
            needed.
          </p>
        </div>

        <div className="hidden justify-center md:flex">
          <DeviceMockup />
        </div>
      </div>
    </section>
  );
}
