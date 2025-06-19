const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN) {
  console.error('Discord bot token not found in environment variables');
  process.exit(1);
}

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log(`Bot is ready to send notifications!`);
});

// Function to send tournament notification
async function sendTournamentNotification(userIds, tournamentName, startTime, message) {
  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🏆 Tournament Notification')
    .setDescription(message)
    .addFields(
      { name: 'Tournament', value: tournamentName, inline: true },
      { name: 'Start Time', value: startTime, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Bodax Masters Tournament' });

  const results = {
    success: [],
    failed: []
  };

  for (const userId of userIds) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      results.success.push(userId);
    } catch (error) {
      results.failed.push(userId);
    }
  }

  return results;
}

// Function to send match notification
async function sendMatchNotification(userIds, team1Name, team2Name, matchTime, map) {
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('⚔️ Match Starting Soon')
    .setDescription(`Your match is about to begin!`)
    .addFields(
      { name: 'Match', value: `${team1Name} vs ${team2Name}`, inline: true },
      { name: 'Map', value: map || 'TBD', inline: true },
      { name: 'Start Time', value: matchTime, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Bodax Masters Tournament' });

  const results = {
    success: [],
    failed: []
  };

  for (const userId of userIds) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      results.success.push(userId);
    } catch (error) {
      results.failed.push(userId);
    }
  }

  return results;
}

// Function to send team invitation
async function sendTeamInvitation(userId, teamName, inviterName) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('👥 Team Invitation')
    .setDescription(`You've been invited to join a team!`)
    .addFields(
      { name: 'Team', value: teamName, inline: true },
      { name: 'Invited by', value: inviterName, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Bodax Masters Tournament' });

  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to send admin notification
async function sendAdminNotification(userIds, title, message, type = 'info') {
  const colors = {
    info: '#0099ff',
    warning: '#ff9900',
    error: '#ff0000',
    success: '#00ff00'
  };

  const embed = new EmbedBuilder()
    .setColor(colors[type] || colors.info)
    .setTitle(`🔔 Admin Notification: ${title}`)
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'Bodax Masters Admin Panel' });

  const results = {
    success: [],
    failed: []
  };

  for (const userId of userIds) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      results.success.push(userId);
    } catch (error) {
      results.failed.push(userId);
    }
  }

  return results;
}

// Export functions for use in other parts of the application
module.exports = {
  sendTournamentNotification,
  sendMatchNotification,
  sendTeamInvitation,
  sendAdminNotification,
  client
};

// Start the bot
client.login(BOT_TOKEN);

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down Discord bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Discord bot...');
  client.destroy();
  process.exit(0);
}); 