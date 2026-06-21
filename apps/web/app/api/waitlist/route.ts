import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface WaitlistBody {
  email?: string;
  platform: string;
}

async function firePostHog(distinctId: string, platform: string, email?: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: 'waitlist_signup',
        distinct_id: distinctId,
        properties: { platform, has_email: Boolean(email) },
      }),
    });
  } catch {
    // best-effort analytics — never block the response
  }
}

export async function POST(request: NextRequest) {
  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const platform = typeof body.platform === 'string' ? body.platform : 'unknown';
  const email = typeof body.email === 'string' && body.email.trim().length > 0
    ? body.email.trim().toLowerCase()
    : undefined;

  // Persist — table may not exist yet; swallow errors and still return 200.
  try {
    await supabase
      .from('waitlist')
      .upsert(
        {
          email: email ?? null,
          platform,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );
  } catch {
    // table missing or RLS — intentionally ignored
  }

  // Fire analytics (non-blocking semantics, but awaited so it lands before fn exit)
  await firePostHog(email ?? `anon_${platform}`, platform, email);

  return NextResponse.json({ ok: true });
}
