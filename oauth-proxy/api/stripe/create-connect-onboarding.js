// Stripe Connect onboarding link creation endpoint
// Deploy this to Vercel as a serverless function

import Stripe from 'stripe';

// Helper function to check if two emails are similar (handles typos like double letters)
function emailsAreSimilar(email1, email2) {
  if (!email1 || !email2) return false;
  
  const e1 = email1.toLowerCase().trim();
  const e2 = email2.toLowerCase().trim();
  
  // Exact match
  if (e1 === e2) return true;
  
  // Check if same domain
  const domain1 = e1.split('@')[1];
  const domain2 = e2.split('@')[1];
  if (domain1 !== domain2) return false;
  
  // Check local parts (before @)
  const local1 = e1.split('@')[0];
  const local2 = e2.split('@')[0];
  
  // If one is just the other with a repeated character (common typo), consider it a match
  // e.g., "ckechagias" vs "ckechaagias" (double 'a')
  if (local1.length === local2.length - 1) {
    // Check if local2 is local1 with one extra character
    for (let i = 0; i < local2.length; i++) {
      const withoutChar = local2.slice(0, i) + local2.slice(i + 1);
      if (withoutChar === local1) return true;
    }
  }
  
  if (local2.length === local1.length - 1) {
    // Check if local1 is local2 with one extra character
    for (let i = 0; i < local1.length; i++) {
      const withoutChar = local1.slice(0, i) + local1.slice(i + 1);
      if (withoutChar === local2) return true;
    }
  }
  
  // Check if very similar (only 1-2 char difference)
  let diff = 0;
  const minLen = Math.min(local1.length, local2.length);
  for (let i = 0; i < minLen; i++) {
    if (local1[i] !== local2[i]) diff++;
  }
  diff += Math.abs(local1.length - local2.length);
  
  // If difference is 1-2 characters, consider it similar
  return diff <= 2;
}

export default async function handler(req, res) {
  // Handle CORS preflight request FIRST - before any other logic
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return;
  }

  // Set CORS headers for all other requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    // Log key prefix for debugging (don't log full key)
    const isTestMode = stripeSecretKey.startsWith('sk_test_');
    const isLiveMode = stripeSecretKey.startsWith('sk_live_');
    console.log('Using Stripe key:', stripeSecretKey.substring(0, 7) + '...' + stripeSecretKey.substring(stripeSecretKey.length - 4));
    console.log('Stripe mode:', isTestMode ? 'TEST MODE (Sandbox)' : (isLiveMode ? 'LIVE MODE' : 'UNKNOWN'));
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      timeout: 60000, // 60 second timeout for production
      maxNetworkRetries: 3,
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    const { organizerId, email } = req.body;

    if (!organizerId) {
      return res.status(400).json({ error: 'organizerId is required' });
    }

    // Get frontend URL first (needed for existing account check and account creation)
    let frontendUrl = process.env.PRODUCTION_URL || process.env.FRONTEND_URL || 'https://bodax-masters.web.app';
    frontendUrl = String(frontendUrl).trim();
    if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
      frontendUrl = `https://${frontendUrl}`;
    }
    frontendUrl = frontendUrl.replace(/\/$/, '');
    
    const isLiveMode = stripeSecretKey.startsWith('sk_live_');
    if (isLiveMode && frontendUrl.startsWith('http://')) {
      const productionUrl = process.env.PRODUCTION_URL;
      if (productionUrl && productionUrl.startsWith('https://')) {
        frontendUrl = String(productionUrl).trim().replace(/\/$/, '');
      } else {
        throw new Error('Live mode requires HTTPS URLs. Please set PRODUCTION_URL environment variable with your HTTPS domain, or use Stripe test mode for local development.');
      }
    }
    
    let validatedUrl;
    try {
      validatedUrl = new URL(frontendUrl);
    } catch (urlError) {
      console.error('Invalid frontend URL:', frontendUrl, urlError);
      throw new Error(`Invalid frontend URL format: ${frontendUrl}. Please check PRODUCTION_URL and FRONTEND_URL environment variables. Error: ${urlError.message}`);
    }
    
    const finalFrontendUrl = validatedUrl.href.replace(/\/$/, '');

    // Check if an account with this email already exists
    if (email) {
      try {
        console.log('=== DEBUG: Checking for existing Stripe Connect account ===');
        console.log('Searching for email:', email);
        
        // First, list ALL accounts to see what we have
        console.log('Listing ALL Stripe Connect accounts...');
        const allAccounts = await stripe.accounts.list({
          limit: 100, // Get up to 100 accounts
        });
        
        console.log(`Total accounts found: ${allAccounts.data.length}`);
        console.log('All accounts with emails:');
        allAccounts.data.forEach((acc, index) => {
          console.log(`  Account ${index + 1}:`, {
            id: acc.id,
            email: acc.email || 'NO EMAIL',
            type: acc.type,
            charges_enabled: acc.charges_enabled,
            payouts_enabled: acc.payouts_enabled,
            details_submitted: acc.details_submitted,
          });
        });
        
        // Now search specifically by email (case-insensitive comparison)
        console.log(`\nSearching specifically for email: ${email}`);
        const existingAccounts = await stripe.accounts.list({
          email: email,
          limit: 10,
        });

        console.log(`Accounts found with email "${email}": ${existingAccounts.data.length}`);
        if (existingAccounts.data.length > 0) {
          existingAccounts.data.forEach((acc, index) => {
            console.log(`  Match ${index + 1}:`, {
              id: acc.id,
              email: acc.email,
              charges_enabled: acc.charges_enabled,
              payouts_enabled: acc.payouts_enabled,
              details_submitted: acc.details_submitted,
            });
          });
        }
        
        // Also do manual case-insensitive search on all accounts (in case API search missed it)
        const searchEmailLower = email.toLowerCase().trim();
        console.log(`\nDoing manual case-insensitive search for: "${searchEmailLower}"`);
        const exactMatches = allAccounts.data.filter(acc => {
          if (!acc.email) return false;
          return acc.email.toLowerCase().trim() === searchEmailLower;
        });
        
        console.log(`Exact case-insensitive matches found: ${exactMatches.length}`);
        
        // Also try fuzzy matching for typos (e.g., single vs double letters)
        // Calculate Levenshtein distance for similar emails
        const fuzzyMatches = allAccounts.data.filter(acc => {
          if (!acc.email) return false;
          const accEmailLower = acc.email.toLowerCase().trim();
          if (accEmailLower === searchEmailLower) return false; // Already in exact matches
          
          // Check if emails are very similar (same length or 1 char difference, same domain)
          const searchDomain = searchEmailLower.split('@')[1];
          const accDomain = accEmailLower.split('@')[1];
          
          if (searchDomain !== accDomain) return false; // Different domains, not a match
          
          const searchLocal = searchEmailLower.split('@')[0];
          const accLocal = accEmailLower.split('@')[0];
          
          // Check if local parts are very similar (1-2 character difference)
          const lengthDiff = Math.abs(searchLocal.length - accLocal.length);
          if (lengthDiff > 2) return false; // Too different
          
          // Use the emailsAreSimilar function to check if emails match (handles typos)
          return emailsAreSimilar(email, acc.email);
        });
        
        console.log(`Fuzzy matches found: ${fuzzyMatches.length}`);
        
        // Combine exact and fuzzy matches
        const manualMatches = [...exactMatches, ...fuzzyMatches];
        
        if (manualMatches.length > 0) {
          manualMatches.forEach((acc, index) => {
            console.log(`  Manual Match ${index + 1}:`, {
              id: acc.id,
              email: acc.email,
              matchType: exactMatches.includes(acc) ? 'exact' : 'fuzzy',
              charges_enabled: acc.charges_enabled,
              payouts_enabled: acc.payouts_enabled,
              details_submitted: acc.details_submitted,
            });
          });
        }

        // Use API results if found, otherwise use manual matches
        const accountsToCheck = existingAccounts.data.length > 0 ? existingAccounts.data : manualMatches;
        const foundVia = existingAccounts.data.length > 0 ? 'API search' : (manualMatches.length > 0 ? 'Manual case-insensitive search' : 'none');

        if (accountsToCheck && accountsToCheck.length > 0) {
          // Found existing account(s) with this email
          const existingAccount = accountsToCheck[0];
          console.log('=== Using existing account ===');
          console.log('Account ID:', existingAccount.id);
          console.log('Account email:', existingAccount.email);
          console.log('Found via:', foundVia);
          
          // Check if this account is already linked to this organizer
          // We'll return the existing account ID and create a new onboarding link if needed
          const accountId = existingAccount.id;
          
          // Check if account is fully onboarded
          const isOnboarded = existingAccount.details_submitted && 
                             existingAccount.charges_enabled && 
                             existingAccount.payouts_enabled;
          
          if (isOnboarded) {
            // Account is fully set up, return it
            return res.status(200).json({
              onboardingUrl: null,
              accountId: accountId,
              existingAccount: true,
              message: 'A Stripe Connect account with this email already exists and is fully set up.',
            });
          } else {
            // Account exists but not fully onboarded, create new onboarding link
            const refreshUrl = `${finalFrontendUrl}/organizer/dashboard?refresh=true`;
            const returnUrl = `${finalFrontendUrl}/organizer/dashboard?success=true`;
            
            const accountLink = await stripe.accountLinks.create({
              account: accountId,
              refresh_url: refreshUrl,
              return_url: returnUrl,
              type: 'account_onboarding',
            });
            
            return res.status(200).json({
              onboardingUrl: accountLink.url,
              accountId: accountId,
              existingAccount: true,
              message: 'A Stripe Connect account with this email already exists. Please complete the onboarding process.',
            });
          }
        }
      } catch (checkError) {
        console.error('Error checking for existing account:', checkError);
        // Continue with account creation if check fails (non-critical)
      }
    }

    // Continue with account creation if no existing account found
    // Use the already validated finalFrontendUrl from earlier

    // First, create a Stripe Connect Express account for the organizer
    // Note: Platform must accept responsibility for losses in Stripe Dashboard (for live mode)
    // Settings > Connect > Platform profile > Accept responsibility for losses
    console.log('Creating Stripe Connect account for organizer:', organizerId);
    
    const accountData = {
      type: 'express',
      country: 'DE', // Default to Germany, can be made dynamic
    };
    
    // Add email if provided
    if (req.body.email) {
      accountData.email = req.body.email;
    }
    
    // Request capabilities
    accountData.capabilities = {
      card_payments: { requested: true },
      transfers: { requested: true },
    };
    
    // Only set payout schedule for live mode (test mode doesn't need this)
    if (isLiveMode) {
      accountData.settings = {
        payouts: {
          schedule: {
            interval: 'manual', // Manual payouts - you control when to pay out
          },
        },
      };
    }
    
    console.log('Account data:', JSON.stringify(accountData, null, 2));
    
    // Create account with better error handling
    let account;
    try {
      account = await stripe.accounts.create(accountData);
      console.log('Account created:', account.id);
    } catch (accountError) {
      console.error('Stripe account creation error:', accountError);
      // If it's a connection error, provide more helpful message
      if (accountError.type === 'StripeConnectionError' || accountError.message?.includes('connection')) {
        throw new Error(`Unable to connect to Stripe API. This may be a temporary issue. Please try again in a few moments. If the problem persists, check your Stripe account status and API key. Error: ${accountError.message}`);
      }
      throw accountError;
    }

    // Create account link for onboarding
    // Ensure URLs are properly formatted
    const refreshUrl = `${finalFrontendUrl}/organizer/dashboard?refresh=true`;
    const returnUrl = `${finalFrontendUrl}/organizer/dashboard?success=true`;
    
    console.log('Constructed URLs for account link:', {
      frontendUrl,
      refreshUrl,
      returnUrl
    });
    
    // Validate URLs before sending to Stripe
    let validatedRefreshUrl, validatedReturnUrl;
    try {
      validatedRefreshUrl = new URL(refreshUrl);
      validatedReturnUrl = new URL(returnUrl);
      console.log('URL validation passed:', {
        refreshUrl: validatedRefreshUrl.href,
        returnUrl: validatedReturnUrl.href
      });
    } catch (urlError) {
      console.error('Invalid URL format:', { refreshUrl, returnUrl, frontendUrl, error: urlError.message });
      throw new Error(`Invalid URL format for Stripe account link. Frontend URL: ${frontendUrl}, Refresh URL: ${refreshUrl}, Return URL: ${returnUrl}. Error: ${urlError.message}`);
    }
    
    // Use validated URLs
    const finalRefreshUrl = validatedRefreshUrl.href;
    const finalReturnUrl = validatedReturnUrl.href;
    
    console.log('Creating account link with validated URLs:', { 
      refreshUrl: finalRefreshUrl, 
      returnUrl: finalReturnUrl 
    });
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: finalRefreshUrl,
        return_url: finalReturnUrl,
        type: 'account_onboarding',
      });
      console.log('Account link created successfully');
    } catch (linkError) {
      console.error('Stripe account link creation error:', linkError);
      // If account was created but link failed, we still have the account
      if (account && account.id) {
        // Return the account ID so it can be saved, but indicate link creation failed
        throw new Error(`Account created but failed to generate onboarding link: ${linkError.message}. Account ID: ${account.id}`);
      }
      throw linkError;
    }

    res.status(200).json({
      onboardingUrl: accountLink.url,
      accountId: account.id, // Return the account ID so it can be saved to Firestore
    });
  } catch (error) {
    console.error('Error creating Stripe Connect onboarding link:', error);
    console.error('Error details:', {
      type: error.type,
      code: error.code,
      message: error.message,
      raw: error.raw ? JSON.stringify(error.raw, null, 2) : 'No raw error',
    });
    
    // Provide helpful error message for common Stripe Connect setup issues
    let errorMessage = error.message || 'Failed to create onboarding link';
    let statusCode = 500;
    
    if (error.message && error.message.includes('responsibilities of managing losses')) {
      errorMessage = 'Stripe Connect setup required: The platform must accept responsibility for managing losses. Please configure this in Stripe Dashboard: Settings > Connect > Platform profile > Accept responsibility for losses. This is a one-time setup required by Stripe.';
      statusCode = 400; // Bad request - configuration issue
    } else if (error.message && error.message.includes('HTTPS')) {
      errorMessage = 'Live mode requires HTTPS URLs. Please set PRODUCTION_URL environment variable in Vercel with your HTTPS domain (e.g., https://bodax.com). For local development, use Stripe test mode keys.';
      statusCode = 400;
    } else if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAPIError' || error.type === 'StripeConnectionError') {
      errorMessage = `Stripe API error: ${error.message || 'Connection failed'}. ${error.code ? `Code: ${error.code}` : ''}`;
      statusCode = 400;
    } else if (error.message && error.message.includes('connection to Stripe')) {
      errorMessage = `Stripe connection error: ${error.message}. Please check your Stripe API key and network connection.`;
      statusCode = 500;
    }
    
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
    
    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      debug: errorDetails, // Include full debug info for frontend
      type: error.type || 'UnknownError',
      code: error.code || 'NO_CODE',
      stripeError: error.raw || null,
    });
  }
}
