# Swiss System Tournament Guide

## Overview

The Swiss system is a tournament format that ensures teams play against opponents of similar skill levels while maintaining competitive balance throughout the tournament. This system is ideal for tournaments with many teams (like your 20-team, 5-matchday setup) as it provides fair matchups and exciting competition.

## How It Works

### Tournament Structure
- **20 teams** compete in **5 rounds** (matchdays)
- Each round is a **matchday** with a 7-day scheduling window
- Teams are **automatically paired** based on current standings
- **Top 8 teams** advance to playoffs after Swiss rounds
- **No rematches** in subsequent rounds

### Scoring System
- **3 points** for a match win
- **0 points** for a match loss
- **Tiebreakers** (in order):
  1. Total Points
  2. Match Wins
  3. Game Wins (individual map wins)
  4. Rounds Differential (rounds won - rounds lost)
  5. Buchholz Score (sum of opponents' points)

## Matchday System

### What Happens Each Matchday

1. **Scheduling Phase** (Days 1-7)
   - Teams receive their pairings automatically
   - Teams can send scheduling proposals to opponents
   - **No duplicate times**: Teams can't propose the same time twice
   - **59-minute rule**: New proposals must be at least 59 minutes apart from previous ones
   - Teams negotiate match times through the platform
   - **Teams can play immediately after scheduling if they want to**
   - **No auto-scheduling** - teams must schedule themselves

2. **Match Execution** (Any time within 7-day window)
   - Teams can play as soon as they're both ready
   - No waiting period required
   - Map banning phase
   - Side selection
   - Match play
   - Result submission

3. **Forfeit Processing** (End of matchday)
   - If teams haven't played by day 7, match is forfeited
   - **Forfeit = 1-1 draw with no rounds given**
   - Both teams get 1 point each
   - Match marked as complete

### Automatic Pairing Algorithm

The system automatically pairs teams for each round using these principles:

1. **Performance-Based Pairing**
   - Teams with similar points are paired together
   - Prevents top teams from crushing weaker teams early
   - Ensures competitive matches throughout

2. **Rematch Prevention**
   - Teams never play the same opponent twice
   - System tracks all previous opponents
   - Ensures variety in matchups

3. **Fair Distribution**
   - Handles odd numbers of teams with "bye" rounds
   - Balances home/away assignments
   - Considers scheduling constraints

## Tournament Progression

### Round 1
- **Random pairings** (or based on seeding if available)
- All teams start with 0 points
- Creates initial performance baseline

### Rounds 2-5
- **Automatic pairings** based on current standings
- Teams with similar records face each other
- Top performers gradually separate from the pack
- Bottom teams get chances to improve their records

### Playoff Qualification
- **Top 8 teams** advance after 5 rounds
- Based on final Swiss standings
- Tiebreakers determine final positions
- Playoff bracket is seeded by Swiss performance

## Scheduling Restrictions

### Anti-Spam Rules

To prevent scheduling spam and ensure meaningful negotiations:

- **No Duplicate Times**: Teams cannot propose the same time twice
- **59-Minute Rule**: New proposals must be at least 59 minutes apart from previous ones
- **Applies to Both**: Initial proposals and alternative proposals follow the same rules
- **Per-Team Tracking**: Each team's proposal history is tracked separately

### How It Works

1. **First Proposal**: Team A proposes 20:30 → Allowed ✅
2. **Same Time Again**: Team A proposes 20:30 again → Blocked ❌ "Already proposed this time"
3. **Too Close**: Team A proposes 20:45 → Blocked ❌ "Must wait 59 minutes" (only 15 min difference)
4. **Valid Next**: Team A proposes 21:30 → Allowed ✅ (60 min difference)

### Benefits of These Restrictions

1. **Prevents Spam**: Teams can't flood opponents with similar times
2. **Forces Variety**: Teams must think of genuinely different time slots
3. **Efficient Negotiation**: Focuses discussion on meaningful alternatives
4. **Respectful Communication**: Prevents overwhelming opponents with proposals

## Management Features

### Admin Controls

1. **Matchday Management**
   - View current matchday status
   - Monitor completion progress
   - Advance to next round when ready
   - Process forfeits automatically

2. **Tournament Oversight**
   - Track all match results
   - View standings in real-time
   - Handle disputes and forfeits
   - Manage scheduling issues

3. **Automatic Features**
   - Next round generation
   - Standings updates
   - Matchday completion tracking
   - Forfeit processing

### Team Experience

1. **Scheduling Interface**
   - Receive pairing notifications
   - Send time proposals
   - Negotiate with opponents
   - Confirm match times

2. **Match Preparation**
   - Submit team rosters
   - Ready-up for matches
   - View opponent information
   - Access match details

3. **Results & Standings**
   - View current standings
   - Track personal performance
   - See upcoming opponents
   - Monitor playoff chances

## Key Benefits

### For Tournament Organizers
- **Automated management** reduces administrative overhead
- **Fair competition** ensures engaging matches
- **Flexible scheduling** accommodates team availability
- **Clear progression** through structured rounds

### For Teams
- **Fair matchups** against similarly skilled opponents
- **Multiple chances** to improve standings
- **Transparent scoring** with clear tiebreakers
- **Flexible scheduling** within matchday windows

### For Spectators
- **Competitive matches** throughout the tournament
- **Clear standings** with detailed statistics
- **Exciting progression** as teams advance
- **Playoff qualification** drama in final rounds

## Technical Implementation

### Database Structure
- **Matchdays collection** tracks each round
- **Matches collection** stores individual match data
- **Tournament document** maintains Swiss stage state
- **Standings array** updated after each match

### Automatic Processes
- **Standings calculation** after match completion
- **Next round generation** when matchday completes
- **Forfeit processing** for no-show teams
- **Scheduling transitions** based on time windows

### Real-time Updates
- **Live standings** as matches complete
- **Matchday progress** tracking
- **Scheduling status** updates
- **Tournament progression** notifications

## Best Practices

### For Admins
1. **Monitor matchday completion** regularly
2. **Let teams schedule themselves** - no auto-scheduling needed
3. **Advance rounds promptly** when matchdays complete
4. **Review standings** for any anomalies
5. **Communicate deadlines** clearly to teams

### For Teams
1. **Respond to scheduling proposals** quickly
2. **Submit rosters** well before match time
3. **Be ready** 15 minutes before scheduled start
4. **Report results** promptly after matches
5. **Check standings** regularly to track progress

### For Tournament Success
1. **Clear communication** of rules and deadlines
2. **Consistent enforcement** of forfeit policies
3. **Regular updates** on tournament progress
4. **Fair handling** of disputes and issues
5. **Celebration** of successful completion

## Example Tournament Flow

### Week 1: Matchday 1
- 20 teams randomly paired
- 10 matches scheduled and played
- Initial standings established

### Week 2: Matchday 2
- Teams paired by similar records
- 10 new matches scheduled
- Standings updated with new results

### Week 3: Matchday 3
- Continued performance-based pairing
- Teams begin to separate in standings
- Playoff picture starts to form

### Week 4: Matchday 4
- Critical matches for playoff spots
- Top teams face each other
- Bottom teams fight to improve

### Week 5: Matchday 5
- Final Swiss round
- Playoff qualification determined
- Final standings established

### Week 6+: Playoffs
- Top 8 teams advance
- Single or double elimination bracket
- Tournament champion crowned

## Troubleshooting

### Common Issues

1. **Teams can't agree on time**
   - Teams must resolve scheduling themselves
   - Set clear deadlines (7-day matchday window)
   - Consider timezone differences
   - If no agreement, match forfeits with 1-1 draw

2. **Teams not ready-up**
   - Send reminders
   - Enforce forfeit policies
   - Provide clear instructions

3. **Standings discrepancies**
   - Verify match results
   - Check tiebreaker calculations
   - Review match completion status

4. **Scheduling conflicts**
   - Extend matchday windows if needed
   - Use flexible scheduling options
   - Communicate with affected teams

### Support Resources
- **Tournament rules** document
- **Admin panel** for management
- **Team communication** tools
- **Help documentation** and guides

This Swiss system provides a robust, fair, and engaging tournament experience that scales well with larger numbers of teams while maintaining competitive integrity throughout the competition.
