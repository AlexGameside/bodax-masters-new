# Discord OAuth Proxy

A simple serverless function to handle Discord OAuth token exchange securely.

## Why This is Needed

OAuth2 requires a client secret, which cannot be exposed on the frontend. This proxy handles the secure token exchange on the backend.

## Quick Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd oauth-proxy
   vercel
   ```

3. **Set Environment Variables:**
   - Go to your Vercel dashboard
   - Add these environment variables:
     - `DISCORD_CLIENT_ID` - Your Discord app client ID
     - `DISCORD_CLIENT_SECRET` - Your Discord app client secret

4. **Get Your Proxy URL:**
   - After deployment, you'll get a URL like: `https://your-app.vercel.app`
   - Set this as `VITE_OAUTH_PROXY_URL` in your frontend

## Alternative: Deploy to Netlify

1. **Create `netlify.toml`:**
   ```toml
   [build]
     functions = "api"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Deploy to Netlify and set environment variables**

## Alternative: Deploy to Cloudflare Workers

1. **Install Wrangler:**
   ```bash
   npm i -g wrangler
   ```

2. **Deploy:**
   ```bash
   wrangler publish
   ```

## Security Notes

- This proxy only handles OAuth token exchange
- No user data is stored
- Client secret is kept secure on the backend
- Rate limiting and validation can be added

## Usage

Your frontend will call:
```
POST https://your-proxy.vercel.app/api/discord/token
{
  "code": "oauth_code_from_discord",
  "redirect_uri": "your_redirect_uri"
}
```

And receive:
```json
{
  "access_token": "discord_access_token",
  "token_type": "Bearer",
  "expires_in": 604800,
  "scope": "identify email"
}
``` 