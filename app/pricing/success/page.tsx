"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    sessionId: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const savePaymentData = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setError('Session ID not found');
        setIsSaving(false);
        return;
      }

      try {
        // Chiamata API per verificare e salvare i dati del pagamento
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }

        const data = await response.json();
        
        // Salva i dati nel localStorage
        localStorage.setItem('payment_session', JSON.stringify({
          sessionId: sessionId,
          email: data.email,
          tier: data.tier,
          timestamp: new Date().toISOString(),
        }));

        setPaymentDetails({
          sessionId: sessionId,
          email: data.email,
        });

        setIsSaving(false);
      } catch (err: any) {
        console.error('Error saving payment data:', err);
        setError(err.message || 'Failed to save payment data');
        setIsSaving(false);
      }
    };

    savePaymentData();
  }, [searchParams]);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {isSaving ? (
          <>
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Processing Payment...
            </h1>
            <p className="text-gray-600">
              Please wait while we confirm your payment
            </p>
          </>
        ) : error ? (
          <>
            <div className="mb-6 text-red-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Verification Error
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <HomeIcon />
              Go to Home
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 text-green-600">
              <CheckCircleIcon sx={{ fontSize: 80 }} />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Payment Successful!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Thank you for upgrading to Premium. Your payment has been processed successfully.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left">
              <h2 className="text-sm font-semibold text-green-800 mb-3">Payment Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-800">{paymentDetails?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session ID:</span>
                  <span className="font-mono text-xs text-gray-800 break-all">
                    {paymentDetails?.sessionId.substring(0, 20)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">🎉 You now have access to:</h3>
              <ul className="text-sm text-left text-blue-700 space-y-1">
                <li>✓ Unlimited ZTL alerts</li>
                <li>✓ Real-time GPS tracking</li>
                <li>✓ Sound alerts</li>
                <li>✓ Priority support</li>
              </ul>
            </div>

            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full justify-center"
            >
              <HomeIcon />
              Start Using Premium Features
            </button>

            <p className="text-xs text-gray-500 mt-4">
              A confirmation email has been sent to {paymentDetails?.email}
            </p>
          </>
        )}
      </div>
    </div>
  );
}