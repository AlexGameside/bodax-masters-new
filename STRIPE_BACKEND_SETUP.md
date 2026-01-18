# Stripe Backend Setup Guide

## Overview
This guide explains how to set up the Stripe backend API endpoints for the Bodax tournament payment system.

## Prerequisites
- Vercel account (or another serverless platform)
- Stripe account with API keys
- Node.js installed locally (for testing)

## Step 1: Install Dependencies

Navigate to the `oauth-proxy` directory and install Stripe:

```bash
cd oauth-proxy
npm install stripe
```

## Step 2: Set Up Environment Variables

### In Vercel Dashboard:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
FRONTEND_URL=https://your-frontend-domain.com
```

**Important:** 
- Never commit the secret key to Git
- Use test keys (`sk_test_...`) for development
- Use live keys (`sk_live_...`) only in production

### For Local Development:
Create a `.env` file in the `oauth-proxy` directory:

```env
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
```

## Step 3: Deploy to Vercel

1. Make sure you're in the `oauth-proxy` directory
2. Deploy using Vercel CLI:

```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Step 4: Update Frontend Environment Variables

In your main project `.env` file, add:

```env
VITE_API_URL=https://your-vercel-deployment.vercel.app/api
```

Replace `your-vercel-deployment` with your actual Vercel deployment URL.

## Step 5: Test the Endpoint

You can test the endpoint using curl:

```bash
curl -X POST https://your-vercel-deployment.vercel.app/api/stripe/create-connect-onboarding \
  -H "Content-Type: application/json" \
  -d '{"organizerId": "test_user_id", "email": "test@example.com"}'
```

## API Endpoints Created

### 1. Create Stripe Connect Onboarding
- **Path:** `/api/stripe/create-connect-onboarding`
- **Method:** POST
- **Body:** `{ organizerId: string, email?: string }`
- **Response:** `{ onboardingUrl: string, accountId: string }`

## Next Steps

After setting up this endpoint, you'll need to create additional endpoints for:
- Payment checkout sessions
- Payout processing
- Refund processing
- Webhook handling

See `API_ENDPOINTS.md` for full implementation details.

## Troubleshooting

### Error: "Stripe secret key not configured"
- Make sure `STRIPE_SECRET_KEY` is set in Vercel environment variables
- Redeploy after adding environment variables

### Error: "CORS error"
- The endpoint includes CORS headers, but make sure your frontend URL is correct
- Check that `FRONTEND_URL` environment variable is set

### Error: "Module not found: stripe"
- Run `npm install stripe` in the `oauth-proxy` directory
- Make sure `package.json` includes the stripe dependency

## Security Notes

1. **Never expose secret keys** - Only use in backend/serverless functions
2. **Use HTTPS** - All API calls must use HTTPS in production
3. **Validate inputs** - Always validate organizer IDs and other inputs
4. **Rate limiting** - Consider adding rate limiting to prevent abuse
5. **Logging** - Monitor API usage and errors in Vercel logs
