# Discord Setup Guide for Bodax Masters

## Overview

This guide will help you set up Discord linking for your tournament platform. We'll use a simple OAuth proxy to handle the secure token exchange while keeping everything else in Firebase.

## What We're Building

1. **Frontend**: React app with Discord OAuth flow
2. **OAuth Proxy**: Tiny backend service for secure token exchange
3. **Firebase**: Store Discord user data and handle authentication
4. **Discord Integration**: Link accounts and send notifications

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Bodax Masters" (or whatever you prefer)
4. Click "Create"

## Step 2: Configure OAuth2

1. In your app, go to "OAuth2" → "General"
2. Add redirect URI: `http://localhost:5173/discord-callback` (for development)
3. For production: `https://yourdomain.com/discord-callback`
4. Copy the **Client ID** and **Client Secret**

## Step 3: Deploy OAuth Proxy

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy the proxy:**
   ```bash
   cd oauth-proxy
   vercel
   ```

3. **Set environment variables in Vercel dashboard:**
   - `DISCORD_CLIENT_ID` = your Discord client ID
   - `DISCORD_CLIENT_SECRET` = your Discord client secret

4. **Get your proxy URL** (e.g., `https://your-app.vercel.app`)

### Option B: Deploy to Netlify

1. **Create `netlify.toml` in oauth-proxy folder:**
   ```toml
   [build]
     functions = "api"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Deploy to Netlify and set environment variables**

## Step 4: Configure Frontend

1. **Set environment variables in your `.env` file:**
   ```env
   VITE_DISCORD_CLIENT_ID=your_discord_client_id
   VITE_OAUTH_PROXY_URL=https://your-oauth-proxy.vercel.app
   ```

2. **Update Discord service** (already done in `src/services/discordService.ts`)

## Step 5: Test Discord Linking

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Go to your profile page**
3. **Click "Link Discord"**
4. **Authorize with Discord**
5. **You should be redirected back and see your Discord account linked!**

## How It Works

1. **User clicks "Link Discord"** → Redirected to Discord OAuth
2. **Discord redirects back** with authorization code
3. **Frontend sends code to OAuth proxy** (secure, no client secret exposed)
4. **Proxy exchanges code for token** using Discord API
5. **Frontend gets access token** and fetches user info
6. **User data saved to Firebase** with Discord information

## Security Features

- ✅ **Client secret never exposed** on frontend
- ✅ **OAuth proxy is minimal** and secure
- ✅ **All user data stored in Firebase**
- ✅ **No persistent backend state**

## Troubleshooting

### "OAuth proxy not found" error
- Make sure your OAuth proxy is deployed and running
- Check the `VITE_OAUTH_PROXY_URL` environment variable
- Verify the proxy endpoint `/api/discord/token` exists

### "Invalid redirect URI" error
- Check your Discord app's redirect URI configuration
- Make sure it matches exactly (including protocol and port)

### "Failed to exchange code" error
- Verify your Discord client ID and secret in the proxy
- Check proxy logs for detailed error messages

## Production Deployment

1. **Update Discord redirect URI** to your production domain
2. **Deploy OAuth proxy** to production
3. **Set production environment variables**
4. **Test the full flow** in production

## Discord Bot Integration (Optional)

If you want to send Discord notifications later:

1. **Create a bot** in your Discord app
2. **Get the bot token**
3. **Use Discord webhooks** for simple notifications
4. **Or implement a full bot** for advanced features

## Support

- Check the `oauth-proxy` folder for proxy code
- Review `src/services/discordService.ts` for frontend integration
- Look at `src/pages/DiscordCallback.tsx` for OAuth flow
- Check `src/components/DiscordLinkBanner.tsx` for UI components

## Next Steps

After Discord linking is working:

1. **Add Discord server membership verification**
2. **Implement Discord notifications**
3. **Add Discord role management**
4. **Create Discord bot commands**

---

**That's it!** You now have a secure, frontend-focused Discord integration that works entirely with Firebase for data storage. 