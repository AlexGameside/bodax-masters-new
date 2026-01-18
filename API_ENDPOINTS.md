# Stripe API Endpoints Documentation

## Required Backend Endpoints

These endpoints need to be implemented on your backend (Firebase Cloud Functions, Express server, etc.)

### Environment Variables
```env
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_... (get from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
```

### 1. Create Stripe Connect Onboarding Link
**POST** `/api/stripe/create-connect-onboarding`

**Request Body:**
```json
{
  "organizerId": "user_id_here"
}
```

**Response:**
```json
{
  "onboardingUrl": "https://connect.stripe.com/setup/..."
}
```

**Implementation:**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/stripe/create-connect-onboarding', async (req, res) => {
  try {
    const { organizerId } = req.body;
    
    const accountLink = await stripe.accountLinks.create({
      account: organizerId, // This should be the Stripe Connect account ID
      refresh_url: `${process.env.FRONTEND_URL}/organizer/apply?refresh=true`,
      return_url: `${process.env.FRONTEND_URL}/organizer/apply?success=true`,
      type: 'account_onboarding',
    });
    
    res.json({ onboardingUrl: accountLink.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Create Checkout Session
**POST** `/api/stripe/create-checkout-session`

**Request Body:**
```json
{
  "tournamentId": "tournament_id",
  "teamId": "team_id",
  "entryFee": 50.00,
  "organizerId": "organizer_user_id",
  "successUrl": "https://bodax.com/tournaments/123?payment=success",
  "cancelUrl": "https://bodax.com/tournaments/123?payment=cancelled"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/...",
  "sessionId": "cs_test_..."
}
```

**Implementation:**
```javascript
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { tournamentId, teamId, entryFee, organizerId, successUrl, cancelUrl } = req.body;
    
    // Get organizer's Stripe Connect account ID from database
    const organizer = await getOrganizerFromDB(organizerId);
    const connectAccountId = organizer.organizerInfo.stripeConnectAccountId;
    
    // Calculate platform fee (5%)
    const platformFee = Math.round(entryFee * 0.05 * 100);
    const organizerAmount = Math.round(entryFee * 0.95 * 100);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Tournament Entry Fee - Team ${teamId}`,
            description: `Participation fee for tournament ${tournamentId}`,
          },
          unit_amount: Math.round(entryFee * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: connectAccountId,
        },
        metadata: {
          tournamentId,
          teamId,
          organizerId,
          entryFee: entryFee.toString(),
          platformFee: platformFee.toString(),
        },
      },
    });
    
    res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Process Payout
**POST** `/api/stripe/process-payout`

**Request Body:**
```json
{
  "tournamentId": "tournament_id",
  "organizerStripeAccountId": "acct_...",
  "payoutAmount": 475.00
}
```

**Response:**
```json
{
  "transferId": "tr_...",
  "status": "paid"
}
```

**Implementation:**
```javascript
app.post('/api/stripe/process-payout', async (req, res) => {
  try {
    const { tournamentId, organizerStripeAccountId, payoutAmount } = req.body;
    
    // Create transfer to organizer's connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(payoutAmount * 100), // Convert to cents
      currency: 'eur',
      destination: organizerStripeAccountId,
      metadata: {
        tournamentId,
        type: 'tournament_payout',
      },
    });
    
    res.json({ 
      transferId: transfer.id,
      status: transfer.status 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Process Refund
**POST** `/api/stripe/process-refund`

**Request Body:**
```json
{
  "paymentIntentId": "pi_...",
  "amount": 50.00  // Optional, if not provided, full refund
}
```

**Response:**
```json
{
  "refundId": "re_...",
  "status": "succeeded"
}
```

**Implementation:**
```javascript
app.post('/api/stripe/process-refund', async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;
    
    const refundParams = {
      payment_intent: paymentIntentId,
    };
    
    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }
    
    const refund = await stripe.refunds.create(refundParams);
    
    res.json({ 
      refundId: refund.id,
      status: refund.status 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Stripe Webhook Handler
**POST** `/api/stripe/webhook`

**Implementation:**
```javascript
const express = require('express');
const app = express();

// Stripe webhook endpoint (must be raw body)
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update tournament registration with payment status
      await handlePaymentSuccess(session);
      break;
      
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Confirm team registration
      await handlePaymentIntentSuccess(paymentIntent);
      break;
      
    case 'transfer.created':
      const transfer = event.data.object;
      // Update tournament payout status
      await handlePayoutCreated(transfer);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

## Security Notes

1. **Never expose secret keys** - Only use publishable key in frontend
2. **Validate all inputs** - Check amounts, IDs, etc.
3. **Verify webhook signatures** - Always validate Stripe webhooks
4. **Use HTTPS** - All endpoints must use HTTPS
5. **Rate limiting** - Implement rate limiting on payment endpoints
6. **Logging** - Log all payment transactions for audit

## Testing

Use Stripe test mode keys for development:
- Test publishable key: `pk_test_...`
- Test secret key: `sk_test_...`

Test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
