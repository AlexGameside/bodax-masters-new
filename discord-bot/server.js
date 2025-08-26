const express = require('express');
const cors = require('cors');
const { 
  createTicket, 
  createMatchDisputeTicket, 
  closeTicket, 
  getTicketStatus, 
  getAllActiveTickets, 
  getTicketsByUser,
  sendTournamentNotification,
  sendMatchNotification,
  sendTeamInvitation,
  sendAdminNotification,
  isReady
} = require('./bot');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    bot: isReady() ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

// ===== TICKET MANAGEMENT API =====

// Create a new ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { userId, subject, description, ticketType, matchInfo } = req.body;
    
    if (!userId || !subject || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, subject, description' 
      });
    }

    const ticketInfo = await createTicket(userId, subject, description, ticketType, matchInfo);
    
    res.status(201).json({
      success: true,
      ticket: ticketInfo,
      message: `Ticket #${ticketInfo.id} created successfully`
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ 
      error: 'Failed to create ticket',
      details: error.message 
    });
  }
});

// Create a match dispute ticket
app.post('/api/tickets/dispute', async (req, res) => {
  try {
    const { userId, matchInfo, disputeReason } = req.body;
    
    if (!userId || !matchInfo || !disputeReason) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, matchInfo, disputeReason' 
      });
    }

    const ticketInfo = await createMatchDisputeTicket(userId, matchInfo, disputeReason);
    
    res.status(201).json({
      success: true,
      ticket: ticketInfo,
      message: `Match dispute ticket #${ticketInfo.id} created successfully`
    });
  } catch (error) {
    console.error('Error creating dispute ticket:', error);
    res.status(500).json({ 
      error: 'Failed to create dispute ticket',
      details: error.message 
    });
  }
});

// Get ticket status
app.get('/api/tickets/:ticketNumber', (req, res) => {
  try {
    const ticketNumber = parseInt(req.params.ticketNumber);
    const ticketInfo = getTicketStatus(ticketNumber);
    
    if (!ticketInfo) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ success: true, ticket: ticketInfo });
  } catch (error) {
    console.error('Error getting ticket status:', error);
    res.status(500).json({ 
      error: 'Failed to get ticket status',
      details: error.message 
    });
  }
});

// Get all active tickets
app.get('/api/tickets', (req, res) => {
  try {
    const tickets = getAllActiveTickets();
    res.json({ success: true, tickets, count: tickets.length });
  } catch (error) {
    console.error('Error getting tickets:', error);
    res.status(500).json({ 
      error: 'Failed to get tickets',
      details: error.message 
    });
  }
});

// Get tickets by user
app.get('/api/tickets/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const tickets = getTicketsByUser(userId);
    res.json({ success: true, tickets, count: tickets.length });
  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ 
      error: 'Failed to get user tickets',
      details: error.message 
    });
  }
});

// Get user's active matches
app.get('/api/matches/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // This would query your Firebase database for active matches
    // For now, we'll return a placeholder that you can replace with real Firebase queries
    const activeMatches = [
      // This will be replaced with real data from your Firebase
      // Example structure based on your match data:
      // { id: 'matchId', team1: 'Team Name', team2: 'Opponent Team', map: 'Map Name', phase: 'matchState' }
    ];
    
    res.json({ 
      success: true, 
      matches: activeMatches, 
      count: activeMatches.length,
      message: 'Replace this with real Firebase queries to get actual match data'
    });
  } catch (error) {
    console.error('Error getting user matches:', error);
    res.status(500).json({ 
      error: 'Failed to get user matches',
      details: error.message 
    });
  }
});

// Close a ticket
app.post('/api/tickets/:ticketNumber/close', async (req, res) => {
  try {
    const ticketNumber = parseInt(req.params.ticketNumber);
    const { closedBy } = req.body;
    
    if (!closedBy) {
      return res.status(400).json({ error: 'Missing closedBy field' });
    }

    const ticketInfo = await closeTicket(ticketNumber, closedBy);
    
    res.json({
      success: true,
      ticket: ticketInfo,
      message: `Ticket #${ticketNumber} closed successfully`
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ 
      error: 'Failed to close ticket',
      details: error.message 
    });
  }
});

// ===== NOTIFICATION API =====

// Send tournament notification
app.post('/api/notifications/tournament', async (req, res) => {
  try {
    const { userIds, tournamentName, startTime, message } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !tournamentName || !startTime || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userIds (array), tournamentName, startTime, message' 
      });
    }

    const results = await sendTournamentNotification(userIds, tournamentName, startTime, message);
    
    res.json({
      success: true,
      results,
      message: `Tournament notification sent to ${results.success.length} users`
    });
  } catch (error) {
    console.error('Error sending tournament notification:', error);
    res.status(500).json({ 
      error: 'Failed to send tournament notification',
      details: error.message 
    });
  }
});

// Send match notification
app.post('/api/notifications/match', async (req, res) => {
  try {
    const { userIds, team1Name, team2Name, matchTime, map } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !team1Name || !team2Name || !matchTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: userIds (array), team1Name, team2Name, matchTime' 
      });
    }

    const results = await sendMatchNotification(userIds, team1Name, team2Name, matchTime, map);
    
    res.json({
      success: true,
      results,
      message: `Match notification sent to ${results.success.length} users`
    });
  } catch (error) {
    console.error('Error sending match notification:', error);
    res.status(500).json({ 
      error: 'Failed to send match notification',
      details: error.message 
    });
  }
});

// Send team invitation
app.post('/api/notifications/team-invitation', async (req, res) => {
  try {
    const { userId, teamName, inviterName } = req.body;
    
    if (!userId || !teamName || !inviterName) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, teamName, inviterName' 
      });
    }

    const success = await sendTeamInvitation(userId, teamName, inviterName);
    
    if (success) {
      res.json({
        success: true,
        message: 'Team invitation sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send team invitation'
      });
    }
  } catch (error) {
    console.error('Error sending team invitation:', error);
    res.status(500).json({ 
      error: 'Failed to send team invitation',
      details: error.message 
    });
  }
});

// Send admin notification
app.post('/api/notifications/admin', async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userIds (array), title, message' 
      });
    }

    const results = await sendAdminNotification(userIds, title, message, type);
    
    res.json({
      success: true,
      results,
      message: `Admin notification sent to ${results.success.length} users`
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ 
      error: 'Failed to send admin notification',
      details: error.message 
    });
  }
});

// ===== BOT STATUS API =====

// Get bot status
app.get('/api/bot/status', (req, res) => {
  res.json({
    status: 'online',
    bot: isReady() ? 'connected' : 'connecting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Discord bot server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Bot status: http://localhost:${PORT}/api/bot/status`);
}); 