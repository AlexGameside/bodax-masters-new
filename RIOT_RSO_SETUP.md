# Riot Sign-On (RSO) Setup Guide

This guide will help you set up Riot Sign-On (RSO) authentication for your application.

## Prerequisites

1. **Riot Developer Account**: You need a Riot Developer Portal account
2. **Production API Key**: RSO requires a production-level API key (not development)
3. **Client ID**: `9a2ae5ad-6116-4173-a13f-eb39c15fa4c8` ✅
4. **Client Secret**: `mxjMgMRwX0GBtgJyzw_M8HDsXdzkp9iwY3LMzUhq_2_` ✅

## Step 1: Configure Riot Developer Portal

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Navigate to your application settings
3. Add your redirect URIs (you can add multiple):
   - **Development**: `http://127.0.0.1:5173/riot/callback` (use 127.0.0.1 instead of localhost)
   - **Production**: `https://bodax-masters.web.app/riot/callback`
   
   **Note**: Riot Developer Portal may not accept `localhost` URLs. Use `127.0.0.1` instead.
4. Note your **Client ID**: `9a2ae5ad-6116-4173-a13f-eb39c15fa4c8` ✅

## Step 2: Set Environment Variables

### Frontend Environment Variables

Create or update your `.env` file in the project root:

```env
# Riot RSO Configuration
VITE_RIOT_CLIENT_ID=9a2ae5ad-6116-4173-a13f-eb39c15fa4c8
VITE_OAUTH_PROXY_URL=https://your-oauth-proxy.vercel.app
```

### OAuth Proxy Environment Variables (Vercel)

In your Vercel dashboard for the `oauth-proxy` project, add these environment variables:

```env
# Riot RSO Configuration
RIOT_CLIENT_ID=9a2ae5ad-6116-4173-a13f-eb39c15fa4c8
RIOT_CLIENT_SECRET=mxjMgMRwX0GBtgJyzw_M8HDsXdzkp9iwY3LMzUhq_2_
```

**Important**: The client secret should NEVER be exposed in the frontend code. It must only be stored in the OAuth proxy backend.

## Step 3: Deploy OAuth Proxy

The OAuth proxy handles the secure token exchange on the backend.

1. **Navigate to oauth-proxy directory:**
   ```bash
   cd oauth-proxy
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - Go to your Vercel project settings
   - Add `RIOT_CLIENT_ID` and `RIOT_CLIENT_SECRET`
   - Redeploy if needed

4. **Get your proxy URL:**
   - After deployment, you'll get a URL like: `https://your-app.vercel.app`
   - Update `VITE_OAUTH_PROXY_URL` in your frontend `.env` file

## Step 4: How RSO Works

1. **User clicks "Link Riot Account"** → Redirected to Riot OAuth
2. **Riot redirects back** with authorization code to `/riot-callback`
3. **Frontend sends code to OAuth proxy** (secure, no client secret exposed)
4. **Proxy exchanges code for token** using Riot API with client secret
5. **Frontend gets access token** and fetches account info
6. **Riot ID saved to Firebase** user profile

## Step 5: Riot OAuth Endpoints

The setup uses these Riot endpoints:

- **Authorization**: `https://auth.riotgames.com/authorize`
- **Token Exchange**: `https://auth.riotgames.com/token`
- **Account Info**: `https://europe.api.riotgames.com/riot/account/v1/accounts/me`

## Step 6: Testing

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Go to your profile page**
3. **Click "Link Riot Account"** (you'll need to add this button to your Profile component)
4. **Authorize with Riot**
5. **You should be redirected back and see your Riot ID linked!**

## Security Notes

- ✅ **Client secret never exposed** on frontend
- ✅ **OAuth proxy is minimal** and secure
- ✅ **All user data stored in Firebase**
- ✅ **Access tokens are not stored** (only Riot ID is saved)

## Troubleshooting

### "OAuth proxy not found" error
- Make sure your OAuth proxy is deployed and running
- Check the `VITE_OAUTH_PROXY_URL` environment variable
- Verify the proxy endpoint `/api/riot/token` exists

### "Invalid redirect URI" error
- Check your Riot app's redirect URI configuration
- Make sure it matches exactly (including protocol and port)
- For development: `http://localhost:5173/riot-callback`
- For production: `https://your-domain.com/riot-callback`

### "Failed to exchange code" error
- Verify your Riot client ID and secret in the proxy
- Check proxy logs for detailed error messages
- Ensure client secret is correct: `mxjMgMRwX0GBtgJyzw_M8HDsXdzkp9iwY3LMzUhq_2_`

### "Failed to get Riot account info" error
- Check if the access token is valid
- Verify the account endpoint URL is correct
- Check Riot API status

## Next Steps

1. **Add "Link Riot Account" button** to your Profile component
2. **Update Profile component** to show linked Riot ID
3. **Test the full OAuth flow** in development
4. **Deploy to production** and update redirect URIs

## Files Created

- `oauth-proxy/api/riot/token.js` - Token exchange endpoint
- `oauth-proxy/api/riot/user.js` - User info endpoint
- `src/services/riotOAuthService.ts` - Frontend RSO service
- `src/pages/RiotCallback.tsx` - OAuth callback page
- Route added to `src/App.tsx` for `/riot-callback`

## Reference

- [Riot Developer Portal](https://developer.riotgames.com/)
- [Riot Sign-On Documentation](https://developer.riotgames.com/docs/riot)
- [Account API Documentation](https://developer.riotgames.com/apis#account-v1/GET_getByAccessToken)

