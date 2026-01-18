# Troubleshooting Stripe Connect Connection Errors

## Current Issue: Connection Error

If you're seeing "An error occurred with our connection to Stripe. Request was retried 1 times", this could be:

1. **Network/Timeout Issue** - Stripe API might be temporarily unavailable
2. **API Key Issue** - The test key might not be properly configured
3. **Stripe Account Issue** - Your Stripe account might need additional setup

## Steps to Debug

### 1. Check Vercel Logs

View the detailed error logs in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your `oauth-proxy` project
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click **Functions** tab
6. Click on `api/stripe/create-connect-onboarding`
7. View the **Logs** to see the detailed error

The logs will show:
- The exact Stripe error message
- Error code
- Full error details

### 2. Verify Environment Variables

Make sure in Vercel:
- `STRIPE_SECRET_KEY` is set to: `YOUR_STRIPE_SECRET_KEY`
- `FRONTEND_URL` is set to: `http://localhost:5173`

### 3. Test Stripe API Directly

You can test if the Stripe key works by running this in Node.js:

```javascript
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Test connection
stripe.accounts.list({ limit: 1 })
  .then(() => console.log('Stripe connection works!'))
  .catch(err => console.error('Stripe error:', err));
```

### 4. Check Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Check **Developers** > **API keys** - verify the test keys match
4. Check for any account restrictions or issues

### 5. Common Solutions

**If it's a timeout issue:**
- Wait a few minutes and try again
- Stripe API might be experiencing issues

**If it's a key issue:**
- Verify the key is correct in Vercel
- Make sure there are no extra spaces or characters
- Redeploy after updating the key

**If it's an account issue:**
- Make sure your Stripe account is fully activated
- Check for any account restrictions in Stripe Dashboard

## Next Steps

After checking the Vercel logs, share the exact error message and I can help fix it!
