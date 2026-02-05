"use client";

import { useRouter } from 'next/navigation';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function PaymentCancel() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleTryAgain = () => {
    router.push('/pricing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="mb-6 text-orange-500">
          <CancelIcon sx={{ fontSize: 80 }} />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges were made to your account.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-orange-800 mb-2">
            Why upgrade to Premium?
          </h3>
          <ul className="text-sm text-left text-orange-700 space-y-1">
            <li>✓ Unlimited ZTL alerts</li>
            <li>✓ Real-time GPS tracking</li>
            <li>✓ Sound alerts</li>
            <li>✓ Priority support</li>
            <li>✓ 30-day money-back guarantee</li>
          </ul>
        </div>

        <div className="space-y-3">
          {/* <button
            onClick={handleTryAgain}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full justify-center"
          >
            <ArrowBackIcon />
            Try Again
          </button> */}

          <button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-all duration-200 w-full justify-center"
          >
            <HomeIcon />
            Go to Home
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Need help? Contact our <a href="mailto:support@yourapp.com" className="text-blue-600 hover:underline">support team</a>
        </p>
      </div>
    </div>
  );
}