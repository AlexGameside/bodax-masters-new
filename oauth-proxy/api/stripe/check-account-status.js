import Stripe from 'stripe';

export default async function handler(req, res) {
  // Set CORS headers for all requests first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      timeout: 60000,
      maxNetworkRetries: 3,
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    console.log('Checking Stripe account status for:', accountId);

    // Retrieve the account to check its status
    const account = await stripe.accounts.retrieve(accountId);

    // Check if onboarding is complete
    // An account is considered onboarded if:
    // 1. It has charges_enabled = true (can accept payments)
    // 2. It has payouts_enabled = true (can receive payouts)
    // OR at least charges_enabled = true for basic functionality
    const isOnboardingComplete = account.charges_enabled === true && account.details_submitted === true;

    console.log('Account status:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      isOnboardingComplete,
    });

    res.status(200).json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: isOnboardingComplete,
    });
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    
    // Prepare detailed error information for frontend logging
    const errorDetails = {
      type: error.type || 'UnknownError',
      code: error.code || 'NO_CODE',
      message: error.message || 'Unknown error',
      statusCode: error.statusCode,
      requestId: error.requestId,
      raw: error.raw ? {
        message: error.raw.message,
        type: error.raw.type,
        code: error.raw.code,
      } : null,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    
    console.error('Full error details:', errorDetails);
    
    let errorMessage = error.message || 'Failed to check account status';
    let statusCode = 500;

    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Stripe account not found. Please verify the account ID is correct.';
        statusCode = 404;
      } else if (error.code === 'api_key_expired' || error.code === 'invalid_api_key') {
        errorMessage = 'Stripe API key is invalid or expired. Please contact support.';
        statusCode = 500;
      } else {
        errorMessage = `Stripe API error: ${error.message}`;
        statusCode = 400;
      }
    } else if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
      errorMessage = `Connection to Stripe failed: ${error.message}. Please try again later.`;
      statusCode = 503;
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Request to Stripe timed out. Please try again.';
      statusCode = 504;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      debug: errorDetails, // Include full debug info for frontend
      type: error.type || 'UnknownError',
      code: error.code || 'NO_CODE',
    });
  }
}
