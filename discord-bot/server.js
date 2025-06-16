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

// Simple function to send Discord DM without requiring the full bot
async function sendDiscordDM(userId, message) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Discord bot token not configured');
    }

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

    // Send message to DM channel
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
      const errorText = await messageResponse.text();
      console.error('Message sending failed:', messageResponse.status, errorText);
      throw new Error(`Failed to send message: ${messageResponse.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord DM:', error);
    return false;
  }
}

// API endpoint to send Discord notifications
app.post('/api/send-discord-notification', async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'userIds must be a non-empty array' 
      });
    }
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'message is required' 
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const fullMessage = title ? `**${title}**\n\n${message}` : message;
        const success = await sendDiscordDM(userId, fullMessage);
        
        if (success) {
          results.success.push(userId);
          console.log(`Notification sent to ${userId}`);
        } else {
          results.failed.push(userId);
          console.log(`Failed to send notification to ${userId}`);
        }
      } catch (error) {
        results.failed.push(userId);
        console.error(`Error sending to ${userId}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
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