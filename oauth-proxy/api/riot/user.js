// Riot user info endpoint - fetches account info using access token
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
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ message: 'Missing access_token parameter' });
    }

    // Get user info using the access token
    // According to official Riot RSO docs: Use /userinfo endpoint
    const accountResponse = await fetch('https://auth.riotgames.com/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!accountResponse.ok) {
      const error = await accountResponse.text();
      console.error('Riot API error:', error);
      return res.status(accountResponse.status).json({ 
        message: 'Failed to get Riot account info',
        error: error
      });
    }

    const accountData = await accountResponse.json();
    
    // Riot /userinfo returns: { sub, cpid }
    // We need to get the Riot ID (gameName#tagLine) from a different endpoint
    // For now, return what we have and use the account endpoint for Riot ID
    // The 'sub' is the subject identifier (player identifier)
    
    // Try to get Riot ID from account endpoint using the sub
    // Actually, we should use the account endpoint with the access token
    // But first, let's return what userinfo gives us
    let riotId = null;
    let gameName = null;
    let tagLine = null;
    
    // Try to get account info from account endpoint
    try {
      const accountEndpointResponse = await fetch('https://europe.api.riotgames.com/riot/account/v1/accounts/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });
      
      if (accountEndpointResponse.ok) {
        const accountInfo = await accountEndpointResponse.json();
        gameName = accountInfo.gameName;
        tagLine = accountInfo.tagLine;
        riotId = `${accountInfo.gameName}#${accountInfo.tagLine}`;
      }
    } catch (e) {
      console.warn('Could not fetch account info from account endpoint:', e);
    }
    
    // Return the account information
    res.status(200).json({
      sub: accountData.sub, // Subject identifier from userinfo
      cpid: accountData.cpid, // Game region (e.g., "NA1")
      puuid: accountData.sub, // Use sub as puuid for now
      gameName: gameName,
      tagLine: tagLine,
      riotId: riotId || accountData.sub, // Fallback to sub if we can't get Riot ID
    });

  } catch (error) {
    console.error('Riot user info error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

