# Discord Notification Templates - Unity League

This document contains all the Discord notification templates used in Unity League. Each template can be customized by editing the corresponding function in `src/services/discordService.ts`.

## 📋 Template Overview

| Template | Type | Target | Color | Emoji |
|----------|------|--------|-------|-------|
| Ticket Created | Admin Channel | Admins | Orange (#ff6b35) | 🎫 |
| Ticket Answered | DM | User | Green (#00ff00) | ✅ |
| Match Scheduling Request | DM | Players | Blue (#3498db) | 📅 |
| Match Reminder | DM | Players | Gold (#ffd700) | ⏰ |
| Match Completed | DM | Players | Green (#00ff00) | 🏆 |
| Team Invitation | DM | User | Purple (#9b59b6) | 👥 |
| Team Member Joined | DM | Team Members | Green (#00ff00) | 🎉 |
| Tournament Registration | Channel | Public | Orange (#ff6b35) | 🏆 |
| Tournament Started | Channel | Public | Green (#00ff00) | 🚀 |
| Dispute Created | Admin Channel | Admins | Red (#ff0000) | ⚠️ |
| Admin Action | Admin Channel | Admins | Gray (#95a5a6) | 🔧 |
| Custom Message | DM/Channel | Custom | Custom | Custom |

---

## 🎫 **TICKET NOTIFICATIONS**

### 1. **Ticket Created** (`notifyTicketCreated`)
**Target**: Admin Channel + Admin DMs  
**Function**: Lines 71-106

```typescript
const embed: DiscordEmbed = {
  title: '🎫 New Support Ticket',
  description: `**${ticket.subject}**`,
  color: 0xff6b35, // Orange
  fields: [
    {
      name: 'Priority',
      value: ticket.priority || 'Normal',
      inline: true
    },
    {
      name: 'Category',
      value: ticket.category || 'General',
      inline: true
    },
    {
      name: 'User',
      value: ticket.userDisplayName || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: `Ticket #${ticket.id}`,
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change the emoji and text
- `description`: Modify how the subject is displayed
- `color`: Change the embed color (hex value)
- `fields`: Add/remove/modify field information
- `footer`: Customize footer text

---

### 2. **Ticket Answered** (`notifyTicketAnswered`)
**Target**: User DM  
**Function**: Lines 108-132

```typescript
const embed: DiscordEmbed = {
  title: '✅ Ticket Answered',
  description: `Your ticket **"${ticket.subject}"** has been answered by our support team.`,
  color: 0x00ff00, // Green
  fields: [
    {
      name: 'Response',
      value: ticket.lastResponse?.substring(0, 200) + (ticket.lastResponse?.length > 200 ? '...' : ''),
      inline: false
    }
  ],
  footer: {
    text: `Ticket #${ticket.id}`,
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and message
- `description`: Modify the main message
- `fields[0].value`: Change how the response is displayed (currently truncated to 200 chars)
- `footer`: Customize footer text

---

## ⚽ **MATCH NOTIFICATIONS**

### 3. **Match Scheduling Request** (`notifyMatchSchedulingRequest`)
**Target**: Opponent Team DMs  
**Function**: Lines 136-170

```typescript
const embed: DiscordEmbed = {
  title: '📅 Match Scheduling Request',
  description: `**${requestingTeam.name}** has suggested a time for your match!`,
  color: 0x3498db, // Blue
  fields: [
    {
      name: 'Match',
      value: `${requestingTeam.name} vs ${opponentTeam.name}`,
      inline: true
    },
    {
      name: 'Suggested Time',
      value: new Date(match.suggestedTime).toLocaleString(),
      inline: true
    },
    {
      name: 'Tournament',
      value: match.tournamentName || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: 'Please respond to the scheduling request on the platform',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and message
- `description`: Modify the main message
- `fields`: Add/remove match information fields
- `footer`: Change the call-to-action text

---

### 4. **Match Reminder** (`notifyMatchReminder`)
**Target**: All Match Participants DMs  
**Function**: Lines 172-211

```typescript
const embed: DiscordEmbed = {
  title: '⏰ Match Starting Soon!',
  description: `Your match starts in **${minutesBefore} minutes**!`,
  color: 0xffd700, // Gold
  fields: [
    {
      name: 'Teams',
      value: `${match.team1?.name} vs ${match.team2?.name}`,
      inline: true
    },
    {
      name: 'Map',
      value: match.map1 || 'TBD',
      inline: true
    },
    {
      name: 'Tournament',
      value: match.tournamentName || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: 'Good luck! 🍀',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and urgency level
- `description`: Modify the countdown message
- `fields`: Add/remove match details
- `footer`: Change the encouragement message

---

### 5. **Match Completed** (`notifyMatchCompleted`)
**Target**: All Match Participants DMs  
**Function**: Lines 213-255

```typescript
const embed: DiscordEmbed = {
  title: '🏆 Match Completed!',
  description: `**${winner?.name}** defeated **${loser?.name}**`,
  color: 0x00ff00, // Green
  fields: [
    {
      name: 'Score',
      value: `${match.team1Score} - ${match.team2Score}`,
      inline: true
    },
    {
      name: 'Tournament',
      value: match.tournamentName || 'Unknown',
      inline: true
    },
    {
      name: 'Duration',
      value: match.duration || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: 'Great game! 🎮',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and celebration message
- `description`: Modify how winner/loser is displayed
- `fields`: Add/remove match statistics
- `footer`: Change the congratulatory message

---

## 👥 **TEAM NOTIFICATIONS**

### 6. **Team Invitation** (`notifyTeamInvitation`)
**Target**: Invited User DM  
**Function**: Lines 259-293

```typescript
const embed: DiscordEmbed = {
  title: '👥 Team Invitation',
  description: `**${inviter.displayName}** has invited you to join **${team.name}**!`,
  color: 0x9b59b6, // Purple
  fields: [
    {
      name: 'Team',
      value: team.name,
      inline: true
    },
    {
      name: 'Invited by',
      value: inviter.displayName,
      inline: true
    },
    {
      name: 'Team Members',
      value: `${team.members?.length || 0}/5`,
      inline: true
    }
  ],
  footer: {
    text: 'Check your Unity League profile to accept or decline',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and invitation message
- `description`: Modify the invitation text
- `fields`: Add/remove team information
- `footer`: Change the call-to-action text

---

### 7. **Team Member Joined** (`notifyTeamMemberJoined`)
**Target**: All Team Members DMs  
**Function**: Lines 295-331

```typescript
const embed: DiscordEmbed = {
  title: '🎉 New Team Member!',
  description: `**${newMember.displayName}** has joined **${team.name}**!`,
  color: 0x00ff00, // Green
  fields: [
    {
      name: 'Team',
      value: team.name,
      inline: true
    },
    {
      name: 'New Member',
      value: newMember.displayName,
      inline: true
    },
    {
      name: 'Team Size',
      value: `${team.members?.length || 0}/5`,
      inline: true
    }
  ],
  footer: {
    text: 'Welcome to the team! 🚀',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and welcome message
- `description`: Modify the announcement text
- `fields`: Add/remove member information
- `footer`: Change the welcome message

---

## 🏆 **TOURNAMENT NOTIFICATIONS**

### 8. **Tournament Registration** (`notifyTournamentRegistration`)
**Target**: Tournaments Channel  
**Function**: Lines 335-369

```typescript
const embed: DiscordEmbed = {
  title: '🏆 Tournament Registration',
  description: `**${team.name}** has registered for **${tournament.name}**!`,
  color: 0xff6b35, // Orange
  fields: [
    {
      name: 'Tournament',
      value: tournament.name,
      inline: true
    },
    {
      name: 'Team',
      value: team.name,
      inline: true
    },
    {
      name: 'Format',
      value: tournament.format || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: 'Good luck in the tournament! 🍀',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and registration message
- `description`: Modify the announcement text
- `fields`: Add/remove tournament information
- `footer`: Change the encouragement message

---

### 9. **Tournament Started** (`notifyTournamentStarted`)
**Target**: Tournaments Channel  
**Function**: Lines 371-405

```typescript
const embed: DiscordEmbed = {
  title: '🚀 Tournament Started!',
  description: `**${tournament.name}** is now live!`,
  color: 0x00ff00, // Green
  fields: [
    {
      name: 'Tournament',
      value: tournament.name,
      inline: true
    },
    {
      name: 'Format',
      value: tournament.format || 'Unknown',
      inline: true
    },
    {
      name: 'Participants',
      value: `${tournament.registeredTeams?.length || 0} teams`,
      inline: true
    }
  ],
  footer: {
    text: 'May the best team win! 🏆',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and start message
- `description`: Modify the live announcement
- `fields`: Add/remove tournament details
- `footer`: Change the competitive message

---

## ⚠️ **DISPUTE NOTIFICATIONS**

### 10. **Dispute Created** (`notifyDisputeCreated`)
**Target**: Admin Channel + Admin DMs  
**Function**: Lines 409-444

```typescript
const embed: DiscordEmbed = {
  title: '⚠️ Match Dispute Created',
  description: `A dispute has been filed for match **${dispute.matchId}**`,
  color: 0xff0000, // Red
  fields: [
    {
      name: 'Reason',
      value: dispute.reason || 'No reason provided',
      inline: false
    },
    {
      name: 'Filed by',
      value: dispute.filedBy || 'Unknown',
      inline: true
    },
    {
      name: 'Match',
      value: dispute.matchDetails || 'Unknown',
      inline: true
    }
  ],
  footer: {
    text: 'Please review and resolve this dispute',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and urgency level
- `description`: Modify the dispute announcement
- `fields`: Add/remove dispute information
- `footer`: Change the admin action request

---

## 🔧 **ADMIN NOTIFICATIONS**

### 11. **Admin Action** (`notifyAdminAction`)
**Target**: Admin Channel  
**Function**: Lines 448-482

```typescript
const embed: DiscordEmbed = {
  title: '🔧 Admin Action',
  description: `**${admin.displayName}** performed: **${action}**`,
  color: 0x95a5a6, // Gray
  fields: [
    {
      name: 'Action',
      value: action,
      inline: true
    },
    {
      name: 'Admin',
      value: admin.displayName,
      inline: true
    },
    {
      name: 'Target',
      value: target || 'N/A',
      inline: true
    }
  ],
  footer: {
    text: 'Admin action logged',
  },
  timestamp: new Date().toISOString()
};
```

**Customizable Elements**:
- `title`: Change emoji and action message
- `description`: Modify how the action is displayed
- `fields`: Add/remove admin action details
- `footer`: Change the logging message

---

### 12. **Custom Message** (`notifyCustomMessage`)
**Target**: Custom (DM or Channel)  
**Function**: Lines 486-499

```typescript
// This is a flexible template that accepts custom parameters
return sendDiscordNotification({
  type: 'admin',
  channelId, // Optional channel ID
  message,    // Custom message text
  embed,      // Custom embed object
  userIds     // Optional user IDs for DMs
});
```

**Customizable Elements**:
- `message`: Any custom message text
- `embed`: Any custom embed structure
- `channelId`: Target channel (empty for DMs)
- `userIds`: Target users for DMs

---

## 🎨 **CUSTOMIZATION GUIDE**

### **Color Codes**
```typescript
// Common Discord embed colors (hex values)
0xff6b35  // Orange
0x00ff00  // Green  
0x3498db  // Blue
0xffd700  // Gold
0x9b59b6  // Purple
0xff0000  // Red
0x95a5a6  // Gray
0xe74c3c  // Red (alternative)
0x2ecc71  // Green (alternative)
0xf39c12  // Orange (alternative)
```

### **Emoji Options**
```
🎫 🎟️ 📋 📝 📄 📃 📑 📊 📈 📉 📋
✅ ❌ ✔️ ✖️ ⚠️ ⚡ 🔥 💥 🎉 🎊 🎈
📅 📆 🗓️ ⏰ ⏲️ ⏱️ 🕐 🕑 🕒 🕓 🕔
🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎀 🎁
👥 👤 👨‍👩‍👧‍👦 👪 👫 👬 👭 👯‍♀️ 👯‍♂️
🚀 🚁 ✈️ 🛩️ 🛸 🛰️ 🛥️ 🚢 🚂 🚃 🚄
⚠️ ⚡ 🔥 💥 🎯 🎪 🎨 🎭 🎪 🎫 🎬
🔧 🔨 🔩 ⚙️ ⚒️ 🛠️ 🔫 🎯 🎪 🎨 🎭
```

### **Field Types**
```typescript
// Inline fields (side by side)
{
  name: 'Field Name',
  value: 'Field Value',
  inline: true
}

// Full-width fields
{
  name: 'Field Name', 
  value: 'Field Value',
  inline: false
}
```

### **Footer Options**
```typescript
// Simple footer
footer: {
  text: 'Footer text here'
}

// Footer with icon
footer: {
  text: 'Footer text here',
  icon_url: 'https://example.com/icon.png'
}
```

---

## 📝 **EDITING INSTRUCTIONS**

1. **Open** `src/services/discordService.ts`
2. **Find** the function you want to modify (use line numbers above)
3. **Edit** the `embed` object within that function
4. **Save** the file
5. **Build** with `npm run build`
6. **Deploy** with `firebase deploy --only hosting`

### **Example: Changing Ticket Created Template**
```typescript
// Before
title: '🎫 New Support Ticket',

// After  
title: '🚨 URGENT: New Support Ticket',
```

### **Example: Adding Custom Field**
```typescript
fields: [
  {
    name: 'Priority',
    value: ticket.priority || 'Normal',
    inline: true
  },
  // Add new field
  {
    name: 'Response Time',
    value: 'Expected within 24 hours',
    inline: true
  }
]
```

---

## 🔧 **ADVANCED CUSTOMIZATION**

### **Conditional Content**
```typescript
// Different messages based on priority
const priorityEmoji = ticket.priority === 'High' ? '🚨' : '📋';
const priorityColor = ticket.priority === 'High' ? 0xff0000 : 0xff6b35;

title: `${priorityEmoji} ${ticket.priority} Priority Ticket`,
color: priorityColor,
```

### **Dynamic Fields**
```typescript
// Add fields conditionally
const fields = [
  {
    name: 'Priority',
    value: ticket.priority || 'Normal',
    inline: true
  }
];

// Add extra field if ticket has category
if (ticket.category) {
  fields.push({
    name: 'Category',
    value: ticket.category,
    inline: true
  });
}
```

### **Custom Timestamps**
```typescript
// Custom timestamp format
timestamp: new Date().toISOString(), // ISO format
// Or custom format
timestamp: new Date().toLocaleString('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
```

---

## 📋 **QUICK REFERENCE**

| Function | Line | Target | Color | Key Fields |
|----------|------|--------|-------|------------|
| `notifyTicketCreated` | 71-106 | Admin Channel | Orange | Priority, Category, User |
| `notifyTicketAnswered` | 108-132 | User DM | Green | Response |
| `notifyMatchSchedulingRequest` | 136-170 | Player DMs | Blue | Match, Time, Tournament |
| `notifyMatchReminder` | 172-211 | Player DMs | Gold | Teams, Map, Tournament |
| `notifyMatchCompleted` | 213-255 | Player DMs | Green | Score, Tournament, Duration |
| `notifyTeamInvitation` | 259-293 | User DM | Purple | Team, Inviter, Members |
| `notifyTeamMemberJoined` | 295-331 | Team DMs | Green | Team, Member, Size |
| `notifyTournamentRegistration` | 335-369 | Channel | Orange | Tournament, Team, Format |
| `notifyTournamentStarted` | 371-405 | Channel | Green | Tournament, Format, Participants |
| `notifyDisputeCreated` | 409-444 | Admin Channel | Red | Reason, Filed By, Match |
| `notifyAdminAction` | 448-482 | Admin Channel | Gray | Action, Admin, Target |
| `notifyCustomMessage` | 486-499 | Custom | Custom | Fully Customizable |

---

**🎯 Ready to customize your Discord notifications!** 

Edit any template in `src/services/discordService.ts` and redeploy to see your changes live!
