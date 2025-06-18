// Discord OAuth and API service

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = import.meta.env.VITE_DISCORD_CLIENT_SECRET || '16h8KtGaV_T3yJa-9ZMJeCmPI8ordabG';
const REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI || 'https://bodax-masters.web.app/discord-callback';
const DISCORD_SERVER_ID = import.meta.env.VITE_DISCORD_SERVER_ID || '1194567890123456789'; // Replace with your actual server ID

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
  verified: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

// Generate Discord OAuth URL
export const getDiscordAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email guilds.join',
  });
  
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await response.json();
  return data.access_token;
};

// Get Discord user information
export const getDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Discord user');
  }

  return response.json();
};

// Get user's Discord guilds (servers)
export const getDiscordGuilds = async (accessToken: string): Promise<DiscordGuild[]> => {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Discord guilds');
  }

  return response.json();
};

// Add user to Discord server (requires bot token)
export const addUserToDiscordServer = async (userId: string, guildId: string, botToken: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: botToken,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error adding user to Discord server:', error);
    return false;
  }
};

// Check if user is a member of our Discord server
export const checkUserInDiscordServer = async (discordId: string): Promise<boolean> => {
  try {
    const discordApiUrl = import.meta.env.VITE_DISCORD_API_URL || 'https://bodax-masters.onrender.com';
    const response = await fetch(`${discordApiUrl}/api/check-server-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: discordId,
        serverId: DISCORD_SERVER_ID,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isMember || false;
  } catch (error) {
    console.error('Error checking Discord server membership:', error);
    return false;
  }
};

// Send Discord DM to a specific user
export const sendDiscordDM = async (
  userId: string,
  message: string,
  botToken: string
): Promise<boolean> => {
  try {
    // Create DM channel
    const dmResponse = await fetch('https://discord.com/api/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: userId,
      }),
    });

    if (!dmResponse.ok) {
      console.error('DM channel creation failed:', dmResponse.status, await dmResponse.text());
      return false;
    }

    const dmChannel = await dmResponse.json();

    // Send message
    const messageResponse = await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });

    return messageResponse.ok;
  } catch (error) {
    console.error('Error sending Discord DM:', error);
    return false;
  }
};

// Send Discord DM to multiple users
export const sendDiscordDMToMultiple = async (
  userIds: string[],
  message: string,
  botToken: string
): Promise<{ success: string[]; failed: string[] }> => {
  const results = await Promise.allSettled(
    userIds.map(userId => sendDiscordDM(userId, message, botToken))
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      success.push(userIds[index]);
    } else {
      failed.push(userIds[index]);
    }
  });

  return { success, failed };
};

// Send tournament notification to multiple users
export const sendTournamentNotification = async (
  userIds: string[],
  message: string,
  botToken: string
): Promise<{ success: string[], failed: string[] }> => {
  const results = await Promise.allSettled(
    userIds.map(userId => sendDiscordDM(userId, message, botToken))
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      success.push(userIds[index]);
    } else {
      failed.push(userIds[index]);
    }
  });

  return { success, failed };
}; 