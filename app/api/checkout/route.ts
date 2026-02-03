import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
 

export async function POST(req: NextRequest) {
  try {
    const { tier, email } = await req.json();

    const tiers = {
      premium: {
        name: 'Premium Plan',
        priceId: process.env.STRIPE_PRICE_PREMIUM || '',
        amount: 499,
      }
    };

    const selectedTier = tiers[tier as keyof typeof tiers];

    if (!selectedTier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // const baseUrl = process.env.NEXT_PUBLIC_URL || 
    //                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const baseUrl = process.env.NEXT_PUBLIC_URL || "";

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: selectedTier.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing/cancel?tier=${tier}`,
      customer_email: email,
      metadata: {
        tier: tier,
        userId: req.cookies.get('user-id')?.value || 'anonymous',
      },
    });

    // Restituisci l'URL della checkout session
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export type Tier = 'premium';

 

