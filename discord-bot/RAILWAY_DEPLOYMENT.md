# 🚂 Railway Deployment Guide

## Quick Deploy to Railway

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
cd discord-bot
railway init
```

### 4. Set Environment Variables
```bash
railway variables set DISCORD_BOT_TOKEN=your_bot_token_here
railway variables set DISCORD_GUILD_ID=your_guild_id_here
railway variables set DISCORD_ADMIN_CHANNEL_ID=your_admin_channel_id_here
railway variables set DISCORD_TICKET_CATEGORY_ID=your_ticket_category_id_here
railway variables set DISCORD_SUPPORT_ROLE_ID=your_support_role_id_here
railway variables set DISCORD_TICKET_CHANNEL_ID=your_ticket_channel_id_here
```

### 5. Deploy
```bash
railway up
```

### 6. Get Your URL
```bash
railway domain
```

## Environment Variables Needed

- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server ID
- `DISCORD_ADMIN_CHANNEL_ID` - Admin notifications channel
- `DISCORD_TICKET_CATEGORY_ID` - Category for ticket channels
- `DISCORD_SUPPORT_ROLE_ID` - Role for support team
- `DISCORD_TICKET_CHANNEL_ID` - Channel for ticket creation

## After Deployment

1. **Copy your Railway URL** (e.g., `https://your-bot-name.railway.app`)
2. **Update your frontend** to use this URL instead of `localhost:3001`
3. **Test the integration** on your live site

## Troubleshooting

- **Check logs**: `railway logs`
- **Restart service**: `railway service restart`
- **View variables**: `railway variables` 