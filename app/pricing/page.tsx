"use client";

import { Route } from 'lucide-react';
import { redirect } from 'next/dist/server/api-utils';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
 
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');


export default function Pricing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pricing = {
    basic: {
      name: 'Basic Plan',
      price: 'Free',
      features: [
        '3 ZTL alerts per day',
        'No GPS tracking',
      ]
    },
    premium: {
      name: 'Premium Plan',
      price: '€4.99',
      features: [
        'UNLIMITED ZTL alerts',
        'Real-time GPS tracking',
        'Sound alert (siren/silent)',
        'Priority support',
      ]
    },
  };

  const handleCheckout = async (selectedTier: 'basic' | 'premium') => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tier: selectedTier, 
          email: 'test@email.com' 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Nuovo metodo: reindirizza direttamente usando l'URL di Stripe
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Get unlimited ZTL alerts and real-time GPS tracking
          </p>
        </div>

        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-2xl mb-2">✅</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Upgrade Successful!</h3>
            <p className="text-green-700">Your account has been upgraded. Redirecting to map...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-xl font-bold text-red-800 mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic</h2>
              <p className="text-4xl font-bold text-gray-700 mb-4">Free</p>
              <p className="text-sm text-gray-500 mb-6">Always free, forever</p>

              <ul className="space-y-3 mb-6">
                {pricing.basic.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-gray-400">✕</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled
                className="w-full py-3 px-6 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 ring-4 ring-blue-500 ring-opacity-20 overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium</h2>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-4xl font-bold text-blue-600">€4.99</p>
                <p className="text-sm text-gray-500">/month</p>
              </div>

              <ul className="space-y-3 mb-6">
                {pricing.premium.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout('premium')}
                disabled={isProcessing}
                className={`w-full py-3 px-6 font-medium rounded-lg transition ${
                  isProcessing
                    ? 'bg-gray-400 text-white cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Upgrade to Premium'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-white rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What You Get</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Plan</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• 3 ZTL alerts per day</li>
                <li>• Basic map view</li>
                <li>• No GPS tracking</li>
                <li>• Ad-supported</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Premium</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <span className="font-bold">UNLIMITED</span> ZTL alerts</li>
                <li>• <span className="font-bold">Real-time</span> GPS tracking</li>
                <li>• <span className="font-bold">Voice</span> alerts (siren/chime/silent)</li>
                <li>• <span className="font-bold">Premium</span> map view</li>
                <li>• <span className="font-bold">Priority</span> support</li>
                <li>• <span className="font-bold">30-day</span> money back guarantee</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">30-Day Money-Back Guarantee</h3>
              <p className="text-gray-700">Not satisfied? Get a full refund within 30 days, no questions asked.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Secure payment powered by <span className="font-bold text-blue-600">Stripe</span></p>
          <p className="mt-2">
            <a href="/" className="text-blue-600 hover:underline">
              ← Back to Map
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}