// Riot OAuth Service for RSO (Riot Sign-On) authentication
// Based on official Riot RSO documentation: https://docs.google.com/document/d/1_8i2PvPA3edFHIh1IwfO5vs5rcl04O62Xfj0o7zCP3c

export const getRiotAuthUrl = (): string => {
  const clientId = import.meta.env.VITE_RIOT_CLIENT_ID;
  // Use the exact redirect URI that's registered in Riot Developer Portal
  // For production: https://bodax-masters.web.app/riot/callback
  // For development: http://127.0.0.1:5173/riot/callback (if registered)
  let redirectUri = `${window.location.origin}/riot/callback`;
  
  // Only convert localhost to 127.0.0.1 if we're in development
  if (window.location.hostname === 'localhost') {
    redirectUri = redirectUri.replace('localhost', '127.0.0.1');
  }
  
  if (!clientId) {
    throw new Error('Riot Client ID not configured');
  }
  
  console.log('Generating Riot auth URL:', {
    redirectUri,
    origin: window.location.origin,
    hostname: window.location.hostname
  });

  // According to official docs: redirect_uri, client_id, response_type=code, scope=openid
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    client_id: clientId,
    response_type: 'code',
    scope: 'openid offline_access', // openid is required, offline_access for refresh tokens
  });
  
  return `https://auth.riotgames.com/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<{ access_token: string; refresh_token?: string }> => {
  const envProxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;
  const proxyUrl = envProxyUrl && !envProxyUrl.includes('5t15g09rb') 
    ? envProxyUrl 
    : 'https://oauth-proxy-gilt.vercel.app';
  
  // CRITICAL: redirect_uri must match EXACTLY what was used in the authorization request
  // Use the exact same logic as getRiotAuthUrl()
  let redirectUri = `${window.location.origin}/riot/callback`;
  if (window.location.hostname === 'localhost') {
    redirectUri = redirectUri.replace('localhost', '127.0.0.1');
  }
  
  console.log('Exchanging Riot code for token:', {
    redirectUri,
    origin: window.location.origin,
    hostname: window.location.hostname,
    codeLength: code?.length
  });
    
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
    let errorMessage = 'Failed to exchange code for token';
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || error.details?.message || JSON.stringify(error);
      console.error('Riot token exchange error:', error);
    } catch (e) {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
      console.error('Riot token exchange error (text):', errorText);
    }
    throw new Error(errorMessage);
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

