export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveResponseToken, fetchPlanForToken } from '@/lib/supabase';
import ThemedPlanCard from '@/components/ThemedPlanCard';
import { THEMES, PLAN_TYPES, COMMITMENT_STATUSES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';
import RSVPSection from './RSVPSection';
import AppDownloadPrompt from './AppDownloadPrompt';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;

  const invitee = await resolveResponseToken(token);
  if (!invitee) return { title: 'Huddle Invite' };

  const plan = await fetchPlanForToken(invitee.plan_id, token);
  if (!plan) return { title: 'Huddle Invite' };

  return {
    title: `You're invited: ${plan.title}`,
    description: `${(plan.creator as any)?.name ?? 'Someone'} invited you to huddle. Tap to respond.`,
    openGraph: {
      title: `You're invited: ${plan.title}`,
      description: 'Respond in seconds — no app needed.',
    },
  };
}

export default async function PlanTokenPage({ params }: PageProps) {
  const { token } = await params;

  // Resolve the response token to a plan invitee
  const invitee = await resolveResponseToken(token);
  if (!invitee) notFound();

  // Fetch full plan data using this token
  const plan = await fetchPlanForToken(invitee.plan_id, token);
  if (!plan) notFound();

  const theme = THEMES[(plan.theme as CrewTheme)] ?? THEMES.ocean;
  const planType = PLAN_TYPES[(plan.type as keyof typeof PLAN_TYPES)] ?? PLAN_TYPES.hangout;
  const creator = (plan.creator as any);

  const commitments = (plan.commitments as any[]) ?? [];
  const inCount = commitments.filter((c: any) => c.status === 'in').length;
  const inviteeCount = (plan.plan_invitees as any[]).length;

  const lockedDate = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const lockedTime = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Themed hero */}
      <div
        className="px-5 pt-14 pb-8"
        style={{
          background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[theme.gradient.length - 1]})`,
        }}
      >
        <div className="max-w-lg mx-auto">
          {/* Creator */}
          <p className="text-sm font-medium mb-3" style={{ color: `${theme.textColor}99` }}>
            {creator?.name ?? 'Someone'} invited you 🎉
          </p>

          {/* Plan title */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-4xl">{planType.emoji}</span>
            <h1 className="text-3xl font-bold leading-tight" style={{ color: theme.textColor }}>
              {plan.title}
            </h1>
          </div>

          {/* Status */}
          {plan.status === 'locked' && plan.locked_datetime && (
            <div
              className="rounded-2xl px-4 py-3 mb-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              <p className="font-bold text-base" style={{ color: theme.textColor }}>
                📅 {lockedDate}
              </p>
              <p className="text-sm mt-0.5" style={{ color: `${theme.textColor}CC` }}>
                🕗 {lockedTime}
                {plan.location ? ` · 📍 ${plan.location}` : ''}
              </p>
            </div>
          )}

          {/* Roster */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          >
            <p className="font-semibold text-sm" style={{ color: `${theme.textColor}CC` }}>
              {inCount} of {inviteeCount} people are in 🔥
            </p>
          </div>
        </div>
      </div>

      {/* RSVP Section — client component */}
      <div className="flex-1 px-5 py-8 max-w-lg mx-auto w-full">
        <RSVPSection
          planId={plan.id}
          responseToken={token}
          planStatus={plan.status}
          existingAvailability={(plan.availability as any[]) ?? []}
        />
      </div>

      {/* Availability link */}
      {plan.status !== 'locked' && (
        <div className="px-5 pb-4 max-w-lg mx-auto w-full">
          <a
            href={`/plan/${token}/availability`}
            className="block w-full py-4 text-center rounded-2xl font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[theme.gradient.length - 1]})`,
            }}
          >
            📅 Select My Availability
          </a>
        </div>
      )}

      {/* App download nudge — appears after engagement */}
      <AppDownloadPrompt planTitle={plan.title} planId={plan.id} token={token} />
    </main>
  );
}
