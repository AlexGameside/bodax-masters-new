// Discord OAuth service with backend proxy support

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI || `${window.location.origin}/discord-callback`;
const OAUTH_PROXY_URL = import.meta.env.VITE_OAUTH_PROXY_URL || 'https://your-oauth-proxy.vercel.app';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
  verified: boolean;
}

// Generate Discord OAuth URL
export const getDiscordAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  });
  
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

// Exchange authorization code for access token using backend proxy
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  try {
    console.log('Exchanging code for token via OAuth proxy:', OAUTH_PROXY_URL);
    
    const response = await fetch(`${OAUTH_PROXY_URL}/api/discord/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    console.log('OAuth proxy response status:', response.status);
    console.log('OAuth proxy response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth proxy error response:', errorText);
      
      // Try to parse as JSON for better error details
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }
      
      // Check if it's a Discord API error (which might still mean the account was linked)
      if (errorDetails.error && errorDetails.error.includes('invalid_grant')) {
        throw new Error('Authorization code expired or invalid. Please try linking again.');
      }
      
      throw new Error(errorDetails.message || `OAuth proxy error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OAuth proxy success response:', data);
    
    if (!data.access_token) {
      throw new Error('No access token received from OAuth proxy');
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    
    if (error instanceof Error) {
      throw error; // Re-throw with original message
    } else {
      throw new Error('Failed to authenticate with Discord. Please try again.');
    }
  }
};

// Get Discord user information
export const getDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
  try {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', errorText);
      throw new Error('Failed to get Discord user information');
    }

    const userData = await response.json();
    console.log('Discord user data:', userData);
    return userData;
  } catch (error) {
    console.error('Error getting Discord user:', error);
    throw new Error('Failed to retrieve Discord user information');
  }
};

// Check if user is in Discord server (simplified - just check if they have Discord linked)
export const checkUserInDiscordServer = async (discordId: string): Promise<boolean> => {
  // For frontend-only, we'll just return true if they have a Discord ID
  // In a real implementation, you'd need to check server membership
  return !!discordId;
};

// Send Discord notification (simplified - just log for now)
export const sendDiscordNotification = async (userIds: string[], title: string, message: string): Promise<{ success: boolean; error?: string }> => {
  // For frontend-only, we'll just log the notification
  // In production, you'd integrate with a Discord webhook or bot service
  console.log('Discord notification would be sent:', { userIds, title, message });
  
  return { 
    success: true,
    error: 'Discord notifications require a backend service. This is just a frontend demo.'
  };
};

// Alternative: Use Discord Webhooks for simple notifications
export const sendDiscordWebhookNotification = async (webhookUrl: string, message: string): Promise<boolean> => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
    return false;
  }
}; 