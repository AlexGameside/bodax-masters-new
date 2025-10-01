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
    const { 
      type, 
      channelId, 
      message, 
      embed, 
      botToken,
      userIds = [] // For DM notifications
    } = req.body;

    if (!type || !botToken) {
      return res.status(400).json({ error: 'Missing required fields: type, botToken' });
    }

    // Determine if this is a channel message or DM
    const isChannelMessage = channelId && userIds.length === 0;
    const isDMNotification = userIds.length > 0;

    if (isChannelMessage) {
      // Send to Discord channel (for admin notifications)
      const response = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message || '',
          embeds: embed ? [embed] : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Discord channel API error:', errorText);
        return res.status(response.status).json({ 
          error: 'Failed to send Discord channel notification',
          details: errorText 
        });
      }

      const result = await response.json();
      res.status(200).json({ success: true, messageId: result.id, type: 'channel' });
      
    } else if (isDMNotification) {
      // Send DMs to individual users
      const dmResults = [];
      
      for (const userId of userIds) {
        try {
          // Create DM channel with user
          const dmChannelResponse = await fetch('https://discord.com/api/users/@me/channels', {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient_id: userId
            })
          });

          if (!dmChannelResponse.ok) {
            console.warn(`Failed to create DM channel for user ${userId}:`, await dmChannelResponse.text());
            dmResults.push({ userId, success: false, error: 'Failed to create DM channel' });
            continue;
          }

          const dmChannel = await dmChannelResponse.json();

          // Send message to DM channel
          const messageResponse = await fetch(`https://discord.com/api/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message || '',
              embeds: embed ? [embed] : undefined
            })
          });

          if (!messageResponse.ok) {
            console.warn(`Failed to send DM to user ${userId}:`, await messageResponse.text());
            dmResults.push({ userId, success: false, error: 'Failed to send DM' });
            continue;
          }

          const messageResult = await messageResponse.json();
          dmResults.push({ userId, success: true, messageId: messageResult.id });
          
        } catch (error) {
          console.error(`Error sending DM to user ${userId}:`, error);
          dmResults.push({ userId, success: false, error: error.message });
        }
      }

      res.status(200).json({ 
        success: true, 
        type: 'dm', 
        results: dmResults,
        successfulDMs: dmResults.filter(r => r.success).length,
        totalDMs: dmResults.length
      });
      
    } else {
      return res.status(400).json({ 
        error: 'Either channelId (for channel messages) or userIds (for DMs) must be provided' 
      });
    }

  } catch (error) {
    console.error('Error in Discord notification endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
