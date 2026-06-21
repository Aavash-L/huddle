import { PLATFORMS, SMART_DOWNLOAD_URL } from '@/config/platforms';
import FooterEmailCapture from './FooterEmailCapture';

export default function Footer() {
  const platformLinks: { label: string; href: string }[] = [
    { label: 'iOS', href: PLATFORMS.ios.enabled ? PLATFORMS.ios.url : SMART_DOWNLOAD_URL },
    { label: 'Android', href: PLATFORMS.android.enabled ? PLATFORMS.android.url : SMART_DOWNLOAD_URL },
    { label: 'Mac', href: PLATFORMS.mac.enabled ? PLATFORMS.mac.url : SMART_DOWNLOAD_URL },
    { label: 'Web', href: PLATFORMS.web.enabled ? PLATFORMS.web.url : '#download' },
  ];

  return (
    <footer
      className="px-5 py-14"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                🤝
              </span>
              <span
                className="text-lg font-bold text-[#F4F6FB]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Huddle
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#9AA6B8]">
              {platformLinks.map((l) => (
                <a key={l.label} href={l.href} className="hover:text-[#F4F6FB]">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#9AA6B8]">
              {/* TODO: real Privacy / Terms pages */}
              <a href="#" className="hover:text-[#F4F6FB]">
                Privacy
              </a>
              <a href="#" className="hover:text-[#F4F6FB]">
                Terms
              </a>
            </div>
          </div>

          <div className="md:text-right">
            <div className="mb-2 text-sm font-semibold text-[#F4F6FB]">
              Stay in the loop:
            </div>
            <div className="md:flex md:justify-end">
              <FooterEmailCapture />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 text-sm text-[#9AA6B8]">
          <p>© 2026 Huddle. Made with 🤝</p>
          <p className="text-[#9AA6B8]/70">
            For the group chats where plans always die.
          </p>
        </div>
      </div>
    </footer>
  );
}
