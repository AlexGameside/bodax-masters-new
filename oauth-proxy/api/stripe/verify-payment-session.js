import Stripe from 'stripe';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET or POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      timeout: 60000,
      maxNetworkRetries: 3,
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get session ID from query params or body
    const sessionId = req.method === 'GET' 
      ? req.query.session_id 
      : req.body.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not completed',
        payment_status: session.payment_status 
      });
    }

    // Extract metadata
    const { tournamentId, teamId, organizerId } = session.metadata || {};

    // Get payment intent details
    let paymentIntentId = null;
    let paymentAmount = 0;

    if (session.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        paymentIntentId = paymentIntent.id;
        paymentAmount = paymentIntent.amount / 100; // Convert from cents
      } catch (piError) {
        console.error('Error retrieving payment intent:', piError);
        paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
      }
    } else if (session.amount_total) {
      paymentAmount = session.amount_total / 100;
    }

    // Return payment verification details
    res.status(200).json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        payment_intent: paymentIntentId,
        amount: paymentAmount,
      },
      metadata: {
        tournamentId,
        teamId,
        organizerId,
      },
    });
  } catch (error) {
    console.error('Error verifying payment session:', error);
    
    let errorMessage = 'Failed to verify payment session';
    let statusCode = 500;

    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Payment session not found';
        statusCode = 404;
      } else {
        errorMessage = `Stripe API error: ${error.message}`;
        statusCode = 400;
      }
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
    });
  }
}
