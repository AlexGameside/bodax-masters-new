# Playoff Bracket System Guide

## Overview

The playoff bracket system allows admins to create a top 8 playoff bracket from Swiss tournament standings with manual seeding, admin-controlled match scheduling, and manual team advancement.

## Features

### 1. Manual Seeding for Top 8 Teams
- After Swiss rounds are complete, admins can manually seed the top 8 teams
- Teams are initially ordered by Swiss standings
- Admins can reorder teams using up/down arrows
- Preview shows the Quarter Final matchups before generation

### 2. Direct to Scheduled State
- Playoff matches skip the scheduling phase entirely
- Quarter Final matches are created in "scheduled" state
- Semi Finals and Grand Final are created in "not_ready" state (waiting for teams)
- No team negotiation needed - admins set all match times

### 3. Admin Match Time Setting
- Admins can set exact date/time for each playoff match
- Times are set via datetime picker
- Matches remain in "scheduled" state with admin-set times

### 4. Manual Team Advancement
- Admins can manually advance winning teams
- Advancing a team automatically:
  - Marks the match as complete
  - Populates the winner into the next round match
  - Changes next round match to "scheduled" state when both teams are set

## How to Use

### Step 1: Complete Swiss Rounds
1. Navigate to the tournament detail page
2. Complete all Swiss rounds normally
3. Go to "SWISS STANDINGS" tab

### Step 2: Seed Teams for Playoffs
1. Once Swiss rounds are complete, the "GENERATE PLAYOFF BRACKET" section appears (admins only)
2. Review the top 8 teams from Swiss standings
3. Use the up/down arrows to reorder teams as desired
4. Review the Quarter Final preview showing matchups:
   - **QF1**: Seed #1 vs Seed #8
   - **QF2**: Seed #4 vs Seed #5
   - **QF3**: Seed #2 vs Seed #7
   - **QF4**: Seed #3 vs Seed #6
5. Click "Generate Playoff Bracket" button

### Step 3: View Playoff Bracket
1. After generation, the "PLAYOFF BRACKET" tab will appear
2. Click the tab to view the bracket
3. The bracket shows:
   - Quarter Finals (4 matches, BO3)
   - Semi Finals (2 matches, BO3)
   - Grand Final (1 match, BO3)

### Step 4: Manage Matches (Admins)
1. Scroll to the "ADMIN BRACKET MANAGEMENT" section
2. For each match, you can:
   
   **Option A: Set Match Time**
   - Click "Manage Match" button
   - Select date and time using the datetime picker
   - Click "Set Time" to schedule the match
   
   **Option B: Manually Advance Winner**
   - Click "Manage Match" button
   - Select the winning team from dropdown
   - Click "Advance Winner" to complete the match and advance the team

### Step 5: Progress Through Rounds
1. As Quarter Final matches complete, teams automatically populate Semi Finals
2. Semi Final matches become "scheduled" state when both teams are set
3. Set times for Semi Final matches
4. Advance winners to Grand Final
5. Set time for Grand Final
6. Advance final winner to complete the tournament

## Match States

- **Not Ready**: Waiting for previous round to complete (no teams assigned yet)
- **Scheduled**: Both teams assigned, waiting for match time or match to start
- **Completed**: Match finished, winner advanced to next round

## Bracket Structure

```
Quarter Finals (Round 1)
├── QF1: Seed #1 vs Seed #8  →┐
├── QF2: Seed #4 vs Seed #5  →┼─→ Semi Final 1 →┐
├── QF3: Seed #2 vs Seed #7  →┤                  │
└── QF4: Seed #3 vs Seed #6  →┴─→ Semi Final 2 →┴─→ Grand Final
```

## API Functions

### Generate Playoff Bracket with Manual Seeding
```typescript
SwissTournamentService.generatePlayoffBracketWithManualSeeding(
  tournamentId: string,
  seededTeamIds: string[] // Array of 8 team IDs in seed order
)
```

### Set Match Time
```typescript
SwissTournamentService.setPlayoffMatchTime(
  matchId: string,
  scheduledTime: Date
)
```

### Manually Advance Team
```typescript
SwissTournamentService.manuallyAdvanceTeamInPlayoffs(
  matchId: string,
  winnerTeamId: string
)
```

## Important Notes

1. **Exactly 8 Teams Required**: The playoff bracket requires exactly 8 teams from Swiss standings
2. **No Scheduling Negotiation**: Unlike Swiss matches, playoff matches don't use team scheduling proposals
3. **Admin Control**: Only admins can set match times and advance teams
4. **Automatic Advancement**: Teams advance automatically when you select a winner
5. **BO3 Format**: All playoff matches use Best-of-3 format
6. **One-Way Process**: Once generated, the playoff bracket cannot be easily reverted (similar to Swiss rounds)

## Troubleshooting

**Q: I don't see the "Generate Playoff Bracket" section**
- A: Make sure all Swiss rounds are complete and you're logged in as an admin

**Q: The playoff bracket tab doesn't appear**
- A: Generate the playoff bracket first from the Swiss Standings tab

**Q: I can't set a match time**
- A: Make sure both teams are assigned to the match (previous round must be complete)

**Q: Team didn't advance after I selected winner**
- A: Check the next round match - the team should be populated. If both teams are set, the match state will change to "scheduled"

## Example Workflow

1. ✅ Complete all 5 Swiss rounds
2. ✅ Go to Swiss Standings tab
3. ✅ Review top 8 teams
4. ✅ Adjust seeding order if needed
5. ✅ Generate playoff bracket
6. ✅ Go to Playoff Bracket tab
7. ✅ Set times for all 4 Quarter Finals
8. ✅ Advance winners from Quarter Finals
9. ✅ Set times for 2 Semi Finals (once teams are populated)
10. ✅ Advance winners from Semi Finals
11. ✅ Set time for Grand Final (once teams are populated)
12. ✅ Advance final winner to complete tournament

## Components

- **PlayoffManualSeeding**: Interface for seeding top 8 teams and generating bracket
- **PlayoffBracketManagement**: Admin interface for managing match times and advancements
- **PlayoffBracket**: Visual display of the bracket structure
- **SwissTournamentService**: Backend service handling bracket generation and match management








