# 🌟 Render Deployment Guide (FREE!)

## Quick Deploy to Render

### 1. Go to Render.com
- Visit [render.com](https://render.com)
- Sign up with GitHub (free)

### 2. Connect Your Repository
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Set root directory to `discord-bot`

### 3. Configure the Service
- **Name**: `bodax-masters-discord-bot`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 4. Set Environment Variables
Click "Environment" tab and add:
- `DISCORD_BOT_TOKEN` = your bot token
- `DISCORD_GUILD_ID` = your server ID
- `DISCORD_ADMIN_CHANNEL_ID` = admin channel
- `DISCORD_TICKET_CATEGORY_ID` = ticket category
- `DISCORD_SUPPORT_ROLE_ID` = support role
- `DISCORD_TICKET_CHANNEL_ID` = ticket channel

### 5. Deploy
- Click "Create Web Service"
- Wait for build to complete
- Get your URL (e.g., `https://your-bot.onrender.com`)

## Why Render?

✅ **Completely FREE** - no credit card required
✅ **Auto-deploys** from GitHub
✅ **Great for Discord bots** - handles webhooks perfectly
✅ **Reliable** - used by thousands of developers
✅ **Auto-scales** - handles traffic spikes

## After Deployment

1. **Copy your Render URL** (e.g., `https://your-bot.onrender.com`)
2. **Update your frontend** to use this URL instead of `localhost:3001`
3. **Test everything** on your live site

## Troubleshooting

- **Check logs** in Render dashboard
- **Restart service** if needed
- **Verify environment variables** are set correctly

## Next Steps

Once deployed, you'll have a public URL that **everyone** can access, making your Discord integration work for all users! 🎉 