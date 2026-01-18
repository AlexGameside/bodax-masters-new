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
      console.error('Stripe secret key not configured');
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // Log key prefix for debugging (without exposing full key)
    const keyPrefix = stripeSecretKey.substring(0, 7);
    console.log('Using Stripe key:', keyPrefix + '...', 'Mode:', keyPrefix.startsWith('sk_live') ? 'LIVE' : 'TEST');

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      timeout: 60000,
      maxNetworkRetries: 3,
      httpClient: Stripe.createFetchHttpClient(), // Required for Vercel serverless functions
    });

    const { tournamentId, teamId, entryFee, organizerId, successUrl, cancelUrl } = req.body;

    if (!tournamentId || !teamId || !entryFee || !organizerId) {
      return res.status(400).json({ error: 'Missing required fields: tournamentId, teamId, entryFee, organizerId' });
    }

    // Get frontend URL
    let frontendUrl = process.env.PRODUCTION_URL || process.env.FRONTEND_URL || 'https://bodax-masters.web.app';
    frontendUrl = String(frontendUrl).trim().replace(/\/$/, '');

    // Validate URLs
    try {
      new URL(frontendUrl);
      if (successUrl) new URL(successUrl);
      if (cancelUrl) new URL(cancelUrl);
    } catch (urlError) {
      return res.status(400).json({ error: `Invalid URL format: ${urlError.message}` });
    }

    const finalSuccessUrl = successUrl || `${frontendUrl}/tournaments/${tournamentId}?payment=success`;
    const finalCancelUrl = cancelUrl || `${frontendUrl}/tournaments/${tournamentId}?payment=cancelled`;

    console.log('Creating checkout session:', {
      tournamentId,
      teamId,
      entryFee,
      organizerId,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
    });

    // Calculate entry fee in cents
    const entryFeeCents = Math.round(entryFee * 100);

    console.log('Fee calculation:', {
      entryFeeCents,
      note: 'All payments go to platform account. Payouts to organizers/players handled manually.',
    });

    // Create Stripe Checkout Session using platform account directly
    // All payments go to the platform account - no Connect accounts needed
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Tournament Entry Fee`,
                description: 'Tournament participation and administration fee',
              },
              unit_amount: entryFeeCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${finalSuccessUrl}${finalSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: finalCancelUrl,
        metadata: {
          tournamentId,
          teamId,
          organizerId,
        },
        // No Connect account needed - all payments go to platform account
      }, {
        timeout: 60000, // 60 second timeout
        maxNetworkRetries: 3, // Standard retries
      });

      console.log('Checkout session created successfully:', session.id);

      res.status(200).json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
      return;
    } catch (sessionError) {
      console.error('Error creating Stripe checkout session:', sessionError);
      console.error('Session error details:', {
        type: sessionError.type,
        code: sessionError.code,
        message: sessionError.message,
        statusCode: sessionError.statusCode,
      });
      throw sessionError; // Re-throw to be caught by outer catch block
    }

    console.log('Checkout session created:', session.id);

    res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('=== ERROR CREATING CHECKOUT SESSION ===');
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error statusCode:', error.statusCode);
    console.error('Error requestId:', error.requestId);
    console.error('Error stack:', error.stack);
    if (error.raw) {
      console.error('Stripe raw error:', JSON.stringify(error.raw, null, 2));
    }
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Prepare detailed error information for frontend logging
    const errorDetails = {
      type: error.type || 'UnknownError',
      code: error.code || 'NO_CODE',
      message: error.message || 'Unknown error',
      statusCode: error.statusCode || null,
      requestId: error.requestId || null,
      raw: error.raw ? {
        message: error.raw.message,
        type: error.raw.type,
        code: error.raw.code,
        status: error.raw.status,
      } : null,
      connectionInfo: error.type === 'StripeConnectionError' ? {
        hostname: error.hostname,
        port: error.port,
        errno: error.errno,
        syscall: error.syscall,
      } : null,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    
    console.error('Prepared error details:', JSON.stringify(errorDetails, null, 2));
    
    let errorMessage = error.message || 'Failed to create checkout session';
    let statusCode = 500;

    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'parameter_invalid_empty') {
        errorMessage = `Invalid parameter: ${error.message}`;
        statusCode = 400;
      } else {
        errorMessage = `Stripe API error: ${error.message}`;
        statusCode = 400;
      }
    } else if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
      errorMessage = `Connection to Stripe failed: ${error.message}. Please try again in a moment.`;
      statusCode = 503; // Service Unavailable
      
      // Add more specific connection error details
      if (error.hostname) {
        errorDetails.connectionDetails = `Failed to connect to ${error.hostname}:${error.port || 443}`;
      }
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Request to Stripe timed out. Please try again.';
      statusCode = 504; // Gateway Timeout
    }

    // Return detailed error information for frontend debugging
    const response = {
      error: errorMessage,
      details: error.message,
      debug: errorDetails, // Include full debug info
      type: error.type || 'UnknownError',
      code: error.code || 'NO_CODE',
      stripeError: error.raw || null, // Include raw Stripe error
    };
    
    console.error('Sending error response:', JSON.stringify(response, null, 2));
    
    res.status(statusCode).json(response);
  }
}
