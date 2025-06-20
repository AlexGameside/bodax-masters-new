import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament, Team, Match, TournamentStage, GroupStanding, TournamentStageManagement } from '../types/tournament';

// Generate groups for group stage tournaments
export const generateGroups = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    if (tournament.status !== 'registration-closed') {
      throw new Error('Tournament must be closed for registration to generate groups');
    }
    
    if (!tournament.format?.groupStage) {
      throw new Error('Tournament does not have group stage configuration');
    }
    
    const { groupCount, teamsPerGroup } = tournament.format.groupStage;
    const registeredTeams = tournament.teams || [];
    
    if (registeredTeams.length !== groupCount * teamsPerGroup) {
      throw new Error(`Expected ${groupCount * teamsPerGroup} teams, got ${registeredTeams.length}`);
    }
    
    // Shuffle teams randomly
    const shuffledTeams = [...registeredTeams].sort(() => Math.random() - 0.5);
    
    // Create groups
    const groups = [];
    for (let i = 0; i < groupCount; i++) {
      const groupTeams = shuffledTeams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
      const groupStandings: GroupStanding[] = groupTeams.map(teamId => ({
        teamId,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      }));
      
      groups.push({
        id: `group-${i + 1}`,
        name: `Group ${String.fromCharCode(65 + i)}`,
        teams: groupTeams,
        standings: groupStandings,
        completedMatches: 0,
        totalMatches: (teamsPerGroup * (teamsPerGroup - 1)) / 2 // Round robin formula
      });
    }
    
    // Update tournament with groups
    const stageManagement: TournamentStageManagement = {
      currentStage: 'group-stage',
      groupStage: {
        isActive: true,
        currentMatchDay: 1,
        totalMatchDays: Math.ceil(teamsPerGroup / 2), // Approximate match days needed
        groups,
        completedGroups: []
      }
    };
    
    await updateDoc(tournamentRef, {
      status: 'group-stage',
      stageManagement,
      updatedAt: new Date()
    });
    
    // Don't automatically generate first match day - let admin do it manually
    
  } catch (error) {
    throw error;
  }
};

// Generate matches for a specific match day
export const generateMatchDay = async (tournamentId: string, matchDay: number): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const groupStage = tournament.stageManagement?.groupStage;
    
    if (!groupStage || !groupStage.isActive) {
      throw new Error('Group stage is not active');
    }
    
    const matches: Partial<Match>[] = [];
    let matchNumber = 1;
    
    // Generate matches for each group
    for (const group of groupStage.groups) {
      const groupMatches = generateGroupMatches(group.teams, matchDay);
      
      for (const groupMatch of groupMatches) {
        matches.push({
          team1Id: groupMatch.team1Id,
          team2Id: groupMatch.team2Id,
          team1Score: 0,
          team2Score: 0,
          isComplete: false,
          round: matchDay,
          matchNumber: matchNumber++,
          tournamentId,
          tournamentType: 'group-stage',
          matchState: 'scheduled',
          mapPool: tournament.format?.mapPool || ['Ascent', 'Icebox', 'Sunset', 'Haven', 'Lotus', 'Pearl', 'Split'],
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
          createdAt: new Date()
        });
      }
    }
    
    // Add matches to database
    for (const match of matches) {
      await addDoc(collection(db, 'matches'), match);
    }
    
    // Update tournament with current match day
    await updateDoc(tournamentRef, {
      'stageManagement.groupStage.currentMatchDay': matchDay,
      updatedAt: new Date()
    });
    
  } catch (error) {
    throw error;
  }
};

// Generate matches for a group based on match day (round robin)
const generateGroupMatches = (teams: string[], matchDay: number): Array<{team1Id: string, team2Id: string}> => {
  const matches: Array<{team1Id: string, team2Id: string}> = [];
  const n = teams.length;
  
  // Simple round robin algorithm
  for (let i = 0; i < n / 2; i++) {
    const team1Index = i;
    const team2Index = n - 1 - i;
    
    if (team1Index < team2Index) {
      matches.push({
        team1Id: teams[team1Index],
        team2Id: teams[team2Index]
      });
    }
  }
  
  // Rotate teams for next match day (simplified)
  // In a real implementation, you'd use a proper round robin rotation
  return matches;
};

// Check if group stage is complete and advance to knockout stage
export const checkGroupStageCompletion = async (tournamentId: string): Promise<boolean> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const groupStage = tournament.stageManagement?.groupStage;
    
    if (!groupStage || !groupStage.isActive) {
      return false;
    }
    
    // Check if all groups are complete
    const allGroupsComplete = groupStage.groups.every(group => 
      group.completedMatches === group.totalMatches
    );
    
    if (allGroupsComplete) {
      // Update tournament status
      await updateDoc(tournamentRef, {
        status: 'group-stage-completed',
        'stageManagement.groupStage.isActive': false,
        'stageManagement.currentStage': 'group-stage',
        updatedAt: new Date()
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    throw error;
  }
};

// Start knockout stage (manually triggered by admin)
export const startKnockoutStage = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    
    if (tournament.status !== 'group-stage-completed') {
      throw new Error('Group stage must be completed to start knockout stage');
    }
    
    // Get teams advancing from groups
    const advancingTeams = getAdvancingTeams(tournament);
    
    // Generate knockout bracket
    const knockoutMatches = generateKnockoutBracket(advancingTeams, tournament);
    
    // Add knockout matches to database
    for (const match of knockoutMatches) {
      await addDoc(collection(db, 'matches'), match);
    }
    
    // Update tournament status
    const updatedStageManagement: TournamentStageManagement = {
      ...tournament.stageManagement,
      currentStage: 'knockout-stage',
      knockoutStage: {
        isActive: true,
        currentRound: 1,
        totalRounds: Math.ceil(Math.log2(advancingTeams.length)),
        bracketType: tournament.format?.knockoutStage?.type || 'single-elimination',
        teamsAdvancing: advancingTeams
      }
    };
    
    await updateDoc(tournamentRef, {
      status: 'knockout-stage',
      stageManagement: updatedStageManagement,
      updatedAt: new Date()
    });
    
  } catch (error) {
    throw error;
  }
};

// Get teams advancing from groups
const getAdvancingTeams = (tournament: Tournament): string[] => {
  const groupStage = tournament.stageManagement?.groupStage;
  if (!groupStage) return [];
  
  const teamsAdvancePerGroup = tournament.format?.groupStage?.teamsAdvancePerGroup || 2;
  const advancingTeams: string[] = [];
  
  for (const group of groupStage.groups) {
    // Sort standings by points, goal difference, etc.
    const sortedStandings = group.standings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return 0;
    });
    
    // Take top teams from each group
    for (let i = 0; i < teamsAdvancePerGroup && i < sortedStandings.length; i++) {
      advancingTeams.push(sortedStandings[i].teamId);
    }
  }
  
  return advancingTeams;
};

// Generate knockout bracket matches
const generateKnockoutBracket = (teams: string[], tournament: Tournament): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];
  const n = teams.length;
  let matchNumber = 1;
  
  // Simple single elimination bracket
  for (let i = 0; i < n; i += 2) {
    if (i + 1 < n) {
      matches.push({
        team1Id: teams[i],
        team2Id: teams[i + 1],
        team1Score: 0,
        team2Score: 0,
        isComplete: false,
        round: 1,
        matchNumber: matchNumber++,
        tournamentId: tournament.id,
        tournamentType: 'knockout-stage',
        bracketType: 'winners',
        matchState: 'ready_up',
        mapPool: tournament.format?.mapPool || ['Ascent', 'Icebox', 'Sunset', 'Haven', 'Lotus', 'Pearl', 'Split'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      });
    }
  }
  
  return matches;
};

// Update standings when a match is completed
export const updateGroupStandings = async (tournamentId: string, match: Match): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const groupStage = tournament.stageManagement?.groupStage;
    
    if (!groupStage || !groupStage.isActive) {
      return; // Not in group stage
    }
    
    // Find which group this match belongs to
    const group = groupStage.groups.find(g => 
      g.teams.includes(match.team1Id!) && g.teams.includes(match.team2Id!)
    );
    
    if (!group) {
      return; // Match not in any group
    }
    
    // Update standings
    const team1Standing = group.standings.find(s => s.teamId === match.team1Id);
    const team2Standing = group.standings.find(s => s.teamId === match.team2Id);
    
    if (team1Standing && team2Standing) {
      team1Standing.played++;
      team2Standing.played++;
      
      team1Standing.goalsFor += match.team1Score;
      team1Standing.goalsAgainst += match.team2Score;
      team2Standing.goalsFor += match.team2Score;
      team2Standing.goalsAgainst += match.team1Score;
      
      if (match.team1Score > match.team2Score) {
        team1Standing.won++;
        team1Standing.points += 3;
        team2Standing.lost++;
      } else if (match.team2Score > match.team1Score) {
        team2Standing.won++;
        team2Standing.points += 3;
        team1Standing.lost++;
      } else {
        team1Standing.drawn++;
        team1Standing.points += 1;
        team2Standing.drawn++;
        team2Standing.points += 1;
      }
      
      team1Standing.goalDifference = team1Standing.goalsFor - team1Standing.goalsAgainst;
      team2Standing.goalDifference = team2Standing.goalsFor - team2Standing.goalsAgainst;
    }
    
    // Update group completed matches
    group.completedMatches++;
    
    // Update tournament
    await updateDoc(tournamentRef, {
      stageManagement: tournament.stageManagement,
      updatedAt: new Date()
    });
    
  } catch (error) {
    throw error;
  }
};

// Advance winner to next round in knockout stage
export const advanceWinnerToNextRound = async (tournamentId: string, match: Match): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const knockoutStage = tournament.stageManagement?.knockoutStage;
    
    if (!knockoutStage || !knockoutStage.isActive) {
      return; // Not in knockout stage
    }
    
    // Determine winner
    const winnerId = match.team1Score > match.team2Score ? match.team1Id : match.team2Id;
    
    // Find next match in bracket
    const nextMatchNumber = Math.ceil(match.matchNumber / 2);
    const nextRound = match.round + 1;
    
    // Check if next match already exists
    const matchesQuery = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId),
      where('round', '==', nextRound),
      where('matchNumber', '==', nextMatchNumber)
    );
    
    const nextMatchDocs = await getDocs(matchesQuery);
    
    if (!nextMatchDocs.empty) {
      // Update existing next match with winner
      const nextMatchDoc = nextMatchDocs.docs[0];
      const nextMatch = nextMatchDoc.data() as Match;
      
      // Determine which team slot to fill
      const isFirstSlot = match.matchNumber % 2 === 1;
      
      await updateDoc(nextMatchDoc.ref, {
        [isFirstSlot ? 'team1Id' : 'team2Id']: winnerId,
        updatedAt: new Date()
      });
    } else {
      // Create new match for next round
      const newMatch: Partial<Match> = {
        team1Id: winnerId,
        team2Id: '', // Will be filled when other match completes
        team1Score: 0,
        team2Score: 0,
        isComplete: false,
        round: nextRound,
        matchNumber: nextMatchNumber,
        tournamentId,
        tournamentType: 'knockout-stage',
        bracketType: 'winners',
        matchState: 'scheduled',
        mapPool: tournament.format?.mapPool || ['Ascent', 'Icebox', 'Sunset', 'Haven', 'Lotus', 'Pearl', 'Split'],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'matches'), newMatch);
    }
    
  } catch (error) {
    throw error;
  }
};

// Complete current round (advance all winners from current round)
export const completeCurrentRound = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentDoc.data() as Tournament;
    const knockoutStage = tournament.stageManagement?.knockoutStage;
    
    if (knockoutStage && knockoutStage.isActive) {
      // Original knockout stage logic
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('round', '==', knockoutStage.currentRound),
        where('isComplete', '==', true)
      );
      const matchesDocs = await getDocs(matchesQuery);
      if (matchesDocs.empty) {
        throw new Error('No completed matches found in current round');
      }
      for (const matchDoc of matchesDocs.docs) {
        const match = matchDoc.data() as Match;
        await advanceWinnerToNextRound(tournamentId, match);
      }
      await updateDoc(tournamentRef, {
        'stageManagement.knockoutStage.currentRound': knockoutStage.currentRound + 1,
        updatedAt: new Date()
      });
      return;
    }
    // --- Single Elimination fallback ---
    // Find the current round (lowest round with incomplete matches)
    const matchesQuery = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId)
    );
    const matchesDocs = await getDocs(matchesQuery);
    const allMatches = matchesDocs.docs.map(doc => doc.data() as Match);
    const incompleteMatches = allMatches.filter(m => !m.isComplete);
    if (incompleteMatches.length === 0) {
      throw new Error('No incomplete matches found');
    }
    // Find the lowest round with incomplete matches
    const currentRound = Math.min(...incompleteMatches.map(m => m.round));
    // Get all completed matches in this round
    const completedMatches = allMatches.filter(m => m.round === currentRound && m.isComplete);
    if (completedMatches.length === 0) {
      throw new Error('No completed matches found in current round');
    }
    // Advance all winners
    for (const match of completedMatches) {
      await advanceWinnerToNextRound(tournamentId, match);
    }
    // No need to update knockoutStage.currentRound for single elimination
  } catch (error) {
    throw error;
  }
}; 