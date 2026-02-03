import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! || "");

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Recupera la sessione da Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verifica che il pagamento sia completato
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Qui puoi salvare i dati nel tuo database
    // Ad esempio: await db.users.update({ email: session.customer_email, isPremium: true })

    return NextResponse.json({
      success: true,
      email: session.customer_email || session.customer_details?.email,
      tier: session.metadata?.tier || 'premium',
      amount: session.amount_total,
      currency: session.currency,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}