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

    // Get account info using the access token
    // Using Europe region endpoint - adjust if needed for other regions
    const accountResponse = await fetch('https://europe.api.riotgames.com/riot/account/v1/accounts/me', {
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
    
    // Return the account information
    res.status(200).json({
      puuid: accountData.puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      riotId: `${accountData.gameName}#${accountData.tagLine}`,
    });

  } catch (error) {
    console.error('Riot user info error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

