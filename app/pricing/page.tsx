"use client";

import { useState } from "react";

export default function Pricing() {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (isPurchasing) return;

    setIsPurchasing(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Failed to open checkout. Please try again.');
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          🏔️ Choose Your Protection Level
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
            <div className="text-4xl font-bold text-gray-600 mb-6">€0</div>

            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>3 ZTL alerts per day</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Real-time GPS tracking</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Map with all zones</span>
              </li>
              <li className="flex items-center text-red-500">
                <span className="mr-2">✗</span>
                <span>No approach warnings</span>
              </li>
              <li className="flex items-center text-red-500">
                <span className="mr-2">✗</span>
                <span>No zone details</span>
              </li>
            </ul>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Get Started Free
            </button>
          </div>

          {/* Premium Tier */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-8 text-white transform scale-105">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">Premium</h2>
              <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                BEST VALUE
              </span>
            </div>

            <div className="text-5xl font-bold mb-2">€4.99</div>
            <p className="text-blue-100 mb-6">One-time payment • Lifetime access</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Unlimited ZTL alerts</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Approach warnings (200m before zone)</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Zone details (hours, exceptions, permits)</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Calm vs aggressive alert sounds</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Multi-language (EN, IT, FR, DE)</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Offline mode</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span className="font-semibold">Alert history log</span>
              </li>
            </ul>

            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className={`w-full py-4 px-6 bg-white text-blue-700 rounded-lg font-bold transition transform hover:scale-105 ${
                isPurchasing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'
              }`}
            >
              {isPurchasing ? '🔄 Opening Checkout...' : '🛒️ Upgrade to Premium'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
