'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const QUESTIONS = [
  {
    q: 'Is Huddle free?',
    a: 'Yes — core Huddle is free forever. Pro ($4.99/mo or $34.99/yr) adds AI suggestions and Trip Mode. You can try Pro free for 7 days.',
  },
  {
    q: 'Do my friends need to download the app?',
    a: 'Nope. You can invite anyone by their phone number. They get a link and can RSVP right in their browser — no download, no account needed.',
  },
  {
    q: 'What platforms is Huddle on?',
    a: 'iPhone and Android (primary), plus a native Mac app (Apple Silicon + Intel, macOS 10.15+). A web app is in the works for Windows, Linux, and Chromebook users.',
  },
  {
    q: 'How is this different from just using our group chat?',
    a: 'Group chats are where plans go to die. Huddle adds structured availability polling, a real commitment (in/wavering/out), and an actual locked plan with a date and time. It fights the flakiness your group chat enables.',
  },
  {
    q: 'What about Windows?',
    a: "Mac users can download the native app now (beta). No native Windows app yet — sign up for the waitlist and we'll let you know when it's ready. In the meantime, the web app will work in any browser.",
  },
  {
    q: 'How does Trip Mode work?',
    a: 'Create a trip, set your destination and dates, invite your crew, and our AI (Claude) builds a day-by-day itinerary everyone actually wants — with estimated costs per person. It’s in Pro.',
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-5 py-20">
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-center text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Questions, answered
        </h2>

        <div className="mt-10">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-[#F4F6FB]"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                    {item.q}
                  </span>
                  <span className="text-[#9AA6B8]">
                    <Chevron open={isOpen} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="pb-5 text-sm leading-relaxed text-[#9AA6B8]">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
