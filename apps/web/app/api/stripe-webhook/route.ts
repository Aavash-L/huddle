import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        await upsertEntitlement(userId, {
          stripe_customer_id: session.customer as string,
          is_pro: session.mode !== 'payment',
          has_trip_pass: session.mode === 'payment',
          stripe_subscription_id: session.subscription as string | null,
          status: 'active',
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const active = sub.status === 'active' || sub.status === 'trialing';
        await upsertEntitlement(userId, {
          stripe_subscription_id: sub.id,
          is_pro: active,
          status: sub.status,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', err);
    // Return 200 so Stripe does not retry
  }

  return NextResponse.json({ received: true });
}

async function upsertEntitlement(
  userId: string,
  data: {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    is_pro?: boolean;
    has_trip_pass?: boolean;
    status?: string;
  }
) {
  const { error } = await (supabase as any)
    .from('entitlements')
    .upsert(
      { user_id: userId, updated_at: new Date().toISOString(), ...data },
      { onConflict: 'user_id' }
    );

  if (error) console.error('[stripe-webhook] supabase upsert error', error);
}
