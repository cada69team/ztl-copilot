"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import ErrorIcon from '@mui/icons-material/Error';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

export default function PaymentError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An unexpected error occurred';

  const handleGoHome = () => {
    router.push('/');
  };

  const handleTryAgain = () => {
    router.push('/pricing');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@yourapp.com?subject=Payment Error';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="mb-6 text-red-500">
          <ErrorIcon sx={{ fontSize: 80 }} />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Payment Error
        </h1>
        
        <p className="text-gray-600 mb-6">
          We encountered an issue processing your payment.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-red-800 mb-2">Error Details</h2>
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            💡 What to do next:
          </h3>
          <ul className="text-sm text-left text-blue-700 space-y-2">
            <li>• Check your card details and try again</li>
            <li>• Ensure you have sufficient funds</li>
            <li>• Try a different payment method</li>
            <li>• Contact your bank if the issue persists</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full justify-center"
          >
            <RefreshIcon />
            Try Again
          </button>

          <button
            onClick={handleContactSupport}
            className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl w-full justify-center"
          >
            <SupportAgentIcon />
            Contact Support
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-all duration-200 w-full justify-center"
          >
            <HomeIcon />
            Go to Home
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Your payment was not processed and no charges were made
        </p>
      </div>
    </div>
  );
}