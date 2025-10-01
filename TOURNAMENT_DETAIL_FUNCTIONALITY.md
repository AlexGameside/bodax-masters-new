# TOURNAMENT DETAIL PAGE - COMPLETE FUNCTIONALITY AUDIT

**File:** `src/pages/TournamentDetail.tsx` (2,189 lines)  
**Purpose:** Display and manage all tournament information and actions

---

## 📊 **DATA DISPLAYED**

### Tournament Information:
- ✅ Tournament name
- ✅ Tournament status (planning, registration_open, registration_closed, in_progress, completed)
- ✅ Tournament format (single-elim, double-elim, group-stage, swiss-system)
- ✅ Tournament type (qualifier, final, swiss-round, playoff)
- ✅ Start date & time
- ✅ End date & time
- ✅ Max teams allowed
- ✅ Current team count
- ✅ Registration status
- ✅ Prize pool (if applicable)
- ✅ Tournament description
- ✅ Tournament rules

### Team Information:
- ✅ Registered teams list
- ✅ Team names (clickable → goes to team page)
- ✅ Member count per team
- ✅ Team status badges:
  - Approved (green)
  - Rejected (red)
  - Pending (yellow)
  - Registered (blue)
- ✅ Pending teams (awaiting approval)
- ✅ Approved teams
- ✅ Rejected teams

### Match Information:
- ✅ All tournament matches
- ✅ Match status (scheduled, ready_up, map_banning, playing, completed, etc.)
- ✅ Match scores (team1 vs team2)
- ✅ Match date/time
- ✅ Match round number
- ✅ Winner indication
- ✅ Stream information (if being streamed)
- ✅ Match filters:
  - By round (all, round 1, round 2, etc.)
  - By status (all, completed, live, scheduled)

### Swiss System Specific:
- ✅ Swiss standings table
  - Team name
  - Wins/Losses
  - Match wins/losses
  - Round differential
  - Opponent match win rate (OMW%)
  - Rank/Position
- ✅ Current round number
- ✅ Total rounds
- ✅ Matchday management
- ✅ Playoff qualification status

### User-Specific Information:
- ✅ User's teams that can register
- ✅ User's active matches in this tournament
- ✅ User's match schedule
- ✅ User's registration status
- ✅ Discord link status (required for registration)

---

## 🎯 **USER ACTIONS (Non-Admin)**

### Registration Actions:
1. ✅ **Register Team** - Opens enhanced team registration modal
   - Select team from user's teams
   - Only if registration is open
   - Only if Discord linked + in Discord server
   - Only if team meets requirements

2. ✅ **View Team** - Click team name to go to team page
   - Works for all teams in list

3. ✅ **Withdraw Team** - Remove team from tournament
   - Only before tournament starts
   - Only for teams user owns

### Match Actions:
4. ✅ **View Match Details** - Click match to see full details
5. ✅ **Access Match Page** - Navigate to specific match
6. ✅ **View Stream** - Click to open stream URL (if streamed)

### Navigation Actions:
7. ✅ **View Tabs** - Switch between:
   - Overview
   - Bracket (non-Swiss)
   - Swiss Standings (Swiss)
   - Matches (Swiss)
   - Upcoming Matches (Swiss)
   - Playoff Bracket (Swiss, if active)

8. ✅ **Back to Tournaments** - Return to tournament list

---

## 🔧 **ADMIN ACTIONS**

### Tournament Management:
1. ✅ **Start Tournament** - Begin tournament (various start methods)
   - Start Swiss Stage
   - Start Group Stage
   - Start Single Elimination
   - Start Knockout Stage
   
2. ✅ **Fix Tournament Dates** - Repair date/time issues

3. ✅ **Reopen Registration** - Allow more teams to register

4. ✅ **Regenerate Bracket** - Rebuild tournament bracket

5. ✅ **Complete Round** - Mark current round as complete

6. ✅ **Auto-Complete Matches** - Automatically complete all matches

7. ✅ **Auto-Complete Current Round** - Complete all matches in current round

8. ✅ **Fill Demo Teams** - Add test teams for testing

9. ✅ **Manual Seeding** - Set custom team seeds
   - Opens seeding interface modal

10. ✅ **Bracket Reveal** - Navigate to bracket reveal page

11. ✅ **Debug Bracket State** - Admin debug function

### Team Management:
12. ✅ **Approve Team** - Approve pending team
13. ✅ **Reject Team** - Reject pending team
14. ✅ **Revert Team Registration** - Undo team signup
15. ✅ **Revert Team Approval** - Undo approval
16. ✅ **Revert Team Rejection** - Undo rejection

### Match Management:
17. ✅ **Revert Match Result** - Undo match completion
18. ✅ **Revert Team Advancement** - Undo team progression
19. ✅ **Revert Round** - Undo entire round

---

## 📑 **VIEW MODES / TABS**

### 1. **Overview Tab** (Default)
**Shows:**
- Registered teams grid (3 columns)
  - Team name (clickable)
  - Member count
  - Status badge
  - Admin revert buttons
- Pending teams section (Admin only)
  - Approve/Reject buttons
- Approved teams section
- Rejected teams section (Admin only)

**Actions Available:**
- View team details
- Admin: Approve/Reject/Revert

---

### 2. **Bracket Tab** (Non-Swiss Tournaments)
**Shows:**
- `<TournamentBracket />` component
  - Single/Double elimination bracket
  - Match connections
  - Scores
  - Winner progression

**Actions Available:**
- View match details
- Admin: Match management

---

### 3. **Swiss Standings Tab** (Swiss System)
**Shows:**
- `<SwissStandings />` component
  - Sortable standings table
  - Team rankings
  - Win/Loss records
  - Tiebreaker stats (OMW%)
  - Playoff qualification indicators

**Actions Available:**
- Sort by different columns
- View team details

---

### 4. **Matches Tab** (Swiss System)
**Shows:**
- `<SwissRoundManagement />` component
- Filter controls:
  - Round selector (All, Round 1, Round 2, etc.)
  - Status filter (All, Completed, Live, Scheduled)
- Match cards showing:
  - Team names
  - Scores
  - Status badge
  - Date/Time
  - Round number
  - Stream link (if applicable)

**Actions Available:**
- Filter by round
- Filter by status
- Click stream to watch
- Admin: Match management

---

### 5. **Upcoming Matches Tab** (Swiss System)
**Shows:**
- `<AdminMatchdayCalendar />` component (Admin)
- `<UpcomingMatches />` component (Users)
- Match scheduling interface
- Matchday management

**Actions Available:**
- View match schedule
- Admin: Schedule management
- Team: Schedule proposals

---

### 6. **Playoff Bracket Tab** (Swiss System with Playoffs)
**Shows:**
- `<PlayoffBracket />` component
- Playoff bracket structure
- Qualified teams
- Playoff matches

**Actions Available:**
- View playoff matches
- Track playoff progression

---

## 🎨 **VISUAL ELEMENTS**

### Header Section:
- ✅ Back button (← BACK TO TOURNAMENTS)
- ✅ Tournament title (large, prominent)
- ✅ Status badge (color-coded)
- ✅ Format badge
- ✅ Date range display
- ✅ Team count (X/Y teams)

### Registration Section (User with teams):
- ✅ Team selector dropdown
- ✅ "REGISTER TEAM" button
  - Disabled if registration closed
  - Disabled if Discord not linked
  - Shows requirements
- ✅ Discord requirements banner (if not met)
- ✅ Withdraw button (if already registered)

### Admin Action Bar:
- ✅ Multiple action buttons
- ✅ Context-sensitive (show based on tournament state)
- ✅ Warning/confirmation for destructive actions
- ✅ Loading states

### Tab Navigation:
- ✅ Horizontal tab bar
- ✅ Active tab highlight (pink underline)
- ✅ Hover effects
- ✅ Scrollable on mobile

### Match Cards:
- ✅ Team names (bold, white)
- ✅ Scores (large)
- ✅ Status badges (colored)
- ✅ Date/time
- ✅ Round indicator
- ✅ Stream button (if streaming)
- ✅ Hover effects

### Team Cards:
- ✅ Team name (clickable, pink hover)
- ✅ Member count
- ✅ Status badges
- ✅ Admin action buttons
- ✅ Hover border effect

---

## 🔄 **MODALS / POPUPS**

### 1. Enhanced Team Registration Modal
**Trigger:** Click "REGISTER TEAM" button  
**Shows:**
- Team selection
- Discord verification
- Requirements checklist
- Confirmation

### 2. Manual Seeding Modal
**Trigger:** Admin clicks "Manual Seeding" button  
**Shows:**
- `<ManualSeedingInterface />` component
- Drag-and-drop seed ordering
- Save/Cancel buttons

### 3. Revert Confirmation Modal
**Trigger:** Admin clicks any revert action  
**Shows:**
- Action description
- Team/Match details
- Confirm/Cancel buttons
- Warning text

### 4. Bracket Revert Confirmation Modal
**Trigger:** Admin reverts bracket actions  
**Shows:**
- Revert type (match/advancement/round)
- Description of what will happen
- Confirm/Cancel buttons

---

## 🎛️ **STATE MANAGEMENT**

### Tournament States:
```typescript
'planning' | 'registration_open' | 'registration_closed' | 
'in_progress' | 'completed'
```

### Match States:
```typescript
'pending_scheduling' | 'scheduled' | 'ready_up' | 'map_banning' | 
'side_selection_map1' | 'side_selection_map2' | 'side_selection_decider' |
'playing' | 'waiting_results' | 'disputed' | 'completed' | 'forfeited'
```

### View States:
```typescript
'overview' | 'bracket' | 'group-stage' | 'schedule' | 
'standings' | 'swiss-standings' | 'matches' | 
'matchday-management' | 'playoff-bracket'
```

---

## 📱 **RESPONSIVE BEHAVIOR**

- ✅ Tab navigation scrolls horizontally on mobile
- ✅ Team cards: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- ✅ Match cards: Stacked on mobile
- ✅ Admin action buttons: Stack on mobile
- ✅ Filters: Stack vertically on mobile

---

## 🔗 **NAVIGATION / ROUTING**

### Internal Navigation:
- `/tournaments` - Back to tournament list
- `/teams/:teamId` - Click team name
- `/match/:matchId` - Click match (if implemented)
- `/admin/bracket-reveal/:tournamentId` - Admin bracket reveal

### External Navigation:
- Stream URLs - Open in new tab

---

## 🔔 **REAL-TIME FEATURES**

### Real-time Updates:
- ✅ Tournament data (via `useRealtimeTournament` hook)
- ✅ User matches (via `useRealtimeUserMatches` hook)
- ✅ User teams (via `onUserTeamsChange` listener)

### Automatic Refreshes:
- Tournament status changes
- Match updates
- Team registrations
- Admin actions

---

## ⚠️ **CONDITIONAL RENDERING**

### Show/Hide Based On:

**User Role:**
- Admin actions (only if `isAdmin`)
- Regular user actions (only if not admin)

**Tournament Status:**
- Registration buttons (only if `registration_open`)
- Start buttons (only if `planning` or `registration_closed`)
- Withdraw button (only before tournament starts)

**Tournament Format:**
- Swiss tabs (only if `swiss-system`)
- Regular bracket (only if not Swiss)
- Playoff bracket (only if playoffs active)

**Discord Status:**
- Discord warning banner (if not linked/not in server)
- Register button disabled (if Discord requirements not met)

**User Teams:**
- Registration section (only if user has teams)
- Team selector (only if user has eligible teams)

**Match Filters:**
- Round filter (shows actual rounds in tournament)
- Status filter (always available)

---

## 🎯 **KEY FUNCTIONALITY TO PRESERVE**

### MUST KEEP:
1. ✅ All data fetching logic
2. ✅ All admin functions (21 handler functions)
3. ✅ All user actions (registration, withdraw, view)
4. ✅ All tab switching logic
5. ✅ All modal triggers
6. ✅ All filters (round, status)
7. ✅ All real-time listeners
8. ✅ All navigation handlers
9. ✅ All conditional rendering logic
10. ✅ All state management
11. ✅ All form submissions
12. ✅ All confirmation dialogs
13. ✅ All error handling
14. ✅ All success toasts
15. ✅ All Discord requirement checks

### COMPONENTS USED:
```typescript
<TournamentBracket />         // Single/Double elim bracket
<GroupStageBracket />         // Group stage bracket
<TournamentSchedule />        // Schedule view
<TournamentLeaderboard />     // Standings
<EnhancedTeamRegistration />  // Registration modal
<SwissStandings />            // Swiss standings table
<SwissRoundManagement />      // Swiss round management
<AdminMatchdayCalendar />     // Admin matchday view
<UpcomingMatches />           // Upcoming matches component
<PlayoffBracket />            // Playoff bracket
<MatchSchedulingInterface />  // Match scheduling
<UserMatches />               // User's matches
<ManualSeedingInterface />    // Seeding modal
```

---

## 🎨 **REDESIGN APPROACH**

### What We CAN Change:
- ✅ Layout structure (grid, flexbox, columns)
- ✅ Card designs
- ✅ Button styles
- ✅ Color schemes (keeping brand colors)
- ✅ Spacing (margins, padding)
- ✅ Typography (sizes, weights)
- ✅ Icons
- ✅ Animations/transitions
- ✅ Tab navigation style
- ✅ Filter UI design
- ✅ Modal styling
- ✅ Badge designs

### What We CANNOT Change:
- ❌ Data fetching
- ❌ Event handlers
- ❌ State management
- ❌ Conditional logic
- ❌ Function definitions
- ❌ useEffect hooks
- ❌ Component props
- ❌ Navigation logic
- ❌ Form submission logic
- ❌ Real-time listeners

---

## 📋 **REDESIGN CHECKLIST**

When redesigning, ensure:
- [ ] All 21 admin functions still work
- [ ] All user actions still work
- [ ] All tabs still accessible
- [ ] All filters still work
- [ ] All modals still open/close
- [ ] All navigation still works
- [ ] All real-time updates still work
- [ ] All conditional rendering preserved
- [ ] All child components still render
- [ ] All Discord checks still work
- [ ] All registration flow works
- [ ] All withdrawal flow works
- [ ] All revert actions work
- [ ] Mobile responsiveness maintained
- [ ] Loading states preserved
- [ ] Error states preserved

---

## 🎯 **PRIORITY IMPROVEMENTS**

### High Priority:
1. **Better Tab Organization** - Current flat tabs are cluttered
2. **Cleaner Team Cards** - Current design is busy
3. **Better Action Buttons** - Too many, not organized
4. **Match Card Redesign** - Hard to scan quickly
5. **Filter UI** - Current filters are basic

### Medium Priority:
6. **Header Redesign** - Make more prominent
7. **Status Badges** - More consistent styling
8. **Spacing** - Better visual hierarchy
9. **Admin Section** - Separate from user view
10. **Swiss Standings** - Table design improvement

### Low Priority:
11. **Animations** - Smooth transitions
12. **Icons** - Better icon usage
13. **Color Scheme** - More consistent
14. **Typography** - Better hierarchy

---

**END OF FUNCTIONALITY AUDIT**

**Next Step:** Create new UI components while preserving ALL this functionality.


