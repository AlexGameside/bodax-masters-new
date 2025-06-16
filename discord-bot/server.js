const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Discord bot API is running',
    timestamp: new Date().toISOString(),
    service: 'Discord Notification API'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Discord bot API is running',
    service: 'Discord Notification API'
  });
});

// Check if user is a member of our Discord server
app.post('/api/check-server-membership', async (req, res) => {
  try {
    const { userId, serverId } = req.body;
    
    if (!userId || !serverId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and serverId' 
      });
    }

    // Use Discord bot to check if user is in the server
    const { Client, GatewayIntentBits } = require('discord.js');
    const bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    await bot.login(process.env.DISCORD_BOT_TOKEN);
    
    const guild = await bot.guilds.fetch(serverId);
    if (!guild) {
      await bot.destroy();
      return res.status(404).json({ error: 'Server not found' });
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    await bot.destroy();

    res.json({ 
      isMember: !!member,
      userId,
      serverId,
      serverName: guild.name
    });
  } catch (error) {
    console.error('Error checking server membership:', error);
    res.status(500).json({ 
      error: 'Failed to check server membership',
      details: error.message 
    });
  }
});

// Simple function to send Discord DM without requiring the full bot
async function sendDiscordDM(userId, message, botToken) {
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
      const errorText = await dmResponse.text();
      console.error('DM channel creation failed:', dmResponse.status, errorText);
      throw new Error(`Failed to create DM channel: ${dmResponse.status}`);
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

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord DM:', error);
    throw error;
  }
}

// Send Discord notification endpoint
app.post('/api/send-discord-notification', async (req, res) => {
  try {
    const { userIds, message, title } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        error: 'userIds array is required and must not be empty' 
      });
    }

    if (!message) {
      return res.status(400).json({ 
        error: 'message is required' 
      });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ 
        error: 'Discord bot token not configured' 
      });
    }

    const results = [];
    const failedUsers = [];

    for (const userId of userIds) {
      try {
        const fullMessage = title ? `**${title}**\n\n${message}` : message;
        await sendDiscordDM(userId, fullMessage, botToken);
        results.push({ userId, success: true });
      } catch (error) {
        console.error(`Failed to send notification to ${userId}:`, error.message);
        failedUsers.push(userId);
        results.push({ userId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Sent notifications to ${results.length - failedUsers.length} users`,
      results,
      failedUsers,
      totalSent: results.length - failedUsers.length,
      totalFailed: failedUsers.length
    });

  } catch (error) {
    console.error('Error sending Discord notification:', error);
    res.status(500).json({ 
      error: 'Failed to send Discord notification',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Discord bot API server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/`);
  console.log(`API health check at: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0); 
}); 