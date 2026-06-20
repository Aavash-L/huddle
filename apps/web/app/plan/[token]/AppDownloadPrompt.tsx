'use client';

import { useState, useEffect } from 'react';

interface AppDownloadPromptProps {
  planTitle: string;
  planId: string;
  token: string;
}

export default function AppDownloadPrompt({ planTitle, planId, token }: AppDownloadPromptProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show the prompt after a short delay (simulating post-engagement)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if already dismissed this session
      const key = `huddle_app_prompt_${planId}`;
      if (!sessionStorage.getItem(key)) {
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [planId]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem(`huddle_app_prompt_${planId}`, '1');
  };

  const handleGetApp = () => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL ?? 'https://apps.apple.com';
    const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? 'https://play.google.com';

    const url = isIOS ? IOS_URL : isAndroid ? ANDROID_URL : IOS_URL;

    // Track the action
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'app_download_prompted',
          props: { plan_id: planId, action_taken: 'opened_store', token },
        }),
      }).catch(() => {});
    } catch {}

    window.open(url, '_blank');
    handleDismiss();
  };

  if (!show || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        className="max-w-lg mx-auto mb-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1f2e, #0F2027)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="px-5 py-5">
          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="float-right text-white/30 text-lg leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>

          <div className="flex items-start gap-4">
            <div className="text-4xl">🤝</div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base mb-1">
                Get reminders for this Huddle
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Download Huddle to get notified if the plan changes, and never miss another
                event again.
              </p>

              <button
                onClick={handleGetApp}
                className="w-full py-3 rounded-2xl text-center font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #667EEA, #764BA2)',
                }}
              >
                📱 Get the App (Free)
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-2.5 mt-2 text-white/40 text-sm"
              >
                No thanks, I'll remember
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
