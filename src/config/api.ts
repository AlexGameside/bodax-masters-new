/**
 * API Configuration
 * 
 * This file centralizes all API endpoint URLs.
 * 
 * To update the API URL:
 * 
 * Option 1: Environment Variable (for local development or CI/CD)
 * - Create a `.env` file in the project root (not committed to git)
 * - Add: VITE_API_URL=https://your-oauth-proxy-url.vercel.app/api
 * - This gets baked into the build at build time
 * 
 * Option 2: Update the FALLBACK_API_URL constant below (simplest)
 * - Just update line 21 with your new URL
 * - This is the easiest solution since Firebase Hosting doesn't support runtime env vars
 * 
 * Note: The fallback uses a custom Vercel domain (oauth-proxy-gilt.vercel.app)
 * which should be stable and not change with each deployment. If you need to
 * update it, just change the FALLBACK_API_URL constant below.
 */

// Fallback API URL - update this if VITE_API_URL is not set
// Using custom domain for stability (doesn't change with each deployment)
const FALLBACK_API_URL = 'https://server.bodax-masters.de/api';

/**
 * Get the base API URL
 * Priority:
 * 1. VITE_API_URL environment variable (set in Firebase Hosting)
 * 2. FALLBACK_API_URL constant (update this file if needed)
 */
export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    // Ensure it ends with /api if not already
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  return FALLBACK_API_URL;
};

/**
 * Get full API endpoint URL
 */
export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiUrl();
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};

// Export commonly used endpoints
export const API_ENDPOINTS = {
  stripe: {
    createConnectOnboarding: () => getApiEndpoint('stripe/create-connect-onboarding'),
    checkAccountStatus: () => getApiEndpoint('stripe/check-account-status'),
    createCheckoutSession: () => getApiEndpoint('stripe/create-checkout-session'),
    verifyPaymentSession: () => getApiEndpoint('stripe/verify-payment-session'),
  },
  discord: {
    token: () => getApiEndpoint('discord/token'),
    user: () => getApiEndpoint('discord/user'),
    sendNotification: () => getApiEndpoint('discord/send-notification'),
  },
  riot: {
    token: () => getApiEndpoint('riot/token'),
    user: () => getApiEndpoint('riot/user'),
  },
} as const;
