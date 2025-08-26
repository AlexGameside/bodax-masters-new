# Discord Bot Setup Guide - Bodax Masters

## 🎯 Features

This Discord bot provides:
- **🎫 Ticket System** - Create, manage, and close support tickets
- **⚔️ Match Dispute Handling** - Auto-create tickets for match disputes
- **🌐 Web Integration** - Create tickets directly from the website
- **👥 User Management** - Auto-add Discord users to tickets
- **🔔 Notifications** - Tournament, match, and team notifications
- **📊 Admin Dashboard** - Monitor and manage all tickets

## 🚀 Quick Setup

### 1. Create Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it "Bodax Masters Bot"
3. Go to "Bot" section and click "Add Bot"
4. Copy the **Bot Token** (you'll need this)
5. Under "Privileged Gateway Intents", enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent

### 2. Invite Bot to Your Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions:
   - ✅ Manage Channels
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. Copy the generated URL and open it in browser
5. Select your server and authorize the bot

### 3. Get Required IDs

#### Server ID (Guild ID)
- Right-click your server name → "Copy Server ID"

#### Admin Channel ID
- Right-click the admin channel → "Copy Channel ID"
- This is where dispute notifications will be posted

#### Support Role ID
- Go to Server Settings → Roles
- Right-click the support role → "Copy Role ID"
- This role will have access to all tickets

#### Ticket Category ID (Optional)
- Create a category called "🎫 Support Tickets"
- Right-click it → "Copy Category ID"
- If not set, bot will create it automatically

### 4. Environment Variables

Create a `.env` file in the `discord-bot` folder:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Discord Channel IDs
DISCORD_ADMIN_CHANNEL_ID=your_admin_channel_id_here
DISCORD_TICKET_CATEGORY_ID=your_ticket_category_id_here
DISCORD_SUPPORT_ROLE_ID=your_support_role_id_here

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 5. Install Dependencies & Start

```bash
cd discord-bot
npm install
npm start
```

## 🔧 API Endpoints

### Ticket Management

#### Create Ticket
```http
POST /api/tickets
Content-Type: application/json

{
  "userId": "discord_user_id",
  "subject": "Ticket Subject",
  "description": "Ticket Description",
  "ticketType": "general|dispute|support",
  "matchInfo": {
    "team1": "Team Name 1",
    "team2": "Team Name 2",
    "map": "Map Name",
    "phase": "Match Phase"
  }
}
```

#### Create Match Dispute
```http
POST /api/tickets/dispute
Content-Type: application/json

{
  "userId": "discord_user_id",
  "matchInfo": {
    "team1": "Team Name 1",
    "team2": "Team Name 2",
    "map": "Map Name",
    "phase": "Match Phase"
  },
  "disputeReason": "Reason for dispute"
}
```

#### Get Ticket Status
```http
GET /api/tickets/{ticketNumber}
```

#### Get All Tickets
```http
GET /api/tickets
```

#### Get User Tickets
```http
GET /api/tickets/user/{userId}
```

#### Close Ticket
```http
POST /api/tickets/{ticketNumber}/close
Content-Type: application/json

{
  "closedBy": "username"
}
```

### Notifications

#### Tournament Notification
```http
POST /api/notifications/tournament
Content-Type: application/json

{
  "userIds": ["user_id_1", "user_id_2"],
  "tournamentName": "Tournament Name",
  "startTime": "Start Time",
  "message": "Notification message"
}
```

#### Match Notification
```http
POST /api/notifications/match
Content-Type: application/json

{
  "userIds": ["user_id_1", "user_id_2"],
  "team1Name": "Team 1",
  "team2Name": "Team 2",
  "matchTime": "Match Time",
  "map": "Map Name"
}
```

#### Team Invitation
```http
POST /api/notifications/team-invitation
Content-Type: application/json

{
  "userId": "user_id",
  "teamName": "Team Name",
  "inviterName": "Inviter Name"
}
```

#### Admin Notification
```http
POST /api/notifications/admin
Content-Type: application/json

{
  "userIds": ["user_id_1", "user_id_2"],
  "title": "Notification Title",
  "message": "Notification message",
  "type": "info|warning|error|success"
}
```

### Bot Status

#### Health Check
```http
GET /health
```

#### Bot Status
```http
GET /api/bot/status
```

## 🎫 Ticket System Features

### Automatic Features
- **Auto-numbering** - Each ticket gets a unique number
- **User Addition** - If user is in Discord server, automatically added to ticket
- **Permission Management** - Only ticket participants and support staff can see tickets
- **Auto-cleanup** - Closed tickets are deleted after 30 seconds

### Ticket Types
- **General** - General support requests
- **Dispute** - Match disputes (auto-posts to admin channel)
- **Support** - Technical support

### Ticket Status
- **🟡 Open** - New ticket, waiting for response
- **👤 Claimed** - Staff member has claimed the ticket
- **⬆️ Escalated** - Ticket requires admin attention
- **🔒 Closed** - Ticket resolved and closed

### Action Buttons
- **🔒 Close Ticket** - Close and archive the ticket
- **👤 Claim Ticket** - Staff member claims responsibility
- **⬆️ Escalate** - Escalate to admin attention

## 🔗 Frontend Integration

### Creating Tickets from Website

```typescript
// Create general ticket
const response = await fetch('http://localhost:3001/api/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: currentUser.discordId,
    subject: 'Support Request',
    description: 'I need help with...',
    ticketType: 'general'
  })
});

// Create match dispute
const response = await fetch('http://localhost:3001/api/tickets/dispute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: currentUser.discordId,
    matchInfo: {
      team1: 'Team A',
      team2: 'Team B',
      map: 'Ascent',
      phase: 'Map Banning'
    },
    disputeReason: 'Opponent team is not responding'
  })
});
```

### Checking Ticket Status

```typescript
// Get user's tickets
const response = await fetch(`http://localhost:3001/api/tickets/user/${currentUser.discordId}`);
const { tickets } = await response.json();

// Get specific ticket
const response = await fetch(`http://localhost:3001/api/tickets/${ticketNumber}`);
const { ticket } = await response.json();
```

## 🚀 Deployment

### Railway (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Vercel
1. Import your repository
2. Set environment variables
3. Deploy as serverless function

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
npm start    # Production start
```

## 🔒 Security Notes

- **Bot Token** - Never share or commit your bot token
- **Permissions** - Bot only needs minimal required permissions
- **Rate Limiting** - Discord has rate limits, respect them
- **User Privacy** - Only store necessary user information

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if bot is online in Discord
   - Verify bot token is correct
   - Check bot permissions in server

2. **Cannot create tickets**
   - Verify bot has "Manage Channels" permission
   - Check if bot is in the correct server
   - Verify environment variables are set

3. **Users not added to tickets**
   - User must be in the Discord server
   - Bot needs "Server Members Intent" enabled
   - Check bot permissions

4. **API errors**
   - Verify server is running on correct port
   - Check CORS configuration
   - Verify request format matches API spec

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=discord-bot:*
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check Discord Developer Portal for bot status
4. Review server logs for error messages

## 🔄 Updates

To update the bot:
1. Pull latest changes from repository
2. Install new dependencies: `npm install`
3. Restart the bot: `npm start`
4. Verify bot is working correctly

---

**🎯 The bot is now ready to handle tickets, disputes, and notifications for Bodax Masters!** 