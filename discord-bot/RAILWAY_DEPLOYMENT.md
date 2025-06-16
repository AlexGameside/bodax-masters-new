# Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway account (free at railway.app)
- Discord bot token

## Steps to Deploy

### 1. Push to GitHub
Make sure your `discord-bot` folder is in a GitHub repository.

### 2. Deploy on Railway
1. Go to [railway.app](https://railway.app/) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set the root directory to `discord-bot` (or deploy the entire repo and set the root to `discord-bot`)

### 3. Set Environment Variables
In Railway dashboard, add these environment variables:
- `DISCORD_BOT_TOKEN` = your Discord bot token
- `DISCORD_GUILD_ID` = your Discord server ID (optional)

### 4. Deploy
Railway will automatically deploy your bot. The URL will be something like:
`https://your-app-name.railway.app`

### 5. Update Frontend
Once deployed, update your frontend's `.env` file:
```
VITE_DISCORD_API_URL=https://your-app-name.railway.app
```

### 6. Test
- Visit `https://your-app-name.railway.app/api/health` to check if it's running
- Test Discord notifications from your admin panel

## Troubleshooting
- Check Railway logs if the bot doesn't start
- Make sure all environment variables are set
- Verify your Discord bot token is correct 