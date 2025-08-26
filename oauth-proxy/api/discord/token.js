// OAuth token exchange endpoint for Discord
// Deploy this to Vercel as a serverless function

export default async function handler(req, res) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set CORS headers for the actual request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Debug: Log environment variables (remove in production)
  console.log('Environment variables:', {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  });

  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Check if environment variables are set
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
      return res.status(500).json({ 
        message: 'OAuth proxy not configured',
        error: 'Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET environment variables'
      });
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Discord OAuth error:', error);
      return res.status(400).json({ 
        message: 'Failed to exchange code for token',
        error: error
      });
    }

    const tokenData = await tokenResponse.json();
    
    // Return the access token
    res.status(200).json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    });

  } catch (error) {
    console.error('OAuth proxy error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 