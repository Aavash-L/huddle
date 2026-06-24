import { PLATFORMS, SITE_URL } from '@/config/platforms';
import PlatformCard from './PlatformCard';
import QRCode from './QRCode';

function AppleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.46 2.21-1.21 2.99-.81.85-2.13 1.51-3.27 1.42-.14-1.12.43-2.31 1.16-3.05.81-.83 2.21-1.45 3.32-1.36zM20.5 17.3c-.6 1.38-.9 2-1.66 3.22-1.07 1.7-2.58 3.82-4.45 3.83-1.66.02-2.09-1.08-4.35-1.07-2.26.01-2.73 1.09-4.39 1.07-1.87-.02-3.3-1.93-4.37-3.63C-1.1 16.9-1.4 11.07 1.4 8.02c.98-1.07 2.4-1.75 3.93-1.75 1.6 0 2.6 1.08 3.92 1.08 1.28 0 2.06-1.08 3.91-1.08 1.36 0 2.8.74 3.82 2.02-3.36 1.84-2.81 6.64.52 8.01z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 00-.66-.38l-1.86 3.22a11.4 11.4 0 00-9.84 0L5.22 5.92a.38.38 0 10-.66.38L6.4 9.48A10.8 10.8 0 001 18h22a10.8 10.8 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
    </svg>
  );
}

function MacIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 3h2v2H6zm3-3h9v2H9zm0 3h6v2H9z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.6L10.5 4.5V11.5H3V5.6ZM11.5 4.35L21 3V11.5H11.5V4.35ZM3 12.5H10.5V19.5L3 18.4V12.5ZM11.5 12.5H21V21L11.5 19.65V12.5Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

export default function DownloadHub() {
  const qrValue = `${SITE_URL}/get?utm_source=web&utm_medium=download_hub_qr`;

  return (
    <section id="download" className="px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <h2
          className="text-center text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Get Huddle on every device
        </h2>
        <p className="mt-3 text-center text-sm text-[#9AA6B8]">
          iPhone · Android · Mac · Windows · any browser
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mobile */}
          <PlatformCard
            icon={<AppleIcon />}
            title="Download for iPhone"
            sublabel="iOS 16+"
            url={PLATFORMS.ios.url}
            enabled={PLATFORMS.ios.enabled}
            platform="ios"
          />
          <PlatformCard
            icon={<AndroidIcon />}
            title="Get it on Android"
            sublabel="Android 8+"
            url={PLATFORMS.android.url}
            enabled={PLATFORMS.android.enabled}
            platform="android"
          />

          {/* Desktop — Mac */}
          <PlatformCard
            icon={<MacIcon />}
            title="Download for Mac"
            sublabel="Apple Silicon + Intel · macOS 10.15+"
            url={PLATFORMS.mac.url}
            enabled={PLATFORMS.mac.enabled}
            platform="mac"
            badge={PLATFORMS.mac.enabled ? 'beta' : undefined}
            gatekeeperNote={PLATFORMS.mac.enabled}
          />

          {/* Desktop — Windows */}
          <PlatformCard
            icon={<WindowsIcon />}
            title="Download for Windows"
            sublabel="Windows 10+"
            url={PLATFORMS.windows.url}
            enabled={PLATFORMS.windows.enabled}
            platform="windows"
          />

          {/* Web app */}
          <div className="flex flex-col rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A2230] text-[#F4F6FB]">
                <GlobeIcon />
              </div>
              <div>
                <div className="font-bold text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
                  Open Huddle on the web
                </div>
                <div className="text-xs text-[#9AA6B8]">Any browser, any device</div>
              </div>
            </div>
            <div className="mt-5">
              {PLATFORMS.web.enabled ? (
                <a
                  href={PLATFORMS.web.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#F4F6FB] px-5 py-3 text-sm font-bold text-[#0A0E14] transition-transform active:scale-95"
                >
                  Open web app ↗
                </a>
              ) : (
                <div
                  className="cursor-not-allowed rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#1A2230] px-4 py-3 text-center text-sm font-semibold"
                  style={{ color: 'rgba(154,166,184,0.5)' }}
                >
                  Coming soon
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop-only QR panel */}
        <div className="mt-10 hidden justify-center md:flex">
          <div className="flex items-center gap-6 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#121823] p-6">
            <QRCode value={qrValue} size={140} />
            <div className="max-w-[240px]">
              <div className="font-semibold text-[#F4F6FB]">
                On your computer? Scan to get Huddle on your phone.
              </div>
              <div className="mt-2 text-sm text-[#9AA6B8]">
                Works for iPhone and Android. Takes 30 seconds.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
