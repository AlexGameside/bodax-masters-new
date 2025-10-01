import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Team, Match, User } from '../types/tournament';

export class ValidationService {
  
  // Check if team is available for new matches
  static async validateTeamAvailability(teamId: string, tournamentId?: string): Promise<{
    available: boolean;
    conflicts: string[];
    reason?: string;
  }> {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (!teamDoc.exists()) {
        return {
          available: false,
          conflicts: [],
          reason: 'Team not found'
        };
      }
      
      const teamData = teamDoc.data();
      
      // Check if team has enough active members
      const activeMembers = teamData.members?.filter((m: any) => m.isActive) || [];
      if (activeMembers.length < 5) {
        return {
          available: false,
          conflicts: [],
          reason: `Team needs at least 5 active members. Currently has ${activeMembers.length}`
        };
      }
      
      // Check for active matches
      const activeMatchesQuery = query(
        collection(db, 'matches'),
        where('team1Id', '==', teamId),
        where('matchState', 'in', ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'])
      );
      
      const activeMatchesSnapshot = await getDocs(activeMatchesQuery);
      const activeMatches = activeMatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Also check team2Id matches
      const team2MatchesQuery = query(
        collection(db, 'matches'),
        where('team2Id', '==', teamId),
        where('matchState', 'in', ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'])
      );
      
      const team2MatchesSnapshot = await getDocs(team2MatchesQuery);
      const team2Matches = team2MatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const allActiveMatches = [...activeMatches, ...team2Matches];
      
      if (allActiveMatches.length > 0) {
        const conflicts = allActiveMatches.map((match: any) => 
          `Match ${match.id} (${match.matchState})`
        );
        
        return {
          available: false,
          conflicts,
          reason: 'Team is already in active matches'
        };
      }
      
      // Check if team is already registered for this tournament
      if (tournamentId) {
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        const tournamentDoc = await getDoc(tournamentRef);
        
        if (tournamentDoc.exists()) {
          const tournamentData = tournamentDoc.data();
          if (tournamentData.teams?.includes(teamId)) {
            return {
              available: false,
              conflicts: [],
              reason: 'Team is already registered for this tournament'
            };
          }
        }
      }
      
      return {
        available: true,
        conflicts: []
      };
      
    } catch (error) {

      return {
        available: false,
        conflicts: [],
        reason: 'Error checking team availability'
      };
    }
  }
  
  // Check if player is available for match
  static async validatePlayerAvailability(playerId: string, matchTime: Date, bufferHours: number = 4): Promise<{
    available: boolean;
    conflicts: string[];
    reason?: string;
  }> {
    try {
      // Get all teams the player is in
      const userRef = doc(db, 'users', playerId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          available: false,
          conflicts: [],
          reason: 'Player not found'
        };
      }
      
      const userData = userDoc.data();
      const playerTeamIds = userData.teamIds || [];
      
      if (playerTeamIds.length === 0) {
        return {
          available: true,
          conflicts: []
        };
      }
      
      // Check for conflicting matches within buffer time
      const bufferMs = bufferHours * 60 * 60 * 1000;
      const conflicts: string[] = [];
      
      for (const teamId of playerTeamIds) {
        // Check team1 matches
        const team1MatchesQuery = query(
          collection(db, 'matches'),
          where('team1Id', '==', teamId),
          where('matchState', 'in', ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'])
        );
        
        const team1MatchesSnapshot = await getDocs(team1MatchesQuery);
        const team1Matches = team1MatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Check team2 matches
        const team2MatchesQuery = query(
          collection(db, 'matches'),
          where('team2Id', '==', teamId),
          where('matchState', 'in', ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'])
        );
        
        const team2MatchesSnapshot = await getDocs(team2MatchesQuery);
        const team2Matches = team2MatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const allMatches = [...team1Matches, ...team2Matches];
        
        for (const match of allMatches as any[]) {
          if (match.scheduledTime) {
            const matchTimeMs = new Date(match.scheduledTime).getTime();
            const proposedTimeMs = matchTime.getTime();
            
            if (Math.abs(matchTimeMs - proposedTimeMs) < bufferMs) {
              conflicts.push(`Match ${match.id} at ${new Date(match.scheduledTime).toLocaleString()}`);
            }
          }
        }
      }
      
      if (conflicts.length > 0) {
        return {
          available: false,
          conflicts,
          reason: `Player has conflicting match commitments within ${bufferHours} hours`
        };
      }
      
      return {
        available: true,
        conflicts: []
      };
      
    } catch (error) {

      return {
        available: false,
        conflicts: [],
        reason: 'Error checking player availability'
      };
    }
  }
  
  // Validate tournament can start
  static async validateTournamentStart(tournamentId: string): Promise<{
    canStart: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        return {
          canStart: false,
          errors: ['Tournament not found'],
          warnings: []
        };
      }
      
      const tournamentData = tournamentDoc.data();
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check tournament status
      if (tournamentData.status !== 'registration-closed') {
        errors.push('Tournament must be in registration-closed status to start');
      }
      
      // Check team count
      const expectedTeams = tournamentData.format?.teamCount || tournamentData.requirements?.maxTeams || 8;
      const actualTeams = tournamentData.teams?.length || 0;
      
      if (actualTeams !== expectedTeams) {
        errors.push(`Tournament needs exactly ${expectedTeams} teams. Currently has ${actualTeams}`);
      }
      
      // Check all teams have required players
      const teams = tournamentData.teams || [];
      for (const teamId of teams) {
        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);
        
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          const activeMembers = teamData.members?.filter((m: any) => m.isActive) || [];
          
          if (activeMembers.length < 5) {
            errors.push(`Team ${teamData.name} doesn't have enough active players (${activeMembers.length}/5)`);
          }
          
          // Check for active matches
          const teamAvailability = await this.validateTeamAvailability(teamId);
          if (!teamAvailability.available) {
            errors.push(`Team ${teamData.name} is not available: ${teamAvailability.reason}`);
          }
        } else {
          errors.push(`Team ${teamId} not found`);
        }
      }
      
      // Check if any teams are in active matches
      const allMatchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId)
      );
      
      const allMatchesSnapshot = await getDocs(allMatchesQuery);
      const allMatches = allMatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const activeMatches = allMatches.filter((match: any) => 
        ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing'].includes(match.matchState)
      );
      
      if (activeMatches.length > 0) {
        warnings.push(`${activeMatches.length} matches are already in progress`);
      }
      
      return {
        canStart: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {

      return {
        canStart: false,
        errors: ['Error validating tournament start'],
        warnings: []
      };
    }
  }
  
  // Validate Swiss round generation
  static async validateSwissRound(tournamentId: string, round: number): Promise<{
    canGenerate: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check if previous round is complete
      const previousMatchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('swissRound', '==', round - 1)
      );
      
      const previousMatchesSnapshot = await getDocs(previousMatchesQuery);
      const previousMatches = previousMatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const incompleteMatches = previousMatches.filter((match: any) => !match.isComplete);
      
      if (incompleteMatches.length > 0) {
        errors.push(`Cannot generate round ${round}: ${incompleteMatches.length} matches from round ${round - 1} are incomplete`);
      }
      
      // Check for rematches
      const allMatchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId)
      );
      
      const allMatchesSnapshot = await getDocs(allMatchesQuery);
      const allMatches = allMatchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // This would need to be integrated with the actual Swiss pairing algorithm
      // For now, just a placeholder
      warnings.push('Rematch prevention will be validated during pairing generation');
      
      return {
        canGenerate: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {

      return {
        canGenerate: false,
        errors: ['Error validating Swiss round'],
        warnings: []
      };
    }
  }
}

