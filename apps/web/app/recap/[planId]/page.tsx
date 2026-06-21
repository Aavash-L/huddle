export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { THEMES } from '@huddle/shared';
import type { CrewTheme } from '@huddle/shared';

interface PageProps {
  params: Promise<{ planId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { planId } = await params;

  const { data: plan } = await supabase
    .from('plans')
    .select('title')
    .eq('id', planId)
    .eq('status', 'happened')
    .single();

  if (!plan) return { title: 'Huddle Recap' };

  return {
    title: `${plan.title} — Huddle Recap`,
    description: `This huddle actually happened! Made with Huddle.`,
  };
}

export default async function RecapPage({ params }: PageProps) {
  const { planId } = await params;

  const { data: plan, error } = await supabase
    .from('plans')
    .select(`
      *,
      creator:users!creator_id(name),
      commitments(user_id, status, user:users(name, avatar_url)),
      messages(body, created_at, user:users(name))
    `)
    .eq('id', planId)
    .eq('status', 'happened')
    .single();

  if (error || !plan) notFound();

  const theme = THEMES[(plan.theme as CrewTheme)] ?? THEMES.ocean;
  const commitments = (plan.commitments as any[]) ?? [];
  const inUsers = commitments.filter((c: any) => c.status === 'in').map((c: any) => c.user);
  const creator = plan.creator as any;

  const lockedDate = plan.locked_datetime
    ? new Date(plan.locked_datetime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero — themed gradient */}
      <div
        className="px-5 pt-14 pb-10 text-center"
        style={{
          background: `linear-gradient(180deg, ${theme.gradient[0]}, ${theme.gradient[theme.gradient.length - 1]})`,
        }}
      >
        <div className="text-5xl mb-3">✅</div>
        <p
          className="text-sm font-semibold uppercase tracking-wider mb-2"
          style={{ color: `${theme.textColor}70` }}
        >
          This one actually happened
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
          {plan.title}
        </h1>
        {lockedDate && (
          <p style={{ color: `${theme.textColor}CC` }} className="text-base">
            {lockedDate}
            {plan.location ? ` · ${plan.location}` : ''}
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: `${theme.textColor}80` }}>
          Organized by {creator?.name ?? 'someone awesome'}
        </p>
      </div>

      <div className="px-5 py-8 max-w-lg mx-auto">
        {/* Who showed up */}
        <div className="mb-8">
          <h2 className="text-white font-bold text-xl mb-4">
            Who showed up ({inUsers.length} people) 🎉
          </h2>

          <div className="flex flex-wrap gap-3">
            {inUsers.map((user: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: theme.gradient[0] }}
                >
                  {(user?.name ?? '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium">{user?.name ?? 'Someone'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        {plan.activity && (
          <div
            className="mb-8 rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, ${theme.gradient[0]}20, ${theme.gradient[theme.gradient.length - 1]}20)`,
              border: `1px solid ${theme.gradient[0]}30`,
            }}
          >
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
              What they did
            </p>
            <p className="text-white font-bold text-xl">{plan.activity}</p>
          </div>
        )}

        {/* Chat highlights */}
        {(plan.messages as any[]).length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-xl mb-4">
              From the chat 💬
            </h2>
            <div className="flex flex-col gap-3">
              {(plan.messages as any[]).slice(0, 5).map((msg: any, i: number) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <p className="text-white/40 text-xs mb-1">{msg.user?.name ?? 'Someone'}</p>
                  <p className="text-white/80 text-sm">{msg.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Made with Huddle */}
        <div
          className="rounded-2xl px-5 py-5 text-center"
          style={{
            background: 'linear-gradient(135deg, #667EEA20, #764BA220)',
            border: '1px solid rgba(102,126,234,0.2)',
          }}
        >
          <p className="text-2xl mb-2">🤝</p>
          <p className="text-white font-bold mb-1">Made with Huddle</p>
          <p className="text-white/50 text-sm mb-4">
            Stop letting plans die in the group chat. Huddle makes it actually happen.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_IOS_URL ?? '#'}
            className="inline-block text-white font-bold text-sm px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
          >
            Download Free
          </a>
        </div>
      </div>
    </main>
  );
}
