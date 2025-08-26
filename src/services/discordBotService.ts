// Discord Bot API Service
// Handles all interactions with the Discord bot including tickets, disputes, and notifications

const DISCORD_BOT_API_URL = import.meta.env.VITE_DISCORD_BOT_API_URL || 'http://localhost:3001';

export interface TicketInfo {
  id: number;
  channelId: string;
  userId: string;
  subject: string;
  description: string;
  type: 'general' | 'dispute' | 'support';
  status: 'open' | 'claimed' | 'escalated' | 'closed';
  createdAt: Date;
  matchInfo?: {
    team1: string;
    team2: string;
    map?: string;
    phase?: string;
  };
  claimedBy?: string;
  closedBy?: string;
  closedAt?: Date;
}

export interface MatchInfo {
  team1: string;
  team2: string;
  map?: string;
  phase?: string;
}

export interface CreateTicketRequest {
  userId: string;
  subject: string;
  description: string;
  ticketType?: 'general' | 'dispute' | 'support';
  matchInfo?: MatchInfo;
}

export interface CreateDisputeRequest {
  userId: string;
  matchInfo: MatchInfo;
  disputeReason: string;
}

export interface NotificationRequest {
  userIds: string[];
  message: string;
  title?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

// ===== TICKET MANAGEMENT =====

/**
 * Create a new support ticket
 */
export const createTicket = async (request: CreateTicketRequest): Promise<TicketInfo> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create ticket: ${response.status}`);
    }

    const result = await response.json();
    return result.ticket;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Create a match dispute ticket
 */
export const createMatchDispute = async (request: CreateDisputeRequest): Promise<TicketInfo> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create dispute ticket: ${response.status}`);
    }

    const result = await response.json();
    return result.ticket;
  } catch (error) {
    console.error('Error creating dispute ticket:', error);
    throw error;
  }
};

/**
 * Get ticket status by ticket number
 */
export const getTicketStatus = async (ticketNumber: number): Promise<TicketInfo | null> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets/${ticketNumber}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.error || `Failed to get ticket status: ${response.status}`);
    }

    const result = await response.json();
    return result.ticket;
  } catch (error) {
    console.error('Error getting ticket status:', error);
    throw error;
  }
};

/**
 * Get all active tickets
 */
export const getAllTickets = async (): Promise<TicketInfo[]> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to get tickets: ${response.status}`);
    }

    const result = await response.json();
    return result.tickets;
  } catch (error) {
    console.error('Error getting all tickets:', error);
    throw error;
  }
};

/**
 * Get tickets for a specific user
 */
export const getUserTickets = async (userId: string): Promise<TicketInfo[]> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets/user/${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to get user tickets: ${response.status}`);
    }

    const result = await response.json();
    return result.tickets;
  } catch (error) {
    console.error('Error getting user tickets:', error);
    throw error;
  }
};

/**
 * Close a ticket
 */
export const closeTicket = async (ticketNumber: number, closedBy: string): Promise<TicketInfo> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/tickets/${ticketNumber}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ closedBy }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to close ticket: ${response.status}`);
    }

    const result = await response.json();
    return result.ticket;
  } catch (error) {
    console.error('Error closing ticket:', error);
    throw error;
  }
};

// ===== NOTIFICATIONS =====

/**
 * Send tournament notification to Discord users
 */
export const sendTournamentNotification = async (
  userIds: string[],
  tournamentName: string,
  startTime: string,
  message: string
): Promise<{ success: string[]; failed: string[] }> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/notifications/tournament`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        tournamentName,
        startTime,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send tournament notification: ${response.status}`);
    }

    const result = await response.json();
    return result.results;
  } catch (error) {
    console.error('Error sending tournament notification:', error);
    throw error;
  }
};

/**
 * Send match notification to Discord users
 */
export const sendMatchNotification = async (
  userIds: string[],
  team1Name: string,
  team2Name: string,
  matchTime: string,
  map?: string
): Promise<{ success: string[]; failed: string[] }> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/notifications/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        team1Name,
        team2Name,
        matchTime,
        map,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send match notification: ${response.status}`);
    }

    const result = await response.json();
    return result.results;
  } catch (error) {
    console.error('Error sending match notification:', error);
    throw error;
  }
};

/**
 * Send team invitation to Discord user
 */
export const sendTeamInvitation = async (
  userId: string,
  teamName: string,
  inviterName: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/notifications/team-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        teamName,
        inviterName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send team invitation: ${response.status}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending team invitation:', error);
    throw error;
  }
};

/**
 * Send admin notification to Discord users
 */
export const sendAdminNotification = async (
  userIds: string[],
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
): Promise<{ success: string[]; failed: string[] }> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/notifications/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        title,
        message,
        type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send admin notification: ${response.status}`);
    }

    const result = await response.json();
    return result.results;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
};

// ===== BOT STATUS =====

/**
 * Check if Discord bot is online and ready
 */
export const checkBotStatus = async (): Promise<{ status: string; bot: string; uptime: number }> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/api/bot/status`);

    if (!response.ok) {
      throw new Error(`Bot status check failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking bot status:', error);
    throw error;
  }
};

/**
 * Health check for Discord bot API
 */
export const healthCheck = async (): Promise<{ status: string; bot: string }> => {
  try {
    const response = await fetch(`${DISCORD_BOT_API_URL}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error performing health check:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Check if user can create tickets (has Discord linked)
 */
export const canCreateTicket = (user: any): boolean => {
  return user && user.discordLinked && user.discordId;
};

/**
 * Format ticket type for display
 */
export const formatTicketType = (type: string): string => {
  const types = {
    general: 'General Support',
    dispute: 'Match Dispute',
    support: 'Technical Support',
  };
  return types[type as keyof typeof types] || type;
};

/**
 * Format ticket status for display
 */
export const formatTicketStatus = (status: string): { text: string; color: string } => {
  const statuses = {
    open: { text: '🟡 Open', color: 'text-yellow-400' },
    claimed: { text: '👤 Claimed', color: 'text-blue-400' },
    escalated: { text: '⬆️ Escalated', color: 'text-orange-400' },
    closed: { text: '🔒 Closed', color: 'text-red-400' },
  };
  return statuses[status as keyof typeof statuses] || { text: status, color: 'text-gray-400' };
};

/**
 * Get ticket priority based on type and status
 */
export const getTicketPriority = (ticket: TicketInfo): number => {
  let priority = 0;
  
  // Type priority
  if (ticket.type === 'dispute') priority += 10;
  else if (ticket.type === 'support') priority += 5;
  
  // Status priority
  if (ticket.status === 'escalated') priority += 8;
  else if (ticket.status === 'claimed') priority += 3;
  else if (ticket.status === 'open') priority += 1;
  
  return priority;
}; 