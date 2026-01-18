import React, { useState, useEffect } from 'react';
import { getStripe } from '../services/stripeService';
import { createPaymentIntent } from '../services/stripeService';
import { X, CreditCard, AlertCircle, CheckCircle, Loader, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Tournament } from '../types/tournament';

interface PaymentCheckoutProps {
  tournament: Tournament;
  teamId: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<{
  tournament: Tournament;
  teamId: string;
  checkoutUrl: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}> = ({ tournament, teamId, checkoutUrl, onSuccess, onCancel }) => {
  const [processing, setProcessing] = useState(false);

  const handleRedirect = () => {
    setProcessing(true);
    window.location.href = checkoutUrl;
  };

  const entryFee = tournament.paymentInfo?.entryFee || 0;

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Tournament Entry Fee</h3>
            <p className="text-sm text-gray-400">{tournament.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">€{entryFee.toFixed(2)}</p>
            <p className="text-xs text-gray-400">per team</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>Important:</strong> By completing this payment, you confirm your team's participation in this tournament. 
          Refunds are only available if requested at least 14 days before the tournament start date.
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleRedirect}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {processing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay €{entryFee.toFixed(2)}
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  tournament,
  teamId,
  onSuccess,
  onCancel,
}) => {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      if (!tournament.paymentInfo || !tournament.organizerId) {
        setError('Payment information not available');
        setLoading(false);
        return;
      }

      try {
        // Create Stripe Checkout session via API
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: tournament.id,
            teamId: teamId,
            entryFee: tournament.paymentInfo.entryFee,
            organizerId: tournament.organizerId,
            successUrl: `${window.location.origin}/tournaments/${tournament.id}?payment=success`,
            cancelUrl: `${window.location.origin}/tournaments/${tournament.id}?payment=cancelled`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create checkout session');
        }

        const data = await response.json();
        setCheckoutUrl(data.checkoutUrl);
      } catch (err: any) {
        console.error('Error initializing payment:', err);
        setError(err.message || 'Failed to initialize payment');
        toast.error(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [tournament, teamId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader className="w-6 h-6 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-300">Initializing payment...</span>
        </div>
      </div>
    );
  }

  if (error || !checkoutUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-700">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 mb-4">{error || 'Failed to initialize payment'}</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Complete Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <PaymentForm
          tournament={tournament}
          teamId={teamId}
          checkoutUrl={checkoutUrl}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export default PaymentCheckout;
