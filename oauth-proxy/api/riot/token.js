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

    console.log('Riot token exchange request:', {
      hasCode: !!code,
      codeLength: code?.length,
      redirect_uri: redirect_uri,
      clientId: process.env.RIOT_CLIENT_ID ? 'set' : 'missing',
      hasSecret: !!process.env.RIOT_CLIENT_SECRET
    });

    if (!code || !redirect_uri) {
      return res.status(400).json({ 
        message: 'Missing required parameters',
        received: { hasCode: !!code, hasRedirectUri: !!redirect_uri }
      });
    }

    // Check if environment variables are set
    // Newer Riot clients use JWT (client_assertion), older clients use Basic Auth (client_secret)
    const clientId = process.env.RIOT_CLIENT_ID?.trim();
    const clientSecret = process.env.RIOT_CLIENT_SECRET?.trim();
    const clientAssertion = process.env.RIOT_CLIENT_ASSERTION?.trim(); // JWT token for newer clients
    
    if (!clientId) {
      return res.status(500).json({ 
        message: 'OAuth proxy not configured',
        error: 'Missing RIOT_CLIENT_ID environment variable'
      });
    }
    
    // Determine authentication method: JWT (newer) or Basic Auth (older)
    const useJWT = !!clientAssertion;
    const useBasicAuth = !!clientSecret && !useJWT;
    
    if (!useJWT && !useBasicAuth) {
      return res.status(500).json({ 
        message: 'OAuth proxy not configured',
        error: 'Missing RIOT_CLIENT_ASSERTION (JWT) or RIOT_CLIENT_SECRET (Basic Auth) environment variable'
      });
    }
    
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
    });
    
    let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    // Use JWT authentication for newer clients
    if (useJWT) {
      requestBody.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      requestBody.append('client_assertion', clientAssertion);
      
      console.log('Exchanging code with JWT (newer client):', {
        clientIdLength: clientId.length,
        redirect_uri: redirect_uri,
        codeLength: code?.length,
        grantType: 'authorization_code',
        hasClientAssertion: true
      });
    } else {
      // Use Basic Auth for older clients
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      
      console.log('Exchanging code with Basic Auth (older client):', {
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
        redirect_uri: redirect_uri,
        codeLength: code?.length,
        grantType: 'authorization_code'
      });
    }
    
    const tokenResponse = await fetch('https://auth.riotgames.com/token', {
      method: 'POST',
      headers,
      body: requestBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      // Log full error details for debugging
      console.error('Riot OAuth error (full details):', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        errorText: errorText,
        redirect_uri: redirect_uri,
        code_length: code?.length,
        clientId: clientId.substring(0, 8) + '...', // Log first 8 chars only
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      
      return res.status(400).json({ 
        message: 'Failed to exchange code for token',
        error: errorData.error_description || errorData.message || errorText,
        details: errorData
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

