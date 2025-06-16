# Discord Bot Setup Guide

## 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application (e.g., "Bodax Masters Bot")
4. Click "Create"

## 2. Configure OAuth2

1. In your application, go to "OAuth2" → "General"
2. Add redirect URI: `http://localhost:5173/discord-callback` (for development)
3. For production, add your deployed URL + `/discord-callback`
4. Copy the Client ID and Client Secret

## 3. Create Bot

1. Go to "Bot" section
2. Click "Add Bot"
3. Copy the Bot Token
4. Under "Privileged Gateway Intents", enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent

## 4. Bot Permissions

Your bot needs these permissions:
- Send Messages
- Send Messages in Threads
- Use Slash Commands
- Read Message History
- Add Reactions
- Manage Messages (for cleanup)

## 5. Environment Variables

Create a `.env` file in your project root:

```env
# Discord OAuth
REACT_APP_DISCORD_CLIENT_ID=your_client_id_here
REACT_APP_DISCORD_CLIENT_SECRET=your_client_secret_here
REACT_APP_DISCORD_REDIRECT_URI=http://localhost:5173/discord-callback

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

## 6. Invite Bot to Server

Use this URL (replace CLIENT_ID with your bot's client ID):
```
https://discord.com/api/oauth2/authorize?client_id=1376234321140252702&permissions=2147483648&scope=bot
```

## 7. Bot Features

The bot will handle:
- Tournament notifications via DM
- Match reminders
- Team registration confirmations
- Tournament updates
- Admin notifications

## 8. Security Notes

- Never commit your bot token or client secret to version control
- Use environment variables for all sensitive data
- Regularly rotate your bot token
- Set up proper error handling for API rate limits

## 9. Testing

1. Start your development server
2. Go to your profile page
3. Click "Link Discord"
4. Authorize the application
5. You should be redirected back with a linked Discord account

## 10. Production Deployment

For production:
1. Update redirect URIs in Discord Developer Portal
2. Set production environment variables
3. Deploy your application
4. Test the OAuth flow in production 