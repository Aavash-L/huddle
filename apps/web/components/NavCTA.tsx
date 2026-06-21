'use client';

import { useEffect, useState } from 'react';
import { PLATFORMS } from '@/config/platforms';

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
  if (typeof window !== 'undefined' && (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog) {
    (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture('cta_click', {
      platform,
      placement: 'nav',
      url,
    });
  }
}

export default function NavCTA() {
  const [os, setOs] = useState<OS>('desktop');

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const pill =
    'inline-flex items-center justify-center rounded-[14px] bg-[#F5B544] px-4 py-2 text-sm font-semibold text-[#0A0E14] transition-transform active:scale-95 hover:brightness-105';

  if (os === 'ios') {
    const url = PLATFORMS.ios.enabled ? PLATFORMS.ios.url : '#download';
    return (
      <a href={url} className={pill} onClick={() => track('ios', url)}>
        Get for iPhone
      </a>
    );
  }

  if (os === 'android') {
    const url = PLATFORMS.android.enabled ? PLATFORMS.android.url : '#download';
    return (
      <a href={url} className={pill} onClick={() => track('android', url)}>
        Get for Android
      </a>
    );
  }

  if (os === 'mac' && PLATFORMS.mac.enabled) {
    return (
      <a href={PLATFORMS.mac.url} className={pill} onClick={() => track('mac', PLATFORMS.mac.url)}>
        Download for Mac
      </a>
    );
  }

  return (
    <a href="#download" className={pill} onClick={() => track('desktop', '#download')}>
      Get Huddle
    </a>
  );
}
