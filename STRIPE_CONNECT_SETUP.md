# Stripe Connect Setup Guide

## Important: Platform Configuration Required

Before you can create Stripe Connect accounts for organizers, you **must** configure your Stripe platform to accept responsibility for managing losses.

## Step 1: Accept Responsibility for Losses

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Settings** > **Connect** > **Platform profile**
3. Scroll down to **"Responsibility for managing losses"**
4. Click **"Accept responsibility"**
5. Review and confirm the terms

This is a **one-time setup** required by Stripe for all platforms using Connect Express accounts.

## Step 2: Set Production URL (Required for Live Mode)

If you're using **live Stripe keys** (sk_live_...), you **must** set a production HTTPS URL:

1. Go to your [Vercel Dashboard](https://vercel.com)
2. Select your `oauth-proxy` project
3. Go to **Settings** > **Environment Variables**
4. Add/Update: `PRODUCTION_URL` with your HTTPS domain
   - Example: `https://bodax.com` or `https://yourdomain.com`
   - **Must be HTTPS** (not HTTP)
5. Redeploy the function

**Note:** For local development with live keys, you'll need to use a tunnel service (like ngrok) or use Stripe test mode keys instead.

## Step 3: Verify Configuration

After accepting responsibility and setting the production URL, you should be able to:
- Create Stripe Connect Express accounts
- Generate onboarding links for organizers
- Process payments and payouts

## Why This Is Required

Stripe requires platforms to accept responsibility for:
- Chargebacks and disputes
- Fraud prevention
- Compliance with payment regulations
- Managing connected account risks

This is standard for all Stripe Connect platforms and protects both you and your organizers.

## Testing

After completing the setup:
1. Try creating an organizer account
2. Click "Setup Payments" in the organizer dashboard
3. You should be redirected to Stripe Connect onboarding (not see an error)

## Troubleshooting

If you still see errors after accepting responsibility:
- Wait a few minutes for Stripe to process the change
- Check that you're using the correct Stripe account (live vs test)
- Verify your Stripe API keys are correct
- Check Vercel environment variables are set correctly

## Support

If issues persist, contact Stripe support or check the [Stripe Connect documentation](https://stripe.com/docs/connect).
