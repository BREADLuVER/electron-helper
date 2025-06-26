import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.STRIPE_SECRET_KEY) {
  // build-time stub – payments not enabled yet
}

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null as unknown as Stripe;

const PRICE_MAP: Record<string, string> = {
  free: process.env.STRIPE_PRICE_FREE!,
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export async function POST(req: NextRequest) {
  const { plan } = await req.json();
  if (!stripe) {
    return NextResponse.json({ error: 'Payments disabled' }, { status: 501 });
  }
  const priceId = PRICE_MAP[plan];
  if (!priceId) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
  });

  return NextResponse.json({ url: session.url });
} 