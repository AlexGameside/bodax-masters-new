// Discord notification service for Unity League
export interface DiscordNotificationData {
  type: 'ticket' | 'match' | 'team' | 'tournament' | 'dispute' | 'admin';
  channelId?: string; // For admin notifications
  userIds?: string[]; // For DM notifications
  message: string;
  embed?: DiscordEmbed;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

// Base function to send Discord notifications
const sendDiscordNotification = async (data: DiscordNotificationData): Promise<boolean> => {
  try {
    const botToken = import.meta.env.VITE_DISCORD_BOT_TOKEN;
    
    if (!botToken) {
      console.error('Discord bot token not configured. Please set VITE_DISCORD_BOT_TOKEN environment variable.');
      return false;
    }

    console.log('Sending Discord notification:', { 
      type: data.type, 
      channelId: data.channelId, 
      userIds: data.userIds?.length || 0,
      hasBotToken: !!botToken 
    });

    const response = await fetch('https://oauth-proxy-n619ywlnz-alexgamesides-projects.vercel.app/api/discord/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        botToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('Discord notification sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
};

// ==================== TICKET NOTIFICATIONS ====================

export const notifyTicketCreated = async (ticket: any, adminUserIds: string[]) => {
  const embed: DiscordEmbed = {
    title: '🎫 New Support Ticket',
    description: `**${ticket.subject}**`,
    color: 0xff6b35, // Orange
    fields: [
      {
        name: 'Priority',
        value: ticket.priority || 'Normal',
        inline: true
      },
      {
        name: 'Category',
        value: ticket.category || 'General',
        inline: true
      },
      {
        name: 'User',
        value: ticket.userDisplayName || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: `Ticket #${ticket.id}`,
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'ticket',
    channelId: import.meta.env.VITE_DISCORD_ADMIN_CHANNEL_ID!,
    message: `New support ticket from ${ticket.userDisplayName}`,
    embed,
    userIds: adminUserIds
  });
};

export const notifyTicketAnswered = async (ticket: any, userDiscordId?: string) => {
  const embed: DiscordEmbed = {
    title: '✅ Ticket Answered',
    description: `Your ticket **"${ticket.subject}"** has been answered by our support team.`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Response',
        value: ticket.lastResponse?.substring(0, 200) + (ticket.lastResponse?.length > 200 ? '...' : ''),
        inline: false
      }
    ],
    footer: {
      text: `Ticket #${ticket.id}`,
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'ticket',
    message: `Your support ticket has been answered!`,
    embed,
    userIds: userDiscordId ? [userDiscordId] : []
  });
};

// ==================== MATCH NOTIFICATIONS ====================

export const notifyMatchSchedulingRequest = async (match: any, opponentTeam: any, requestingTeam: any) => {
  const embed: DiscordEmbed = {
    title: '📅 Match Scheduling Request',
    description: `**${requestingTeam.name}** has suggested a time for your match!`,
    color: 0x3498db, // Blue
    fields: [
      {
        name: 'Match',
        value: `${requestingTeam.name} vs ${opponentTeam.name}`,
        inline: true
      },
      {
        name: 'Suggested Time',
        value: new Date(match.suggestedTime).toLocaleString(),
        inline: true
      },
      {
        name: 'Tournament',
        value: match.tournamentName || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Please respond to the scheduling request on the platform',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'match',
    message: `Match scheduling request from ${requestingTeam.name}`,
    embed,
    userIds: opponentTeam.members?.map((m: any) => m.discordId).filter(Boolean) || []
  });
};

export const notifyMatchReminder = async (match: any, minutesBefore: number = 15) => {
  const embed: DiscordEmbed = {
    title: '⏰ Match Starting Soon!',
    description: `Your match starts in **${minutesBefore} minutes**!`,
    color: 0xffd700, // Gold
    fields: [
      {
        name: 'Teams',
        value: `${match.team1?.name} vs ${match.team2?.name}`,
        inline: true
      },
      {
        name: 'Map',
        value: match.map1 || 'TBD',
        inline: true
      },
      {
        name: 'Tournament',
        value: match.tournamentName || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Good luck! 🍀',
    },
    timestamp: new Date().toISOString()
  };

  const allPlayerIds = [
    ...(match.team1?.members?.map((m: any) => m.discordId).filter(Boolean) || []),
    ...(match.team2?.members?.map((m: any) => m.discordId).filter(Boolean) || [])
  ];

  return sendDiscordNotification({
    type: 'match',
    message: `Match starting in ${minutesBefore} minutes!`,
    embed,
    userIds: allPlayerIds
  });
};

export const notifyMatchCompleted = async (match: any) => {
  const winner = match.winner === match.team1?.id ? match.team1 : match.team2;
  const loser = match.winner === match.team1?.id ? match.team2 : match.team1;

  const embed: DiscordEmbed = {
    title: '🏆 Match Completed!',
    description: `**${winner?.name}** defeated **${loser?.name}**`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Score',
        value: `${match.team1Score} - ${match.team2Score}`,
        inline: true
      },
      {
        name: 'Tournament',
        value: match.tournamentName || 'Unknown',
        inline: true
      },
      {
        name: 'Duration',
        value: match.duration || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Great game! 🎮',
    },
    timestamp: new Date().toISOString()
  };

  const allPlayerIds = [
    ...(match.team1?.members?.map((m: any) => m.discordId).filter(Boolean) || []),
    ...(match.team2?.members?.map((m: any) => m.discordId).filter(Boolean) || [])
  ];

  return sendDiscordNotification({
    type: 'match',
    message: `Match completed: ${winner?.name} wins!`,
    embed,
    userIds: allPlayerIds
  });
};

// ==================== TEAM NOTIFICATIONS ====================

export const notifyTeamInvitation = async (team: any, invitedUser: any, inviter: any) => {
  const embed: DiscordEmbed = {
    title: '👥 Team Invitation',
    description: `**${inviter.displayName}** has invited you to join **${team.name}**!`,
    color: 0x9b59b6, // Purple
    fields: [
      {
        name: 'Team',
        value: team.name,
        inline: true
      },
      {
        name: 'Invited by',
        value: inviter.displayName,
        inline: true
      },
      {
        name: 'Team Members',
        value: `${team.members?.length || 0}/5`,
        inline: true
      }
    ],
    footer: {
      text: 'Check your Unity League profile to accept or decline',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'team',
    message: `You've been invited to join ${team.name}!`,
    embed,
    userIds: invitedUser.discordId ? [invitedUser.discordId] : []
  });
};

export const notifyTeamMemberJoined = async (team: any, newMember: any) => {
  const embed: DiscordEmbed = {
    title: '🎉 New Team Member!',
    description: `**${newMember.displayName}** has joined **${team.name}**!`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Team',
        value: team.name,
        inline: true
      },
      {
        name: 'New Member',
        value: newMember.displayName,
        inline: true
      },
      {
        name: 'Team Size',
        value: `${team.members?.length || 0}/5`,
        inline: true
      }
    ],
    footer: {
      text: 'Welcome to the team! 🚀',
    },
    timestamp: new Date().toISOString()
  };

  const teamMemberIds = team.members?.map((m: any) => m.discordId).filter(Boolean) || [];

  return sendDiscordNotification({
    type: 'team',
    message: `${newMember.displayName} joined ${team.name}!`,
    embed,
    userIds: teamMemberIds
  });
};

// ==================== TOURNAMENT NOTIFICATIONS ====================

export const notifyTournamentRegistration = async (tournament: any, team: any) => {
  const embed: DiscordEmbed = {
    title: '🏆 Tournament Registration',
    description: `**${team.name}** has registered for **${tournament.name}**!`,
    color: 0xff6b35, // Orange
    fields: [
      {
        name: 'Tournament',
        value: tournament.name,
        inline: true
      },
      {
        name: 'Team',
        value: team.name,
        inline: true
      },
      {
        name: 'Format',
        value: tournament.format || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Good luck in the tournament! 🍀',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'tournament',
    channelId: import.meta.env.VITE_DISCORD_TOURNAMENTS_CHANNEL_ID!,
    message: `${team.name} registered for ${tournament.name}!`,
    embed
  });
};

export const notifyTournamentStarted = async (tournament: any) => {
  const embed: DiscordEmbed = {
    title: '🚀 Tournament Started!',
    description: `**${tournament.name}** is now live!`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Tournament',
        value: tournament.name,
        inline: true
      },
      {
        name: 'Format',
        value: tournament.format || 'Unknown',
        inline: true
      },
      {
        name: 'Participants',
        value: `${tournament.registeredTeams?.length || 0} teams`,
        inline: true
      }
    ],
    footer: {
      text: 'May the best team win! 🏆',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'tournament',
    channelId: import.meta.env.VITE_DISCORD_TOURNAMENTS_CHANNEL_ID!,
    message: `${tournament.name} has started!`,
    embed
  });
};

// ==================== DISPUTE NOTIFICATIONS ====================

export const notifyDisputeCreated = async (dispute: any, adminUserIds: string[]) => {
  const embed: DiscordEmbed = {
    title: '⚠️ Match Dispute Created',
    description: `A dispute has been filed for match **${dispute.matchId}**`,
    color: 0xff0000, // Red
    fields: [
      {
        name: 'Reason',
        value: dispute.reason || 'No reason provided',
        inline: false
      },
      {
        name: 'Filed by',
        value: dispute.filedBy || 'Unknown',
        inline: true
      },
      {
        name: 'Match',
        value: dispute.matchDetails || 'Unknown',
        inline: true
      }
    ],
    footer: {
      text: 'Please review and resolve this dispute',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'dispute',
    channelId: import.meta.env.VITE_DISCORD_ADMIN_CHANNEL_ID!,
    message: `New match dispute requires attention!`,
    embed,
    userIds: adminUserIds
  });
};

// ==================== ADMIN NOTIFICATIONS ====================

export const notifyAdminAction = async (action: string, admin: any, target: any) => {
  const embed: DiscordEmbed = {
    title: '🔧 Admin Action',
    description: `**${admin.displayName}** performed: **${action}**`,
    color: 0x95a5a6, // Gray
    fields: [
      {
        name: 'Action',
        value: action,
        inline: true
      },
      {
        name: 'Admin',
        value: admin.displayName,
        inline: true
      },
      {
        name: 'Target',
        value: target || 'N/A',
        inline: true
      }
    ],
    footer: {
      text: 'Admin action logged',
    },
    timestamp: new Date().toISOString()
  };

  return sendDiscordNotification({
    type: 'admin',
    channelId: import.meta.env.VITE_DISCORD_ADMIN_CHANNEL_ID!,
    message: `Admin action: ${action}`,
    embed
  });
};

// ==================== UTILITY FUNCTIONS ====================

export const notifyCustomMessage = async (
  channelId: string, 
  message: string, 
  embed?: DiscordEmbed, 
  userIds?: string[]
) => {
  return sendDiscordNotification({
    type: 'admin',
    channelId,
    message,
    embed,
    userIds
  });
};

// Helper to get Discord IDs from team members
export const getTeamDiscordIds = (team: any): string[] => {
  return team.members?.map((m: any) => m.discordId).filter(Boolean) || [];
};

// Helper to get Discord IDs from match participants
export const getMatchDiscordIds = (match: any): string[] => {
  const team1Ids = getTeamDiscordIds(match.team1);
  const team2Ids = getTeamDiscordIds(match.team2);
  return [...team1Ids, ...team2Ids];
};

// Discord OAuth Functions
export const getDiscordAuthUrl = (): string => {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const redirectUri = `${window.location.origin}/discord-callback`;
  
  if (!clientId) {
    throw new Error('Discord Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
  });
  
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const proxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;
  const redirectUri = `${window.location.origin}/discord-callback`;

  if (!proxyUrl) {
    throw new Error('OAuth proxy URL not configured');
  }
    
  const response = await fetch(`${proxyUrl}/api/discord/token`, {
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
    return data.access_token;
};

export const getDiscordUser = async (accessToken: string): Promise<any> => {
  const proxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;

  if (!proxyUrl) {
    throw new Error('OAuth proxy URL not configured');
  }

  const response = await fetch(`${proxyUrl}/api/discord/user`, {
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
    throw new Error(error.message || 'Failed to get Discord user info');
  }

  return await response.json();
};

// Check if a Discord user is in the server
export const checkUserInDiscordServer = async (discordId: string): Promise<boolean> => {
  const botToken = import.meta.env.VITE_DISCORD_BOT_TOKEN;
  const serverId = import.meta.env.VITE_DISCORD_SERVER_ID;

  if (!botToken || !serverId) {
    console.warn('Discord bot token or server ID not configured');
    return false;
  }

  try {
    // Check if user is in the server by trying to get their member info
    const response = await fetch(`https://discord.com/api/guilds/${serverId}/members/${discordId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // If we get a 200 response, the user is in the server
    // If we get a 404, the user is not in the server
    return response.ok;
  } catch (error) {
    console.error('Error checking Discord server membership:', error);
    return false;
  }
}; 