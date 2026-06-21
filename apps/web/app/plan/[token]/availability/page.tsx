export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveResponseToken, fetchPlanForToken } from '@/lib/supabase';
import { THEMES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';
import WebAvailabilityGrid from '@/components/WebTimeGrid';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Pick Your Times — Huddle',
};

export default async function AvailabilityPage({ params }: PageProps) {
  const { token } = await params;

  const invitee = await resolveResponseToken(token);
  if (!invitee) notFound();

  const plan = await fetchPlanForToken(invitee.plan_id, token);
  if (!plan) notFound();

  const theme = THEMES[(plan.theme as CrewTheme)] ?? THEMES.ocean;

  // Build 14-day date range
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const timeSlots = ['morning', 'afternoon', 'evening'];

  // Get existing availability for this token
  const existingAvailability = (plan.availability as any[]).filter(
    (a: any) => a.response_token === token && a.available
  );

  const existingSlots = existingAvailability.map((a: any) => ({
    date: a.time_window.date,
    slot: a.time_window.slot,
  }));

  // Build slot user map (aggregate)
  const slotUserMap: Record<string, number> = {};
  for (const a of (plan.availability as any[])) {
    if (!a.available) continue;
    const key = `${a.time_window.date}::${a.time_window.slot}`;
    slotUserMap[key] = (slotUserMap[key] ?? 0) + 1;
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-6"
        style={{
          background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[theme.gradient.length - 1]})`,
        }}
      >
        <a href={`/plan/${token}`} className="text-sm mb-4 block" style={{ color: `${theme.textColor}99` }}>
          ← Back to invite
        </a>
        <h1 className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
          When are you free?
        </h1>
        <p className="text-sm" style={{ color: `${theme.textColor}CC` }}>
          Tap the times you're available for {plan.title}
        </p>
      </div>

      {/* Grid */}
      <div className="px-4 py-6">
        <WebAvailabilityGrid
          planId={invitee.plan_id}
          responseToken={token}
          dates={dates}
          timeSlots={timeSlots}
          initialSelectedSlots={existingSlots}
          slotOverlapCounts={slotUserMap}
          planToken={token}
          themGradientFrom={theme.gradient[0]}
          themeGradientTo={theme.gradient[theme.gradient.length - 1]}
        />
      </div>

      {/* App nudge after submission */}
      <div className="px-5 pb-10">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-white font-semibold text-sm mb-2">
            Want reminders so you don't miss it?
          </p>
          <p className="text-white/50 text-xs mb-3">
            Download Huddle to get push notifications when the plan is locked in.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_IOS_URL ?? '#'}
            className="inline-block bg-white text-gray-950 font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            📱 Get the App
          </a>
        </div>
      </div>
    </main>
  );
}
