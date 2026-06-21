import NavCTA from './NavCTA';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#why-it-works', label: 'Why it works' },
  { href: '#download', label: 'Download' },
  { href: '#faq', label: 'FAQ' },
];

export default function Nav() {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(10,14,20,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🤝
          </span>
          <span className="text-lg font-bold tracking-tight text-[#F4F6FB]" style={{ fontFamily: 'var(--font-display)' }}>
            Huddle
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[#9AA6B8] transition-colors hover:text-[#F4F6FB]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <NavCTA />
      </nav>
    </header>
  );
}
