import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// CORS headers for Vercel
async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { tier } = await req.json();

    // Define pricing tiers
    const tiers = {
      basic: {
        name: 'Basic Plan',
        priceId: process.env.STRIPE_PRICE_BASIC || 'price_1',
        amount: 0, // Free plan
      },
      premium: {
        name: 'Premium Plan',
        priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_1',
        amount: 499, // €4.99
      },
      lifetime: {
        name: 'Lifetime Premium',
        priceId: process.env.STRIPE_PRICE_LIFETIME || 'price_1',
        amount: 1999, // €19.99
      }
    };

    const selectedTier = tiers[tier as keyof typeof tiers];

    if (!selectedTier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedTier.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || ''}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || ''}/payment/cancel?tier=${tier}`,
      customer_email: 'customer@example.com', // You might want to collect this
      metadata: {
        tier: tier,
      userId: req.cookies.get('user-id') || 'anonymous',
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      tier: selectedTier.name,
      amount: selectedTier.amount,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export default handler;
