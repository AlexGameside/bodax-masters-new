import Stripe from 'stripe';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Verify webhook signature
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
      // In development, we might not have webhook secret set
      // Parse the event without verification (NOT RECOMMENDED FOR PRODUCTION)
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    } else {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        // Extract metadata from checkout session
        const { tournamentId, teamId, organizerId } = session.metadata || {};

        if (!tournamentId || !teamId) {
          console.error('Missing required metadata in checkout session:', { tournamentId, teamId });
          return res.status(400).json({ error: 'Missing tournamentId or teamId in metadata' });
        }

        // Get payment intent to get payment details
        let paymentIntentId = null;
        let paymentAmount = 0;

        if (session.payment_intent) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
            paymentIntentId = paymentIntent.id;
            paymentAmount = paymentIntent.amount / 100; // Convert from cents to euros
          } catch (piError) {
            console.error('Error retrieving payment intent:', piError);
            // Use session amount as fallback
            paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
          }
        } else if (session.amount_total) {
          paymentAmount = session.amount_total / 100;
        }

        console.log('Processing payment completion:', {
          tournamentId,
          teamId,
          paymentIntentId,
          paymentAmount,
          sessionId: session.id,
        });

        // Call Firebase function or API to register the team
        // Since we can't directly access Firestore from Vercel, we'll need to call a Firebase Cloud Function
        // OR we can make an HTTP request to a Firebase Cloud Function endpoint
        // For now, we'll log and return success - the frontend will handle registration via URL callback
        
        // TODO: If you have a Firebase Cloud Function endpoint, call it here:
        // const firebaseFunctionUrl = process.env.FIREBASE_FUNCTION_URL;
        // if (firebaseFunctionUrl) {
        //   await fetch(`${firebaseFunctionUrl}/registerTeamAfterPayment`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ tournamentId, teamId, paymentIntentId, paymentAmount }),
        //   });
        // }

        console.log('Payment completed successfully - team registration should be handled by frontend callback');
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        // Additional handling if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment intent failed:', paymentIntent.id);
        // Handle failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook', details: error.message });
  }
}
