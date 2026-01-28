import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function POST() {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "paypal"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: "Olympic Shield Pass 2026", description: "Unlimited ZTL Audio Alerts" },
        unit_amount: 499, // €4.99
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}