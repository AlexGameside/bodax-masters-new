import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { API_ENDPOINTS } from '../config/api';

// Initialize Stripe (public key)
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      console.error('Stripe publishable key not found');
      return null;
    }
    stripePromise = loadStripe(stripeKey);
  }
  return stripePromise;
};

// Platform fee percentage (5%)
export const PLATFORM_FEE_PERCENTAGE = 0.05;

// Calculate platform fee and organizer payout
export const calculateFees = (entryFee: number) => {
  const platformFee = Math.round(entryFee * PLATFORM_FEE_PERCENTAGE * 100) / 100; // Round to 2 decimals
  const organizerPayout = Math.round((entryFee - platformFee) * 100) / 100;
  return {
    platformFee,
    organizerPayout,
    total: entryFee
  };
};

// Create Stripe Connect Express account onboarding link
export const createConnectOnboardingLink = async (organizerId: string, email?: string): Promise<{ onboardingUrl: string | null; accountId: string; existingAccount?: boolean; message?: string }> => {
  try {
    const endpoint = API_ENDPOINTS.stripe.createConnectOnboarding();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizerId, email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error', details: 'Failed to parse error response' }));
      
      // Log detailed error information to console for debugging
      console.error('=== Stripe Connect Onboarding Error ===');
      console.error('Status:', response.status, response.statusText);
      console.error('Error Message:', errorData.error);
      console.error('Error Details:', errorData.details);
      if (errorData.debug) {
        console.error('Debug Info:', errorData.debug);
        console.error('Error Type:', errorData.debug.type);
        console.error('Error Code:', errorData.debug.code);
        console.error('Stripe Status Code:', errorData.debug.statusCode);
        console.error('Request ID:', errorData.debug.requestId);
        if (errorData.debug.raw) {
          console.error('Stripe Raw Error:', errorData.debug.raw);
        }
      }
      if (errorData.stripeError) {
        console.error('Stripe Error Object:', errorData.stripeError);
      }
      console.error('Full Error Response:', errorData);
      console.error('======================================');
      
      // Provide helpful error message for Stripe Connect setup issues
      let errorMessage = errorData.error || 'Failed to create onboarding link';
      if (errorMessage.includes('responsibilities of managing losses')) {
        errorMessage = 'Stripe Connect requires platform configuration. Please contact support or configure in Stripe Dashboard: Settings > Connect > Platform profile > Accept responsibility for losses.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      onboardingUrl: data.onboardingUrl,
      accountId: data.accountId,
      existingAccount: data.existingAccount || false,
      message: data.message,
    };
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
    throw error;
  }
};

// Create payment intent for tournament entry fee
export const createPaymentIntent = async (
  tournamentId: string,
  teamId: string,
  entryFee: number,
  organizerStripeAccountId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  try {
    const response = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournamentId,
        teamId,
        entryFee,
        organizerStripeAccountId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment intent');
    }

    const data = await response.json();
    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Process payout to organizer when registration closes
export const processOrganizerPayout = async (
  tournamentId: string,
  organizerStripeAccountId: string,
  payoutAmount: number
): Promise<string> => {
  try {
    const response = await fetch('/api/stripe/process-payout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournamentId,
        organizerStripeAccountId,
        payoutAmount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process payout');
    }

    const data = await response.json();
    return data.transferId;
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
};

// Process refund for team registration
export const processRefund = async (
  paymentIntentId: string,
  amount?: number // If not provided, full refund
): Promise<string> => {
  try {
    const response = await fetch('/api/stripe/process-refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process refund');
    }

    const data = await response.json();
    return data.refundId;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

// Check if payment is eligible for refund (14 days before tournament start)
export const isRefundEligible = (tournamentStartDate: Date, refundDeadline?: Date): boolean => {
  if (refundDeadline) {
    return new Date() < refundDeadline;
  }
  
  // Default: 14 days before tournament start
  const deadline = new Date(tournamentStartDate);
  deadline.setDate(deadline.getDate() - 14);
  return new Date() < deadline;
};

// Check Stripe Connect account status
export const checkStripeAccountStatus = async (accountId: string): Promise<{
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
}> => {
  try {
    const endpoint = API_ENDPOINTS.stripe.checkAccountStatus();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Log detailed error information to console for debugging
      console.error('=== Stripe Account Status Check Error ===');
      console.error('Status:', response.status, response.statusText);
      console.error('Error Message:', errorData.error);
      console.error('Error Details:', errorData.details);
      if (errorData.debug) {
        console.error('Debug Info:', errorData.debug);
      }
      console.error('Full Error Response:', errorData);
      console.error('==========================================');
      
      throw new Error(errorData.error || 'Failed to check account status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    throw error;
  }
};
