# Discord Bot Integration - Bodax Masters

## 🎯 Overview

This project now includes a comprehensive Discord bot integration that provides:
- **🎫 Ticket System** - Create, manage, and close support tickets
- **⚔️ Match Dispute Handling** - Auto-create tickets for match disputes
- **🌐 Web Integration** - Create tickets directly from the website
- **👥 User Management** - Auto-add Discord users to tickets
- **🔔 Notifications** - Tournament, match, and team notifications
- **📊 Admin Dashboard** - Monitor and manage all tickets

## 🚀 Quick Start

### 1. Start the Discord Bot

```bash
cd discord-bot
npm install
npm start
```

The bot will run on `http://localhost:3001` by default.

### 2. Frontend Integration

The frontend automatically connects to the Discord bot API. Users with Discord linked can:
- Create support tickets from their profile
- Report match disputes from match pages
- View and manage their tickets
- Access the ticket management dashboard

## 🏗️ Architecture

### Discord Bot (`discord-bot/`)
- **`bot.js`** - Core bot functionality with ticket system
- **`server.js`** - Web API server for frontend integration
- **`package.json`** - Dependencies and scripts

### Frontend Integration (`src/`)
- **`services/discordBotService.ts`** - API client for Discord bot
- **`components/TicketCreationModal.tsx`** - Ticket creation interface
- **`pages/TicketManagement.tsx`** - Ticket management dashboard
- **Updated components** - Profile, MatchPage, Navbar with ticket features

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `discord-bot` folder:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_discord_server_id_here

# Discord Channel IDs
DISCORD_ADMIN_CHANNEL_ID=your_admin_channel_id_here
DISCORD_TICKET_CATEGORY_ID=your_ticket_category_id_here
DISCORD_SUPPORT_ROLE_ID=your_support_role_id_here

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Frontend Environment

Add to your frontend `.env`:

```env
VITE_DISCORD_BOT_API_URL=http://localhost:3001
```

## 🎫 Ticket System Features

### Ticket Types
- **General** - General support requests
- **Support** - Technical support
- **Dispute** - Match disputes (auto-posts to admin channel)

### Ticket Status
- **🟡 Open** - New ticket, waiting for response
- **👤 Claimed** - Staff member has claimed the ticket
- **⬆️ Escalated** - Ticket requires admin attention
- **🔒 Closed** - Ticket resolved and closed

### Automatic Features
- **Auto-numbering** - Each ticket gets a unique number
- **User Addition** - If user is in Discord server, automatically added to ticket
- **Permission Management** - Only ticket participants and support staff can see tickets
- **Auto-cleanup** - Closed tickets are deleted after 30 seconds
- **Admin Notifications** - Disputes automatically post to admin channel

## 🔗 API Endpoints

### Ticket Management
- `POST /api/tickets` - Create a new ticket
- `POST /api/tickets/dispute` - Create a match dispute ticket
- `GET /api/tickets` - Get all active tickets
- `GET /api/tickets/:id` - Get specific ticket
- `GET /api/tickets/user/:userId` - Get user's tickets
- `POST /api/tickets/:id/close` - Close a ticket

### Notifications
- `POST /api/notifications/tournament` - Send tournament notifications
- `POST /api/notifications/match` - Send match notifications
- `POST /api/notifications/team-invitation` - Send team invitations
- `POST /api/notifications/admin` - Send admin notifications

### Bot Status
- `GET /health` - Health check
- `GET /api/bot/status` - Bot status and uptime

## 🎮 Frontend Integration

### Creating Tickets

#### From Profile Page
Users can create general support tickets from their profile page after linking Discord.

#### From Match Pages
Users can create dispute tickets when a match is in "disputed" state.

#### From Ticket Management
Users can create any type of ticket from the dedicated ticket management page.

### Ticket Management Dashboard

The `/tickets` route provides:
- **View all tickets** (admin) or user's tickets (regular user)
- **Filter by status, type, and search**
- **Sort by priority, date, or status**
- **Create new tickets**
- **View ticket details and status**
- **Close tickets** (admin only)

### Navigation Integration

- **Navbar** - "Support Tickets" link (only visible when Discord is linked)
- **Profile** - Quick access to create tickets and view tickets
- **Match Pages** - Dispute ticket creation for disputed matches

## 🔒 Security Features

### Permission System
- **User Tickets** - Users can only see their own tickets
- **Admin Access** - Admins can see and manage all tickets
- **Discord Integration** - Only users with linked Discord can create tickets

### Rate Limiting
- Discord API rate limits are respected
- Frontend validation prevents spam submissions

### Data Privacy
- Only necessary user information is stored
- Tickets are automatically cleaned up after closure

## 🚀 Deployment

### Discord Bot Deployment

#### Railway (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### Vercel
1. Import your repository
2. Set environment variables
3. Deploy as serverless function

#### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
npm start    # Production start
```

### Frontend Deployment

The frontend automatically connects to the Discord bot API. Ensure:
1. `VITE_DISCORD_BOT_API_URL` is set correctly
2. CORS is configured on the bot server
3. Environment variables are set in production

## 🧪 Testing

### Test Ticket Creation
1. Link Discord account in profile
2. Go to `/tickets` page
3. Click "Create Ticket"
4. Fill out ticket form
5. Submit and verify ticket appears in Discord

### Test Match Dispute
1. Navigate to a match page
2. Set match state to "disputed" (admin only)
3. Click "Create Dispute Ticket"
4. Verify ticket is created with match information
5. Check admin channel for dispute notification

### Test Bot API
```bash
# Health check
curl http://localhost:3001/health

# Bot status
curl http://localhost:3001/api/bot/status

# Create test ticket
curl -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","subject":"Test","description":"Test ticket"}'
```

## 🔧 Troubleshooting

### Common Issues

#### Bot Not Responding
- Check if bot is online in Discord
- Verify bot token is correct
- Check bot permissions in server

#### Cannot Create Tickets
- Verify bot has "Manage Channels" permission
- Check if bot is in the correct server
- Verify environment variables are set

#### Users Not Added to Tickets
- User must be in the Discord server
- Bot needs "Server Members Intent" enabled
- Check bot permissions

#### API Errors
- Verify server is running on correct port
- Check CORS configuration
- Verify request format matches API spec

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=discord-bot:*
```

### Logs

Check bot server logs for:
- Ticket creation/deletion events
- User permission issues
- Discord API errors
- Web API request logs

## 📱 User Experience

### Ticket Creation Flow
1. **User clicks "Create Ticket"**
2. **Modal opens with ticket form**
3. **User selects ticket type and fills details**
4. **Ticket is created in Discord**
5. **User is automatically added to ticket**
6. **Support staff can claim and manage ticket**

### Dispute Resolution Flow
1. **Match enters disputed state**
2. **User creates dispute ticket**
3. **Ticket automatically posts to admin channel**
4. **Admins can view and manage dispute**
5. **Resolution is tracked in ticket**
6. **Ticket is closed when resolved**

### Notification System
- **Tournament updates** sent to all participants
- **Match reminders** sent before start time
- **Team invitations** sent to specific users
- **Admin alerts** for important events

## 🔄 Future Enhancements

### Planned Features
- **Ticket Categories** - Organize tickets by type
- **Priority Levels** - Set ticket importance
- **Response Templates** - Quick response options
- **Ticket Analytics** - Track response times and resolution rates
- **Integration with Match System** - Auto-create tickets for specific match states

### API Extensions
- **Webhook Support** - Real-time updates to external systems
- **Bulk Operations** - Manage multiple tickets at once
- **Advanced Filtering** - Complex search and filter options
- **Export Functionality** - Download ticket data

## 📚 Documentation

### Related Files
- `discord-bot/DISCORD_BOT_SETUP.md` - Detailed bot setup guide
- `src/services/discordBotService.ts` - API client documentation
- `src/components/TicketCreationModal.tsx` - Component usage
- `src/pages/TicketManagement.tsx` - Dashboard implementation

### External Resources
- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers)
- [Discord Bot Permissions](https://discord.com/developers/docs/topics/permissions)

---

## 🎯 Getting Started Checklist

- [ ] Set up Discord application and bot
- [ ] Configure environment variables
- [ ] Start Discord bot server
- [ ] Test bot connection
- [ ] Create test tickets
- [ ] Verify frontend integration
- [ ] Test dispute ticket creation
- [ ] Configure admin notifications
- [ ] Deploy to production
- [ ] Train support staff on ticket management

**🎉 Your Discord bot integration is now ready to handle tickets, disputes, and notifications for Bodax Masters!** 