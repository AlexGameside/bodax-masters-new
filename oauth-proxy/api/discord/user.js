export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Call Discord API from server-side to avoid CORS
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to get Discord user information',
        details: errorText 
      });
    }

    const userData = await response.json();
    
    // Return the user data
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error in Discord user endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

