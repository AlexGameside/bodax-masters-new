// OAuth token exchange endpoint for Riot Games RSO
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

  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Check if environment variables are set
    if (!process.env.RIOT_CLIENT_ID || !process.env.RIOT_CLIENT_SECRET) {
      return res.status(500).json({ 
        message: 'OAuth proxy not configured',
        error: 'Missing RIOT_CLIENT_ID or RIOT_CLIENT_SECRET environment variables'
      });
    }

    // Exchange the authorization code for an access token
    // Riot RSO uses Basic Auth with client_id:client_secret
    const credentials = Buffer.from(`${process.env.RIOT_CLIENT_ID}:${process.env.RIOT_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://auth.riotgames.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Riot OAuth error:', error);
      return res.status(400).json({ 
        message: 'Failed to exchange code for token',
        error: error
      });
    }

    const tokenData = await tokenResponse.json();
    
    // Return the access token and refresh token
    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
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

