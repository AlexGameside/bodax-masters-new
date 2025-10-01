# Discord Bot Setup Guide for Unity League

## 🚀 Quick Setup

### 1. Create Discord Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" → Name it "Unity League Bot"
3. Go to "Bot" section → Click "Add Bot"
4. Copy the **Bot Token** (keep this secret!)
5. Enable these bot permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Read Message History

### 2. Create Discord Server
1. Create a new Discord server for Unity League
2. Create these channels:
   - `#admin-alerts` - Admin notifications (tickets, disputes, admin actions)
   - `#tournament-updates` - Tournament announcements (registration, start)
   - `#general` - General community chat

**Note**: Player notifications (match scheduling, team invites, match reminders, etc.) are sent via **Direct Messages** to keep them private and personal.

### 3. Bot DM Requirements
For the bot to send DMs to users, they need to:
- **Be in the Discord server** where the bot is present, OR
- **Have previously interacted** with the bot (opened a DM with it)

**Important**: Users must join your Discord server to receive DM notifications!

### 4. Add Bot to Server
1. In Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
4. Copy the generated URL and open it
5. Select your Unity League server and authorize

### 5. Get Channel IDs
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click each channel → "Copy ID"
3. Save these IDs for environment variables

### 6. Environment Variables
Add these to your Vercel project environment variables:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_DISCORD_BOT_TOKEN=your_bot_token_here

# Discord Channel IDs (only for admin and tournament notifications)
NEXT_PUBLIC_DISCORD_ADMIN_CHANNEL_ID=channel_id_for_admin_alerts
NEXT_PUBLIC_DISCORD_TOURNAMENTS_CHANNEL_ID=channel_id_for_tournament_updates
```

### 7. Deploy Vercel Proxy
```bash
cd oauth-proxy
vercel --prod
```

## 📱 Notification Types

### Ticket Notifications
- ✅ **New Ticket Created** → `#admin-alerts` (mentions admins)
- ✅ **Ticket Answered** → **DM to user** (private notification)

### Match Notifications
- ✅ **Scheduling Request** → **DM to opponent team members**
- ✅ **Match Reminder** → **DM to both teams**
- ✅ **Match Completed** → **DM to both teams**

### Team Notifications
- ✅ **Team Invitation** → **DM to invited user**
- ✅ **Member Joined** → **DM to team members**

### Tournament Notifications
- ✅ **Tournament Registration** → `#tournament-updates`
- ✅ **Tournament Started** → `#tournament-updates`

### Dispute Notifications
- ✅ **Dispute Created** → `#admin-alerts` (mentions admins)

### Admin Notifications
- ✅ **Admin Actions** → `#admin-alerts` (logs admin activities)

## 🔧 Integration Examples

### In Ticket Creation
```typescript
import { notifyTicketCreated } from '../services/discordService';

// When creating a ticket
const createTicket = async (ticketData) => {
  const ticket = await createTicketInDB(ticketData);
  
  // Get admin Discord IDs
  const admins = await getAdminUsers();
  const adminDiscordIds = admins.map(admin => admin.discordId).filter(Boolean);
  
  // Send Discord notification
  await notifyTicketCreated(ticket, adminDiscordIds);
  
  return ticket;
};
```

### In Match Scheduling
```typescript
import { notifyMatchSchedulingRequest } from '../services/discordService';

// When suggesting match time
const suggestMatchTime = async (matchId, suggestedTime) => {
  const match = await getMatch(matchId);
  const opponentTeam = match.team1.id === currentTeamId ? match.team2 : match.team1;
  
  // Send Discord notification to opponent team
  await notifyMatchSchedulingRequest(match, opponentTeam, currentTeam);
};
```

### In Team Invitations
```typescript
import { notifyTeamInvitation } from '../services/discordService';

// When inviting team member
const inviteTeamMember = async (teamId, userId) => {
  const invitation = await createTeamInvitation(teamId, userId);
  
  const team = await getTeam(teamId);
  const invitedUser = await getUser(userId);
  const inviter = await getCurrentUser();
  
  // Send Discord notification
  await notifyTeamInvitation(team, invitedUser, inviter);
  
  return invitation;
};
```

## 🎨 Customization

### Custom Messages
```typescript
import { notifyCustomMessage } from '../services/discordService';

// Send custom notification
await notifyCustomMessage(
  'channel_id',
  'Custom message here',
  {
    title: 'Custom Title',
    description: 'Custom description',
    color: 0xff0000, // Red color
    fields: [
      { name: 'Field 1', value: 'Value 1', inline: true }
    ]
  },
  ['user_id_1', 'user_id_2'] // Optional mentions
);
```

### Rich Embeds
All notifications use Discord embeds with:
- 🎨 **Color coding** by notification type
- 📊 **Structured fields** with relevant information
- ⏰ **Timestamps** for when events occurred
- 🏷️ **Footers** with additional context
- 👥 **@mentions** for relevant users

## 🚨 Troubleshooting

### Bot Not Responding
1. Check bot token is correct
2. Verify bot has proper permissions in server
3. Check channel IDs are correct
4. Look at Vercel function logs for errors

### Missing DM Notifications
1. Ensure users have Discord accounts linked (`discordId` field in user profiles)
2. **Users must be in your Discord server** to receive DMs
3. Check if users have DMs enabled from server members
4. Verify bot has proper permissions in the server
5. Look at Vercel function logs for DM-specific errors

### DM vs Channel Messages
- **Channel Messages**: Admin notifications, tournament announcements
- **DM Messages**: Player notifications (matches, teams, tickets)
- **Why DMs?**: Keeps player notifications private and personal

### Rate Limits
- Discord has rate limits (50 requests per second)
- Notifications are batched to avoid limits
- Failed notifications are logged but don't break functionality

## 🔒 Security

- Bot token is stored securely in Vercel environment variables
- All API calls go through your Vercel proxy (no direct Discord API calls from frontend)
- User Discord IDs are only used for mentions (no sensitive data)
- Admin actions are logged for audit purposes

## 📈 Future Enhancements

- **Slash Commands**: `/match-status`, `/team-info`, `/tournament-schedule`
- **Interactive Buttons**: Accept/decline invitations directly in Discord
- **Scheduled Messages**: Automatic tournament reminders
- **Voice Channel Integration**: Auto-create voice channels for matches
- **Role Management**: Auto-assign roles based on team membership
- **Statistics**: Match statistics and leaderboards in Discord