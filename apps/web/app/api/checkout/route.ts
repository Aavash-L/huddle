import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

const PRICE_KEY_MAP: Record<string, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  trip_pass: process.env.STRIPE_PRICE_TRIP_PASS,
};

export async function POST(req: NextRequest) {
  try {
    const { priceKey, userId, email, successUrl, cancelUrl } = await req.json();

    const priceId = PRICE_KEY_MAP[priceKey];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid price key' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: priceKey === 'trip_pass' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        successUrl ??
        `${process.env.NEXT_PUBLIC_WEB_APP_URL}/pro-welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${process.env.NEXT_PUBLIC_WEB_APP_URL}/`,
      metadata: { userId: userId ?? '' },
      subscription_data:
        priceKey !== 'trip_pass'
          ? { trial_period_days: 7, metadata: { userId: userId ?? '' } }
          : undefined,
      customer_email: email ?? undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
