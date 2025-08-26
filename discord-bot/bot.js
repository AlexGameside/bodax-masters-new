const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ChannelType, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadAutoArchiveDuration,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

// Bot configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ADMIN_CHANNEL_ID = process.env.DISCORD_ADMIN_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.DISCORD_TICKET_CATEGORY_ID;
const SUPPORT_ROLE_ID = process.env.DISCORD_SUPPORT_ROLE_ID;
const TICKET_CHANNEL_ID = process.env.DISCORD_TICKET_CHANNEL_ID; // Channel where the ticket creation embed is posted

// Slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('View your active tickets'),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket (only works in ticket channels)')
];

if (!BOT_TOKEN) {
  console.error('Discord bot token not found in environment variables');
  process.exit(1);
}

// Ticket management
const activeTickets = new Map();
const ticketCounter = new Map();

// Register slash commands
async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    
    if (GUILD_ID) {
      // Guild-specific commands (faster to update)
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Slash commands registered for guild ${GUILD_ID}`);
    } else {
      // Global commands (slower but works everywhere)
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('✅ Slash commands registered globally');
    }
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  
  // Register slash commands
  await registerCommands();
  
  // Initialize ticket counter
  if (GUILD_ID) {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
      ticketCounter.set(guild.id, 1);
    }
  }
  
  console.log(`Bot is ready to handle tickets and notifications!`);
  
  // Create the ticket creation embed
  await createTicketCreationEmbed();
});

// ===== REACTION EVENT HANDLERS =====

// Handle reaction add
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    console.log(`🎯 Reaction received: ${reaction.emoji.name} from ${user.tag}`);
    
    // Fetch the full reaction if it's partial
    if (reaction.partial) {
      await reaction.fetch();
    }
    
    // Check if this is a reaction to our ticket creation message
    if (reaction.message.channel.id === TICKET_CHANNEL_ID) {
      console.log(`✅ Processing ticket reaction in correct channel`);
      await handleTicketReaction(reaction, user);
    } else {
      console.log(`❌ Reaction not in ticket channel: ${reaction.message.channel.id} vs ${TICKET_CHANNEL_ID}`);
    }
  } catch (error) {
    console.error('❌ Error handling reaction add:', error);
  }
});

// Handle reaction remove (optional, for cleanup)
client.on('messageReactionRemove', async (reaction, user) => {
  // Could be used for canceling ticket creation if needed
});

// ===== REACTION-BASED TICKET SYSTEM =====

// Create the main ticket creation embed
async function createTicketCreationEmbed() {
  if (!TICKET_CHANNEL_ID) {
    console.log('⚠️ TICKET_CHANNEL_ID not set, skipping ticket creation embed');
    return;
  }

  try {
    const channel = client.channels.cache.get(TICKET_CHANNEL_ID);
    if (!channel) {
      console.log('❌ Ticket channel not found');
      return;
    }

    // Clear existing messages in the channel
    const messages = await channel.messages.fetch({ limit: 100 });
    await channel.bulkDelete(messages);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎫 Support Ticket System')
      .setDescription('React to one of the options below to create a support ticket.')
      .addFields(
        { name: '🔧 General Support', value: 'Technical issues, account problems, general questions', inline: true },
        { name: '⚔️ Match Issues', value: 'Problems with matches, disputes, scheduling', inline: true },
        { name: '📋 Other Issues', value: 'Tournament questions, team issues, other concerns', inline: true }
      )
      .setFooter({ text: 'Click a reaction to get started' })
      .setTimestamp();

    const message = await channel.send({ embeds: [embed] });
    
    // Add reaction options
    await message.react('🔧'); // General Support
    await message.react('⚔️'); // Match Issues  
    await message.react('📋'); // Other Issues

    console.log('✅ Ticket creation embed posted');
  } catch (error) {
    console.error('❌ Error creating ticket embed:', error);
  }
}

// Handle reaction-based ticket creation
async function handleTicketReaction(reaction, user) {
  console.log(`🎫 Processing ticket reaction: ${reaction.emoji.name} from ${user.tag}`);
  
  if (user.bot) {
    console.log(`❌ Ignoring bot reaction`);
    return;
  }
  
  if (reaction.message.channel.id !== TICKET_CHANNEL_ID) {
    console.log(`❌ Reaction not in ticket channel`);
    return;
  }

  const emoji = reaction.emoji.name;
  let ticketType = '';
  let nextStep = '';

  console.log(`🔍 Processing emoji: ${emoji}`);

  switch (emoji) {
    case '🔧':
      ticketType = 'general';
      nextStep = 'general_support';
      console.log(`✅ General support ticket selected`);
      break;
    case '⚔️':
      ticketType = 'match';
      nextStep = 'check_discord_linked';
      console.log(`✅ Match issue ticket selected`);
      break;
    case '📋':
      ticketType = 'other';
      nextStep = 'other_issues';
      console.log(`✅ Other issues ticket selected`);
      break;
    default:
      console.log(`❌ Unknown emoji: ${emoji}`);
      return;
  }

  console.log(`🚀 Starting ticket flow: ${ticketType} -> ${nextStep}`);
  
  // Start the ticket creation flow
  await startTicketFlow(user, ticketType, nextStep);
}

// Start the ticket creation flow
async function startTicketFlow(user, ticketType, step) {
  try {
    switch (step) {
      case 'check_discord_linked':
        await checkDiscordLinked(user, ticketType);
        break;
      case 'check_open_matches':
        await checkOpenMatches(user, ticketType);
        break;
      case 'general_support':
        await createGeneralTicket(user, ticketType);
        break;
      case 'other_issues':
        await createOtherTicket(user, ticketType);
        break;
      default:
        await user.send('❌ Invalid ticket flow step');
    }
  } catch (error) {
    console.error('Error in ticket flow:', error);
    await user.send('❌ An error occurred while creating your ticket. Please try again.');
  }
}

// Check if user has Discord linked
async function checkDiscordLinked(user, ticketType) {
  // Send initial message to user
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🔍 Checking Discord Link Status')
    .setDescription('Let me check if your Discord account is linked to our system...')
    .addFields(
      { name: 'Step', value: '1/3 - Discord Link Check', inline: true },
      { name: 'Status', value: '⏳ Checking...', inline: true }
    )
    .setTimestamp();

  const message = await user.send({ embeds: [embed] });
  
  // Simulate checking Discord link (in real implementation, check your database)
  // For now, we'll assume they're linked and move to next step
  setTimeout(async () => {
    await checkOpenMatches(user, ticketType, message);
  }, 2000);
}

// Check for open matches
async function checkOpenMatches(user, ticketType, originalMessage) {
  // Update the message to show we're checking matches
  const checkingEmbed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('⚔️ Checking for Active Matches')
    .setDescription('Now let me check if you have any active matches...')
    .addFields(
      { name: 'Step', value: '2/3 - Match Check', inline: true },
      { name: 'Status', value: '⏳ Searching...', inline: true }
    )
    .setTimestamp();

  await originalMessage.edit({ embeds: [checkingEmbed] });
  
  // Simulate checking for matches (in real implementation, query your database)
  setTimeout(async () => {
    await showMatchSelection(user, ticketType, originalMessage);
  }, 2000);
}

// Show match selection to user
async function showMatchSelection(user, ticketType, originalMessage) {
  try {
    // Get real match data from your API
    const response = await fetch(`http://localhost:3001/api/matches/user/${user.id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch matches');
    }
    
    const activeMatches = data.matches || [];
    
    console.log(`📊 Found ${activeMatches.length} active matches for user ${user.tag}`);
  
  if (activeMatches.length === 0) {
    // No active matches
    const noMatchesEmbed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('📭 No Active Matches Found')
      .setDescription('You don\'t have any active matches at the moment.')
      .addFields(
        { name: 'Step', value: '2/3 - Match Check', inline: true },
        { name: 'Status', value: '❌ No matches found', inline: true },
        { name: 'Next', value: 'Creating general match issue ticket...', inline: false }
      )
      .setTimestamp();

    await originalMessage.edit({ embeds: [noMatchesEmbed] });
    
    // Create a general match issue ticket
    setTimeout(async () => {
      await createMatchIssueTicket(user, ticketType, originalMessage, null);
    }, 2000);
    
    return;
  }
  
  // Show matches for selection
  const matchSelectionEmbed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('⚔️ Active Matches Found')
    .setDescription('Please select which match you\'re having issues with:')
    .addFields(
      { name: 'Step', value: '2/3 - Match Selection', inline: true },
      { name: 'Status', value: '✅ Matches found', inline: true },
      { name: 'Instructions', value: 'React with the number of the match you want to report', inline: false }
    )
    .setTimestamp();

  // Add match details
  activeMatches.forEach((match, index) => {
    matchSelectionEmbed.addFields({
      name: `${index + 1}️⃣ ${match.team1} vs ${match.team2}`,
      value: `**Map:** ${match.map} | **Phase:** ${match.phase}`,
      inline: false
    });
  });

  // Add "No, different issue" option
  matchSelectionEmbed.addFields({
    name: '❌ Different Issue',
    value: 'If none of these matches are related to your issue',
    inline: false
  });

  const matchMessage = await user.send({ embeds: [matchSelectionEmbed] });
  
  // Add reaction options for match selection
  const reactions = ['1️⃣', '2️⃣', '❌'];
  for (const reaction of reactions) {
    await matchMessage.react(reaction);
  }
  
  // Store the match selection message for later processing
  user.matchSelectionMessage = matchMessage;
  user.activeMatches = activeMatches;
  
  // Wait for user to select a match (this would need to be handled by a reaction collector)
  // For now, we'll simulate the user selecting the first match
  setTimeout(async () => {
    await createMatchIssueTicket(user, ticketType, originalMessage, activeMatches[0]);
  }, 10000); // Give user 10 seconds to react
  
  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    
    // Fallback to creating a general match issue ticket
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Error Fetching Matches')
      .setDescription('Could not fetch your active matches. Creating a general match issue ticket.')
      .addFields(
        { name: 'Step', value: '2/3 - Match Check', inline: true },
        { name: 'Status', value: '❌ Error occurred', inline: true }
      )
      .setTimestamp();

    await originalMessage.edit({ embeds: [errorEmbed] });
    
    setTimeout(async () => {
      await createMatchIssueTicket(user, ticketType, originalMessage, null);
    }, 2000);
  }
}

// Create match issue ticket
async function createMatchIssueTicket(user, ticketType, originalMessage, selectedMatch) {
  // Update the message to show we're creating the ticket
  const creatingEmbed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('🎫 Creating Match Issue Ticket')
    .setDescription('Creating your match issue ticket...')
    .addFields(
      { name: 'Step', value: '3/3 - Ticket Creation', inline: true },
      { name: 'Status', value: '⏳ Creating...', inline: true }
    )
    .setTimestamp();

  if (selectedMatch) {
    creatingEmbed.addFields({
      name: 'Selected Match',
      value: `${selectedMatch.team1} vs ${selectedMatch.team2} on ${selectedMatch.map}`,
      inline: false
    });
  }

  await originalMessage.edit({ embeds: [creatingEmbed] });
  
  // Create the actual ticket
  const ticketDescription = selectedMatch 
    ? `Match Issue: ${selectedMatch.team1} vs ${selectedMatch.team2} on ${selectedMatch.map} (${selectedMatch.phase})`
    : 'General match issue reported via Discord';
    
  const ticket = await createTicket(user.id, 'Match Issue', ticketDescription, 'match', selectedMatch);
  
  if (ticket) {
    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Ticket Created Successfully')
      .setDescription(`Your match issue ticket has been created!`)
      .addFields(
        { name: 'Ticket Number', value: `#${ticket.id}`, inline: true },
        { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true },
        { name: 'Type', value: 'Match Issue', inline: true }
      )
      .setTimestamp();

    if (selectedMatch) {
      successEmbed.addFields({
        name: 'Match Details',
        value: `${selectedMatch.team1} vs ${selectedMatch.team2} on ${selectedMatch.map}`,
        inline: false
      });
    }

    await originalMessage.edit({ embeds: [successEmbed] });
  }
}

// Create general support ticket
async function createGeneralTicket(user, ticketType) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🔧 General Support Ticket')
    .setDescription('Creating a general support ticket for you...')
    .addFields(
      { name: 'Type', value: 'General Support', inline: true },
      { name: 'User', value: user.tag, inline: true }
    )
    .setTimestamp();

  const message = await user.send({ embeds: [embed] });
  
  const ticket = await createTicket(user.id, 'General Support', 'User requested general support via Discord reaction', 'general');
  
  if (ticket) {
    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Ticket Created Successfully')
      .setDescription(`Your general support ticket has been created!`)
      .addFields(
        { name: 'Ticket Number', value: `#${ticket.id}`, inline: true },
        { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }
      )
      .setTimestamp();

    await message.edit({ embeds: [successEmbed] });
  }
}

// Create other issues ticket
async function createOtherTicket(user, ticketType) {
  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('📋 Other Issues Ticket')
    .setDescription('Creating an other issues ticket for you...')
    .addFields(
      { name: 'Type', value: 'Other Issues', inline: true },
      { name: 'User', value: user.tag, inline: true }
    )
    .setTimestamp();

  const message = await user.send({ embeds: [embed] });
  
  const ticket = await createTicket(user.id, 'Other Issues', 'User requested help with other issues via Discord reaction', 'other');
  
  if (ticket) {
    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Ticket Created Successfully')
      .setDescription(`Your other issues ticket has been created!`)
      .addFields(
        { name: 'Ticket Number', value: `#${ticket.id}`, inline: true },
        { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }
      )
      .setTimestamp();

    await message.edit({ embeds: [successEmbed] });
  }
}

// ===== TICKET SYSTEM =====

// Create a new ticket
async function createTicket(userId, subject, description, ticketType = 'general', matchInfo = null) {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Get or create ticket category
    let ticketCategory = guild.channels.cache.get(TICKET_CATEGORY_ID);
    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({
        name: '🎫 Support Tickets',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
          },
        ],
      });
    }

    // Generate ticket number
    const ticketNumber = ticketCounter.get(guild.id) || 1;
    ticketCounter.set(guild.id, ticketNumber + 1);

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketNumber.toString().padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      topic: `Ticket #${ticketNumber} - ${subject}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    // Add support role if configured
    if (SUPPORT_ROLE_ID) {
      await ticketChannel.permissionOverwrites.create(SUPPORT_ROLE_ID, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }

    // Create ticket embed
    const ticketEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🎫 Ticket #${ticketNumber}`)
      .setDescription(`**Subject:** ${subject}\n\n**Description:** ${description}`)
      .addFields(
        { name: 'Type', value: ticketType, inline: true },
        { name: 'Status', value: '🟡 Open', inline: true },
        { name: 'Created', value: new Date().toLocaleString(), inline: true }
      );

    if (matchInfo) {
      ticketEmbed.addFields(
        { name: 'Match', value: `${matchInfo.team1} vs ${matchInfo.team2}`, inline: true },
        { name: 'Map', value: matchInfo.map || 'TBD', inline: true },
        { name: 'Phase', value: matchInfo.phase || 'Unknown', inline: true }
      );
    }

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket_${ticketNumber}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId(`claim_ticket_${ticketNumber}`)
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👤'),
        new ButtonBuilder()
          .setCustomId(`escalate_ticket_${ticketNumber}`)
          .setLabel('Escalate')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⬆️')
      );

    const ticketMessage = await ticketChannel.send({
      content: matchInfo ? `<@&${SUPPORT_ROLE_ID || 'everyone'}> New ${ticketType} ticket created!` : '',
      embeds: [ticketEmbed],
      components: [actionRow],
    });

    // Store ticket info
    const ticketInfo = {
      id: ticketNumber,
      channelId: ticketChannel.id,
      userId: userId,
      subject: subject,
      description: description,
      type: ticketType,
      status: 'open',
      createdAt: new Date(),
      matchInfo: matchInfo,
      claimedBy: null,
      messageId: ticketMessage.id,
    };

    activeTickets.set(ticketNumber, ticketInfo);

    // Try to add user to ticket if they're in the server
    try {
      const member = await guild.members.fetch(userId);
      if (member) {
        await ticketChannel.permissionOverwrites.create(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        
        await ticketChannel.send({
          content: `Welcome <@${userId}>! You've been added to this ticket. Please provide any additional information needed.`,
          embeds: [
            new EmbedBuilder()
              .setColor('#00ff00')
              .setDescription('You can now see and respond to this ticket. Support staff will assist you shortly.')
          ]
        });
      }
    } catch (error) {
      console.log(`User ${userId} not found in guild, cannot add to ticket`);
    }

    return ticketInfo;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
}

// Create match dispute ticket
async function createMatchDisputeTicket(userId, matchInfo, disputeReason) {
  const subject = `Match Dispute - ${matchInfo.team1} vs ${matchInfo.team2}`;
  const description = `**Dispute Reason:** ${disputeReason}\n\n**Match Details:**\n- Team 1: ${matchInfo.team1}\n- Team 2: ${matchInfo.team2}\n- Map: ${matchInfo.map || 'TBD'}\n- Phase: ${matchInfo.phase || 'Unknown'}\n- User: <@${userId}>`;
  
  const ticketInfo = await createTicket(userId, subject, description, 'dispute', matchInfo);
  
  // Post to admin channel
  if (ADMIN_CHANNEL_ID) {
    try {
      const adminChannel = client.channels.cache.get(ADMIN_CHANNEL_ID);
      if (adminChannel) {
        const disputeEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🚨 Match Dispute Reported')
          .setDescription(`A new match dispute has been reported and a ticket has been created.`)
          .addFields(
            { name: 'Ticket', value: `#${ticketInfo.id}`, inline: true },
            { name: 'Match', value: `${matchInfo.team1} vs ${matchInfo.team2}`, inline: true },
            { name: 'User', value: `<@${userId}>`, inline: true },
            { name: 'Reason', value: disputeReason, inline: false },
            { name: 'Ticket Channel', value: `<#${ticketInfo.channelId}>`, inline: false }
          )
          .setTimestamp();

        await adminChannel.send({ embeds: [disputeEmbed] });
      }
    } catch (error) {
      console.error('Error posting to admin channel:', error);
    }
  }
  
  return ticketInfo;
}

// Close a ticket
async function closeTicket(ticketNumber, closedBy) {
  try {
    const ticketInfo = activeTickets.get(ticketNumber);
    if (!ticketInfo) {
      throw new Error('Ticket not found');
    }

    const channel = client.channels.cache.get(ticketInfo.channelId);
    if (channel) {
      // Update ticket status
      ticketInfo.status = 'closed';
      ticketInfo.closedBy = closedBy;
      ticketInfo.closedAt = new Date();

      // Send closing message
      const closeEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(`🔒 Ticket #${ticketNumber} Closed`)
        .setDescription(`This ticket has been closed by ${closedBy}`)
        .setTimestamp();

      await channel.send({ embeds: [closeEmbed] });

      // Archive channel after delay
      setTimeout(async () => {
        try {
          await channel.delete();
          activeTickets.delete(ticketNumber);
        } catch (error) {
          console.error('Error deleting ticket channel:', error);
        }
      }, 30000); // 30 second delay
    }

    return ticketInfo;
  } catch (error) {
    console.error('Error closing ticket:', error);
    throw error;
  }
}

// ===== NOTIFICATION SYSTEM =====

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

// ===== SLASH COMMAND INTERACTIONS =====

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
    return;
  }
  
  if (!interaction.isButton()) return;

  const { customId } = interaction;
  
  if (customId.startsWith('close_ticket_')) {
    const ticketNumber = parseInt(customId.split('_')[2]);
    await closeTicket(ticketNumber, interaction.user.tag);
    await interaction.reply({ content: `Ticket #${ticketNumber} will be closed in 30 seconds.`, ephemeral: true });
  }
  
  else if (customId.startsWith('claim_ticket_')) {
    const ticketNumber = parseInt(customId.split('_')[2]);
    const ticketInfo = activeTickets.get(ticketNumber);
    
    if (ticketInfo && ticketInfo.status === 'open') {
      ticketInfo.claimedBy = interaction.user.id;
      ticketInfo.status = 'claimed';
      
      const claimEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`👤 Ticket Claimed`)
        .setDescription(`This ticket has been claimed by ${interaction.user.tag}`)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [claimEmbed] });
      await interaction.reply({ content: `You have claimed ticket #${ticketNumber}`, ephemeral: true });
    }
  }
  
  else if (customId.startsWith('escalate_ticket_')) {
    const ticketNumber = parseInt(customId.split('_')[2]);
    const ticketInfo = activeTickets.get(ticketNumber);
    
    if (ticketInfo) {
      ticketInfo.status = 'escalated';
      
      const escalateEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle(`⬆️ Ticket Escalated`)
        .setDescription(`This ticket has been escalated by ${interaction.user.tag}`)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [escalateEmbed] });
      await interaction.reply({ content: `Ticket #${ticketNumber} has been escalated`, ephemeral: true });
      
      // Notify admins
      if (ADMIN_CHANNEL_ID) {
        try {
          const adminChannel = client.channels.cache.get(ADMIN_CHANNEL_ID);
          if (adminChannel) {
            const adminEmbed = new EmbedBuilder()
              .setColor('#ff9900')
              .setTitle('⚠️ Ticket Escalated')
              .setDescription(`Ticket #${ticketNumber} has been escalated and requires attention.`)
              .addFields(
                { name: 'Ticket', value: `#${ticketNumber}`, inline: true },
                { name: 'Escalated by', value: interaction.user.tag, inline: true },
                { name: 'Channel', value: `<#${ticketInfo.channelId}>`, inline: false }
              )
              .setTimestamp();
            
            await adminChannel.send({ embeds: [adminEmbed] });
          }
        } catch (error) {
          console.error('Error notifying admins:', error);
        }
      }
    }
  }
});

// Handle slash commands
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;
  
  try {
    switch (commandName) {
      case 'tickets':
        await handleTicketsCommand(interaction);
        break;
      case 'close':
        await handleCloseCommand(interaction);
        break;
      default:
        await interaction.reply({ content: '❌ Unknown command', ephemeral: true });
    }
  } catch (error) {
    console.error('Error handling slash command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while processing your command', 
      ephemeral: true 
    });
  }
}



// Handle /tickets command
async function handleTicketsCommand(interaction) {
  const userId = interaction.user.id;
  const userTickets = getTicketsByUser(userId);
  
  if (userTickets.length === 0) {
    await interaction.reply({ 
      content: '📭 You have no active tickets.', 
      ephemeral: true 
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🎫 Your Active Tickets')
    .setDescription(`You have ${userTickets.length} active ticket(s):`);
  
  userTickets.forEach(ticket => {
    embed.addFields({
      name: `Ticket #${ticket.id}`,
      value: `**Type:** ${ticket.type}\n**Subject:** ${ticket.subject}\n**Status:** ${ticket.status}\n**Channel:** <#${ticket.channelId}>`,
      inline: false
    });
  });
  
  embed.setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Handle /close command
async function handleCloseCommand(interaction) {
  // Check if this is a ticket channel
  if (!interaction.channel.name.startsWith('ticket-')) {
    await interaction.reply({ 
      content: '❌ This command can only be used in ticket channels.', 
      ephemeral: true 
    });
    return;
  }
  
  // Find the ticket by channel ID
  const channelId = interaction.channel.id;
  const ticket = Array.from(activeTickets.values()).find(t => t.channelId === channelId);
  
  if (!ticket) {
    await interaction.reply({ 
      content: '❌ Could not find ticket information for this channel.', 
      ephemeral: true 
    });
    return;
  }
  
  // Close the ticket
  await closeTicket(ticket.id, interaction.user.tag);
  
  await interaction.reply({ 
    content: `✅ Ticket #${ticket.id} will be closed in 30 seconds.`, 
    ephemeral: true 
  });
}

// ===== BUTTON INTERACTIONS =====

// Get ticket status
function getTicketStatus(ticketNumber) {
  return activeTickets.get(ticketNumber) || null;
}

// Get all active tickets
function getAllActiveTickets() {
  return Array.from(activeTickets.values());
}

// Get tickets by user
function getTicketsByUser(userId) {
  return Array.from(activeTickets.values()).filter(ticket => ticket.userId === userId);
}

// Export functions for use in other parts of the application
module.exports = {
  // Ticket system
  createTicket,
  createMatchDisputeTicket,
  closeTicket,
  getTicketStatus,
  getAllActiveTickets,
  getTicketsByUser,
  
  // Notifications
  sendTournamentNotification,
  sendMatchNotification,
  sendTeamInvitation,
  sendAdminNotification,
  
  // Bot client
  client,
  
  // Utility functions
  isReady: () => client.isReady() && BOT_TOKEN && BOT_TOKEN !== 'your_discord_bot_token_here'
};

// Start the bot only if token is valid
if (BOT_TOKEN && BOT_TOKEN !== 'your_discord_bot_token_here') {
  client.login(BOT_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error.message);
    console.log('Bot will run in API-only mode without Discord connection');
  });
} else {
  console.log('No valid Discord token provided. Bot will run in API-only mode.');
}

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