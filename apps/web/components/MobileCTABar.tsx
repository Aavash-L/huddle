'use client';

import { useEffect, useState } from 'react';

export default function MobileCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function track() {
    if (
      typeof window !== 'undefined' &&
      (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog
    ) {
      (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
        'cta_click',
        { platform: 'mobile_bar', placement: 'mobile_cta_bar', url: '#download' }
      );
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:hidden"
      style={{
        background: 'rgba(10,14,20,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        transform: visible ? 'translateY(0)' : 'translateY(120%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <a
        href="#download"
        onClick={track}
        className="flex w-full items-center justify-center rounded-[14px] bg-[#F5B544] px-6 py-3.5 text-base font-bold text-[#0A0E14] active:scale-95"
        style={{ transition: 'transform 0.1s ease' }}
      >
        Get Huddle Free →
      </a>
    </div>
  );
}
