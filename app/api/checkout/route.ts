import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { tier } = await req.json();

    const tiers = {
      // basic: {
      //   name: 'Basic Plan',
      //   priceId: process.env.STRIPE_PRICE_BASIC || 'price_1',
      //   amount: 0,
      // },
      premium: {
        name: 'Premium Plan',
        priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_1',
        amount: 499,
      }
      
    };

    const selectedTier = tiers[tier as keyof typeof tiers];

    if (!selectedTier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: selectedTier.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || ''}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || ''}/payment/cancel?tier=${tier}`,
      customer_email: 'customer@example.com',
      metadata: {
        tier: tier,
        userId: req.cookies.get('user-id')?.value || 'anonymous',
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

export type Tier = /*'basic' |*/ 'premium';

