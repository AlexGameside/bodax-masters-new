// Riot OAuth Service for RSO (Riot Sign-On) authentication
// Similar to Discord OAuth but for Riot Games accounts

export const getRiotAuthUrl = (): string => {
  const clientId = import.meta.env.VITE_RIOT_CLIENT_ID;
  // Use 127.0.0.1 instead of localhost for Riot Developer Portal compatibility
  let origin = window.location.origin;
  if (origin.includes('localhost')) {
    origin = origin.replace('localhost', '127.0.0.1');
  }
  const redirectUri = `${origin}/riot/callback`;
  
  if (!clientId) {
    throw new Error('Riot Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid offline_access',
  });
  
  return `https://auth.riotgames.com/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<{ access_token: string; refresh_token?: string }> => {
  const envProxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;
  const proxyUrl = envProxyUrl && !envProxyUrl.includes('5t15g09rb') 
    ? envProxyUrl 
    : 'https://oauth-proxy-gilt.vercel.app';
  // Use 127.0.0.1 instead of localhost for Riot Developer Portal compatibility
  let origin = window.location.origin;
  if (origin.includes('localhost')) {
    origin = origin.replace('localhost', '127.0.0.1');
  }
  const redirectUri = `${origin}/riot/callback`;
    
  const response = await fetch(`${proxyUrl}/api/riot/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange code for token');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
};

export const getRiotAccount = async (accessToken: string): Promise<{
  puuid: string;
  gameName: string;
  tagLine: string;
  riotId: string;
}> => {
  const envProxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;
  const proxyUrl = envProxyUrl && !envProxyUrl.includes('5t15g09rb') 
    ? envProxyUrl 
    : 'https://oauth-proxy-gilt.vercel.app';

  const response = await fetch(`${proxyUrl}/api/riot/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Riot account info');
  }

  return await response.json();
};

