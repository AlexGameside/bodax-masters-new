# 🚀 Heroku Deployment Guide

## Quick Deploy to Heroku

### 1. Install Heroku CLI (Already Done!)
```bash
brew install heroku/brew/heroku
```

### 2. Login to Heroku
```bash
heroku login
```

### 3. Create Heroku App
```bash
heroku create bodax-masters-discord-bot
```

### 4. Set Environment Variables
```bash
heroku config:set DISCORD_BOT_TOKEN=your_bot_token_here
heroku config:set DISCORD_GUILD_ID=your_guild_id_here
heroku config:set DISCORD_ADMIN_CHANNEL_ID=your_admin_channel_id_here
heroku config:set DISCORD_TICKET_CATEGORY_ID=your_ticket_category_id_here
heroku config:set DISCORD_SUPPORT_ROLE_ID=your_support_role_id_here
heroku config:set DISCORD_TICKET_CHANNEL_ID=your_ticket_channel_id_here
```

### 5. Deploy
```bash
git add .
git commit -m "Deploy Discord bot to Heroku"
git push heroku main
```

### 6. Get Your URL
```bash
heroku open
# Or check with: heroku info
```

## Environment Variables Needed

- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_GUILD_ID` - Your Discord server ID
- `DISCORD_ADMIN_CHANNEL_ID` - Admin notifications channel
- `DISCORD_TICKET_CATEGORY_ID` - Category for ticket channels
- `DISCORD_SUPPORT_ROLE_ID` - Role for support team
- `DISCORD_TICKET_CHANNEL_ID` - Channel for ticket creation

## After Deployment

1. **Copy your Heroku URL** (e.g., `https://bodax-masters-discord-bot.herokuapp.com`)
2. **Update your frontend** to use this URL instead of `localhost:3001`
3. **Test the integration** on your live site

## Troubleshooting

- **Check logs**: `heroku logs --tail`
- **Restart dyno**: `heroku restart`
- **View config**: `heroku config`
- **Check status**: `heroku ps`

## Important Notes

- **Free tier is discontinued** - you'll need a paid plan (starting at $5/month)
- **Heroku is very reliable** for Discord bots
- **Auto-scales** based on usage
- **Great for production** use 