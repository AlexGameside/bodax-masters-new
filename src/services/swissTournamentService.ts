import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { 
  Tournament, 
  Match, 
  SwissRound, 
  SwissStanding, 
  Matchday, 
  SchedulingProposal,
  Team
} from '../types/tournament';

// Swiss System Tournament Management
export class SwissTournamentService {
  
  // Generate Swiss rounds for a tournament
  static async generateSwissRounds(tournamentId: string, teams: string[], rounds: number): Promise<void> {
    try {
      console.log('🔍 DEBUG: Starting generateSwissRounds for tournament:', tournamentId);
      console.log('🔍 DEBUG: Teams:', teams);
      console.log('🔍 DEBUG: Rounds:', rounds);
      
      const batch = writeBatch(db);
      
      // Create matchdays
      for (let matchday = 1; matchday <= rounds; matchday++) {
        const matchdayRef = doc(collection(db, 'matchdays'));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (matchday - 1) * 7); // 7 days per matchday
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // 7-day window
        
        const matchdayData: Matchday = {
          id: matchdayRef.id,
          tournamentId,
          matchdayNumber: matchday,
          startDate,
          endDate,
          matches: [],
          isComplete: false,
          schedulingDeadline: endDate, // Teams must play by the end of the matchday
          // autoScheduleTime removed - no auto-scheduling
        };
        
        batch.set(matchdayRef, matchdayData);
        console.log('🔍 DEBUG: Created matchday', matchday, 'with ID:', matchdayRef.id);
      }
      
      // Generate first round pairings (random for now, can be improved with seeding)
      const firstRoundMatches = this.generateFirstRoundPairings(teams);
      console.log('🔍 DEBUG: Generated first round pairings:', firstRoundMatches);
      
      // Store matchday IDs for later use
      const matchdayIds: string[] = [];
      
      // Create first round matches
      for (const [team1Id, team2Id] of firstRoundMatches) {
        const matchRef = doc(collection(db, 'matches'));
        const matchData: Partial<Match> = {
          id: matchRef.id,
          tournamentId,
          tournamentType: 'swiss-round',
          swissRound: 1,
          matchday: 1,
          team1Id,
          team2Id,
          team1Score: 0,
          team2Score: 0,
          isComplete: false,
          round: 1,
          matchNumber: firstRoundMatches.indexOf([team1Id, team2Id]) + 1,
          matchState: 'pending_scheduling', // Teams need to schedule first
          currentSchedulingStatus: 'pending', // Waiting for scheduling
          schedulingProposals: [],
          createdAt: new Date(),
          mapPool: [], // Will be set by tournament config
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
        };
        
        batch.set(matchRef, matchData);
        console.log('🔍 DEBUG: Created match:', team1Id, 'vs', team2Id, 'with ID:', matchRef.id);
      }
      
      console.log('🔍 DEBUG: Committing batch...');
      // Commit the batch first to create matchdays and matches
      await batch.commit();
      console.log('🔍 DEBUG: Batch committed successfully');
      
      // Now get the first matchday and add matches to it
      console.log('🔍 DEBUG: Getting first matchday...');
      const firstMatchday = await this.getMatchdayByNumber(tournamentId, 1);
      console.log('🔍 DEBUG: Found first matchday:', firstMatchday);
      
      const matchdayRef = doc(db, 'matchdays', firstMatchday.id);
      
      // Get all matches for this tournament and matchday
      console.log('🔍 DEBUG: Querying for matches...');
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchday', '==', 1)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchIds = matchesSnapshot.docs.map(doc => doc.id);
      console.log('🔍 DEBUG: Found matches:', matchIds);
      
      // Update the first matchday with all match IDs
      console.log('🔍 DEBUG: Updating matchday with matches...');
      await updateDoc(matchdayRef, {
        matches: matchIds
      });
      console.log('🔍 DEBUG: Matchday updated successfully');
      
      // Update tournament with Swiss stage
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage': {
          isActive: true,
          currentRound: 1,
          totalRounds: rounds,
          currentMatchday: 1,
          totalMatchdays: rounds,
          rounds: [],
          standings: teams.map(teamId => ({
            teamId,
            points: 0,
            matchWins: 0,
            matchLosses: 0,
            gameWins: 0,
            gameLosses: 0,
            roundsWon: 0,
            roundsLost: 0,
            opponents: [],
          })),
          teamsAdvancingToPlayoffs: [],
        },
        status: 'in-progress',
        updatedAt: serverTimestamp(),
      });
      
    } catch (error) {
      console.error('Error generating Swiss rounds:', error);
      throw error;
    }
  }
  
  // Generate first round pairings (random for now)
  private static generateFirstRoundPairings(teams: string[]): [string, string][] {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const pairings: [string, string][] = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairings.push([shuffled[i], shuffled[i + 1]]);
      } else {
        // Handle odd number of teams - bye for last team
        pairings.push([shuffled[i], 'BYE']);
      }
    }
    
    return pairings;
  }
  
  // Get matchday by number
  static async getMatchdayByNumber(tournamentId: string, matchdayNumber: number): Promise<Matchday> {
    const matchdayQuery = query(
      collection(db, 'matchdays'),
      where('tournamentId', '==', tournamentId),
      where('matchdayNumber', '==', matchdayNumber)
    );
    
    const snapshot = await getDocs(matchdayQuery);
    if (snapshot.empty) {
      throw new Error(`Matchday ${matchdayNumber} not found`);
    }
    
    const data = snapshot.docs[0].data();
            return {
          ...data,
          startDate: data.startDate?.toDate?.() || data.startDate || new Date(),
          endDate: data.endDate?.toDate?.() || data.endDate || new Date(),
          schedulingDeadline: data.schedulingDeadline?.toDate?.() || data.schedulingDeadline || new Date(),
          // autoScheduleTime removed - no auto-scheduling
        } as Matchday;
  }

  // Get all matchdays for a tournament
  static async getAllMatchdays(tournamentId: string): Promise<Matchday[]> {
    try {
      const matchdayQuery = query(
        collection(db, 'matchdays'),
        where('tournamentId', '==', tournamentId),
        orderBy('matchdayNumber', 'asc')
      );
      
      const snapshot = await getDocs(matchdayQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startDate: data.startDate?.toDate?.() || data.startDate || new Date(),
          endDate: data.endDate?.toDate?.() || data.endDate || new Date(),
          schedulingDeadline: data.schedulingDeadline?.toDate?.() || data.schedulingDeadline || new Date(),
          // autoScheduleTime removed - no auto-scheduling
        } as Matchday;
      });
    } catch (error) {
      console.error('Error getting all matchdays:', error);
      throw error;
    }
  }
  
  // Generate next Swiss round based on current standings
  static async generateNextSwissRound(tournamentId: string, currentRound: number): Promise<void> {
    try {
      const tournament = await this.getTournament(tournamentId);
      if (!tournament?.stageManagement?.swissStage) {
        throw new Error('Tournament not in Swiss stage');
      }
      
      const currentStandings = tournament.stageManagement.swissStage.standings;
      const nextRound = currentRound + 1;
      const nextMatchday = nextRound;
      
      // Sort standings by points, then by tiebreakers
      const sortedStandings = this.sortSwissStandings(currentStandings);
      
      // Generate pairings avoiding rematches
      const pairings = this.generateSwissPairings(sortedStandings, tournamentId, currentRound);
      
      // Create matches for next round
      const batch = writeBatch(db);
      
      for (const [team1Id, team2Id] of pairings) {
        if (team2Id === 'BYE') continue; // Skip bye matches
        
        const matchRef = doc(collection(db, 'matches'));
        const matchData: Partial<Match> = {
          id: matchRef.id,
          tournamentId,
          tournamentType: 'swiss-round',
          swissRound: nextRound,
          matchday: nextMatchday,
          team1Id,
          team2Id,
          team1Score: 0,
          team2Score: 0,
          isComplete: false,
          round: nextRound,
          matchNumber: pairings.indexOf([team1Id, team2Id]) + 1,
          matchState: 'pending_scheduling', // Teams need to schedule first
          currentSchedulingStatus: 'pending', // Waiting for scheduling
          schedulingProposals: [],
          createdAt: new Date(),
          mapPool: [], // Will be set by tournament config
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
        };
        
        batch.set(matchRef, matchData);
        
        // Add match to next matchday
        const nextMatchdayRef = doc(db, 'matchdays', (await this.getMatchdayByNumber(tournamentId, nextMatchday)).id);
        batch.update(nextMatchdayRef, {
          matches: arrayUnion(matchRef.id)
        });
      }
      
      await batch.commit();
      
      // Update tournament Swiss stage
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.currentRound': nextRound,
        'stageManagement.swissStage.currentMatchday': nextMatchday,
        updatedAt: serverTimestamp(),
      });
      
    } catch (error) {
      console.error('Error generating next Swiss round:', error);
      throw error;
    }
  }
  
  // Sort Swiss standings with tiebreakers
  private static sortSwissStandings(standings: SwissStanding[]): SwissStanding[] {
    // Calculate Buchholz scores first
    this.calculateBuchholzScores(standings);
    
    return standings.sort((a, b) => {
      // First by points
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      
      // Then by match wins
      if (a.matchWins !== b.matchWins) {
        return b.matchWins - a.matchWins;
      }
      
      // Then by game wins
      if (a.gameWins !== b.gameWins) {
        return b.gameWins - a.gameWins;
      }
      
      // Then by Buchholz score
      if (a.buchholzScore !== undefined && b.buchholzScore !== undefined) {
        return b.buchholzScore - a.buchholzScore;
      }
      
      return 0;
    });
  }
  
  // Calculate Buchholz scores for tiebreakers
  private static calculateBuchholzScores(standings: SwissStanding[]): void {
    standings.forEach(standing => {
      let buchholzScore = 0;
      
      // Sum the points of all opponents this team has faced
      standing.opponents.forEach(opponentId => {
        const opponentStanding = standings.find(s => s.teamId === opponentId);
        if (opponentStanding) {
          buchholzScore += opponentStanding.points;
        }
      });
      
      standing.buchholzScore = buchholzScore;
    });
  }
  
  // Generate Swiss pairings avoiding rematches with improved odd team handling
  private static generateSwissPairings(standings: SwissStanding[], tournamentId: string, currentRound: number): [string, string][] {
    const pairings: [string, string][] = [];
    const usedTeams = new Set<string>();
    const availableTeams = [...standings];
    
    // Handle odd number of teams by giving bye to lowest ranked team
    if (availableTeams.length % 2 === 1) {
      const lowestRankedTeam = availableTeams[availableTeams.length - 1];
      pairings.push([lowestRankedTeam.teamId, 'BYE']);
      usedTeams.add(lowestRankedTeam.teamId);
      availableTeams.splice(availableTeams.length - 1, 1); // Remove from available teams
    }
    
    // Sort teams by points for better pairing
    availableTeams.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points; // Higher points first
      if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
      if (a.gameWins !== b.gameWins) return b.gameWins - a.gameWins;
      return (b.roundsWon - b.roundsLost) - (a.roundsWon - a.roundsLost); // Rounds differential
    });
    
    // Generate pairings using improved algorithm
    while (availableTeams.length > 0) {
      const currentTeam = availableTeams[0];
      availableTeams.splice(0, 1); // Remove current team
      
      if (usedTeams.has(currentTeam.teamId)) continue;
      
      // Find best available opponent
      let bestOpponent: SwissStanding | null = null;
      let bestScoreDiff = Infinity;
      let bestOpponentIndex = -1;
      
      for (let i = 0; i < availableTeams.length; i++) {
        const potentialOpponent = availableTeams[i];
        
        if (usedTeams.has(potentialOpponent.teamId)) continue;
        
        // Check if they've already played (rematch prevention)
        if (currentTeam.opponents.includes(potentialOpponent.teamId)) {
          continue;
        }
        
        // Calculate pairing score (lower is better)
        const scoreDiff = Math.abs(currentTeam.points - potentialOpponent.points);
        const matchWinDiff = Math.abs(currentTeam.matchWins - potentialOpponent.matchWins);
        const gameWinDiff = Math.abs(currentTeam.gameWins - potentialOpponent.gameWins);
        
        // Weighted scoring: points matter most, then match wins, then game wins
        const pairingScore = scoreDiff * 10 + matchWinDiff * 3 + gameWinDiff;
        
        if (pairingScore < bestScoreDiff) {
          bestScoreDiff = pairingScore;
          bestOpponent = potentialOpponent;
          bestOpponentIndex = i;
        }
      }
      
      if (bestOpponent && bestOpponentIndex !== -1) {
        pairings.push([currentTeam.teamId, bestOpponent.teamId]);
        usedTeams.add(currentTeam.teamId);
        usedTeams.add(bestOpponent.teamId);
        
        // Remove opponent from available teams
        availableTeams.splice(bestOpponentIndex, 1);
      } else {
        // No suitable opponent found - this shouldn't happen with even teams
        // but if it does, give a bye
        pairings.push([currentTeam.teamId, 'BYE']);
        usedTeams.add(currentTeam.teamId);
      }
    }
    
    return pairings;
  }
  
  // Get tournament with Swiss stage data
  static async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        return null;
      }
      
      const data = tournamentDoc.data();
      return {
        id: tournamentDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        publishedAt: data.publishedAt?.toDate?.() || data.publishedAt || undefined,
        schedule: {
          ...data.schedule,
          startDate: data.schedule?.startDate?.toDate?.() || data.schedule?.startDate || new Date(),
          endDate: data.schedule?.endDate?.toDate?.() || data.schedule?.endDate || new Date(),
          blackoutDates: data.schedule?.blackoutDates?.map((date: any) => 
            date?.toDate?.() || date || new Date()
          ) || [],
        },
        requirements: {
          ...data.requirements,
          registrationDeadline: data.requirements?.registrationDeadline?.toDate?.() || data.requirements?.registrationDeadline || new Date(),
        },
      } as Tournament;
    } catch (error) {
      console.error('Error getting tournament:', error);
      throw error;
    }
  }

  // Update Swiss standings when a match is completed
  static async updateSwissStandings(tournamentId: string, match: Match): Promise<void> {
    try {
      console.log('🔍 DEBUG: Updating Swiss standings for match:', match.id);
      
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournamentDoc.data() as Tournament;
      const swissStage = tournament.stageManagement?.swissStage;
      
      if (!swissStage || !swissStage.isActive) {
        console.log('⚠️ DEBUG: Swiss stage not active, skipping standings update');
        return;
      }
      
      // Find the standings for both teams
      const team1Standing = swissStage.standings.find(s => s.teamId === match.team1Id);
      const team2Standing = swissStage.standings.find(s => s.teamId === match.team2Id);
      
      if (!team1Standing || !team2Standing) {
        console.error('❌ DEBUG: Could not find standings for teams:', { team1Id: match.team1Id, team2Id: match.team2Id });
        return;
      }
      
      // Update match results
      if (match.team1Score !== undefined && match.team2Score !== undefined) {
        // Update match wins/losses
        if (match.team1Score > match.team2Score) {
          team1Standing.matchWins++;
          team2Standing.matchLosses++;
          team1Standing.points += 3;
        } else if (match.team2Score > match.team1Score) {
          team2Standing.matchWins++;
          team1Standing.matchLosses++;
          team2Standing.points += 3;
        }
        
        // Update game wins/losses (for BO3, count individual map wins)
        console.log('🔍 DEBUG: Match data for standings update:', {
          matchId: match.id,
          hasMapResults: !!match.mapResults,
          mapResults: match.mapResults,
          team1Score: match.team1Score,
          team2Score: match.team2Score
        });
        
        if (match.mapResults) {
          let team1GameWins = 0;
          let team2GameWins = 0;
          let team1RoundsWon = 0;
          let team2RoundsWon = 0;
          
          if (match.mapResults.map1) {
            if (match.mapResults.map1.winner === match.team1Id) team1GameWins++;
            else if (match.mapResults.map1.winner === match.team2Id) team2GameWins++;
            team1RoundsWon += match.mapResults.map1.team1Score;
            team2RoundsWon += match.mapResults.map1.team2Score;
          }
          if (match.mapResults.map2) {
            if (match.mapResults.map2.winner === match.team1Id) team1GameWins++;
            else if (match.mapResults.map2.winner === match.team2Id) team2GameWins++;
            team1RoundsWon += match.mapResults.map2.team1Score;
            team2RoundsWon += match.mapResults.map2.team2Score;
          }
          if (match.mapResults.map3) {
            if (match.mapResults.map3.winner === match.team1Id) team1GameWins++;
            else if (match.mapResults.map3.winner === match.team2Id) team2GameWins++;
            team1RoundsWon += match.mapResults.map3.team1Score;
            team2RoundsWon += match.mapResults.map3.team2Score;
          }
          
          team1Standing.gameWins += team1GameWins;
          team2Standing.gameWins += team2GameWins;
          team1Standing.gameLosses += team2GameWins;
          team2Standing.gameLosses += team1GameWins;
          
          // Update rounds won/lost
          team1Standing.roundsWon = (team1Standing.roundsWon || 0) + team1RoundsWon;
          team2Standing.roundsWon = (team2Standing.roundsWon || 0) + team2RoundsWon;
          team1Standing.roundsLost = (team1Standing.roundsLost || 0) + team2RoundsWon;
          team2Standing.roundsLost = (team2Standing.roundsLost || 0) + team1RoundsWon;
          
          console.log('🔍 DEBUG: Rounds calculation for match:', {
            matchId: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1RoundsWon,
            team2RoundsWon,
            team1StandingRoundsWon: team1Standing.roundsWon,
            team2StandingRoundsWon: team2Standing.roundsWon,
            team1StandingRoundsLost: team1Standing.roundsLost,
            team2StandingRoundsLost: team2Standing.roundsLost
          });
        } else {
          // Fallback: if no map results, assume BO1
          if (match.team1Score > match.team2Score) {
            team1Standing.gameWins++;
            team2Standing.gameLosses++;
          } else if (match.team2Score > match.team1Score) {
            team2Standing.gameWins++;
            team1Standing.gameLosses++;
          }
          
          // Update rounds won/lost for BO1
          team1Standing.roundsWon = (team1Standing.roundsWon || 0) + match.team1Score;
          team2Standing.roundsWon = (team2Standing.roundsWon || 0) + match.team2Score;
          team1Standing.roundsLost = (team1Standing.roundsLost || 0) + match.team2Score;
          team2Standing.roundsLost = (team2Standing.roundsLost || 0) + match.team1Score;
          
          console.log('🔍 DEBUG: BO1 Rounds calculation for match:', {
            matchId: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Score: match.team1Score,
            team2Score: match.team2Score,
            team1StandingRoundsWon: team1Standing.roundsWon,
            team2StandingRoundsWon: team2Standing.roundsWon,
            team1StandingRoundsLost: team1Standing.roundsLost,
            team2StandingRoundsLost: team2Standing.roundsLost
          });
        }
        
        // Add opponents to prevent rematches
        if (!team1Standing.opponents.includes(match.team2Id!)) {
          team1Standing.opponents.push(match.team2Id!);
        }
        if (!team2Standing.opponents.includes(match.team1Id!)) {
          team2Standing.opponents.push(match.team1Id!);
        }
      }
      
      // Sort standings
      const sortedStandings = this.sortSwissStandings(swissStage.standings);
      
      // Debug: Show final standings
      console.log('🔍 DEBUG: Final standings after update:', sortedStandings.map(s => ({
        teamId: s.teamId,
        points: s.points,
        matchWins: s.matchWins,
        matchLosses: s.matchLosses,
        gameWins: s.gameWins,
        gameLosses: s.gameLosses,
        roundsWon: s.roundsWon,
        roundsLost: s.roundsLost
      })));
      
      // Update tournament with new standings
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.standings': sortedStandings,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ DEBUG: Swiss standings updated successfully');
      
      // Note: Next round generation is now manual - admin must trigger it
      // await this.checkAndGenerateNextRound(tournamentId, match);
      
      return; // Explicit return for Promise<void>
      
    } catch (error) {
      console.error('❌ DEBUG: Error updating Swiss standings:', error);
      throw error;
    }
  }
  
  // Manual round generation - admin must trigger this
  static async manuallyGenerateNextRound(tournamentId: string): Promise<{
    success: boolean;
    message: string;
    nextRound?: number;
    nextMatchday?: number;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      console.log('🔍 DEBUG: Manual next round generation requested for tournament:', tournamentId);
      
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        return {
          success: false,
          message: 'Tournament not found',
          errors: ['Tournament not found']
        };
      }
      
      const tournamentData = tournamentDoc.data() as Tournament;
      const swissStage = tournamentData.stageManagement?.swissStage;
      
      if (!swissStage || !swissStage.isActive) {
        return {
          success: false,
          message: 'Tournament not in Swiss stage',
          errors: ['Tournament not in Swiss stage']
        };
      }
      
      const currentMatchday = swissStage.currentMatchday;
      const currentRound = swissStage.currentRound;
      const totalRounds = swissStage.totalRounds;
      
      console.log('🔍 DEBUG: Current state:', { currentMatchday, currentRound, totalRounds });
      
      // Check if we can generate next round
      if (currentRound >= totalRounds) {
        return {
          success: false,
          message: 'All Swiss rounds already completed',
          errors: ['All Swiss rounds already completed']
        };
      }
      
      // Get all matches for current matchday
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchday', '==', currentMatchday)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchdayMatches = matchesSnapshot.docs.map(doc => doc.data() as Match);
      
      // Check if all matches in current matchday are complete
      const incompleteMatches = matchdayMatches.filter(match => !match.isComplete);
      
      if (incompleteMatches.length > 0) {
        return {
          success: false,
          message: `Cannot generate next round: ${incompleteMatches.length} matches still incomplete`,
          errors: [`${incompleteMatches.length} matches still incomplete`],
          warnings: incompleteMatches.map(match => `Match ${match.id} (${match.team1Id} vs ${match.team2Id})`)
        };
      }
      
      // Check if matchday has ended and process forfeits first
      const matchday = await this.getMatchdayByNumber(tournamentId, currentMatchday);
      if (new Date() > matchday.endDate) {
        console.log('⏰ DEBUG: Matchday ended, processing forfeits before manual round generation');
        await this.processMatchdayForfeits(tournamentId, currentMatchday);
        
        // Re-check completion after forfeits
        const updatedMatchesQuery = query(
          collection(db, 'matches'),
          where('tournamentId', '==', tournamentId),
          where('matchday', '==', currentMatchday)
        );
        const updatedMatchesSnapshot = await getDocs(updatedMatchesQuery);
        const updatedMatchdayMatches = updatedMatchesSnapshot.docs.map(doc => doc.data() as Match);
        const stillIncomplete = updatedMatchdayMatches.filter(match => !match.isComplete);
        
        if (stillIncomplete.length > 0) {
          return {
            success: false,
            message: `Cannot generate next round: ${stillIncomplete.length} matches still incomplete after forfeits`,
            errors: [`${stillIncomplete.length} matches still incomplete after forfeits`],
            warnings: stillIncomplete.map(match => `Match ${match.id} (${match.team1Id} vs ${match.team2Id})`)
          };
        }
      }
      
      // Mark current matchday as complete
      const matchdayQuery = query(
        collection(db, 'matchdays'),
        where('tournamentId', '==', tournamentId),
        where('matchdayNumber', '==', currentMatchday)
      );
      const matchdaySnapshot = await getDocs(matchdayQuery);
      if (!matchdaySnapshot.empty) {
        const matchdayRef = doc(db, 'matchdays', matchdaySnapshot.docs[0].id);
        await updateDoc(matchdayRef, {
          isComplete: true,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Generate next round
      await this.generateNextSwissRound(tournamentId, currentRound + 1);
      
      // Update tournament to next round
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.currentRound': currentRound + 1,
        'stageManagement.swissStage.currentMatchday': currentMatchday + 1,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ DEBUG: Manually advanced to next round:', currentRound + 1);
      
      return {
        success: true,
        message: `Successfully generated Round ${currentRound + 1}`,
        nextRound: currentRound + 1,
        nextMatchday: currentMatchday + 1
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Error manually generating next round:', error);
      return {
        success: false,
        message: 'Error generating next round',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  // Check if current matchday is complete (for admin reference only)
  static async checkMatchdayCompletion(tournamentId: string): Promise<{
    isComplete: boolean;
    totalMatches: number;
    completedMatches: number;
    incompleteMatches: Array<{id: string, team1Id: string, team2Id: string, matchState: string}>;
    canGenerateNextRound: boolean;
    currentRound: number;
    totalRounds: number;
  }> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournamentData = tournamentDoc.data() as Tournament;
      const swissStage = tournamentData.stageManagement?.swissStage;
      
      if (!swissStage || !swissStage.isActive) {
        throw new Error('Tournament not in Swiss stage');
      }
      
      const currentMatchday = swissStage.currentMatchday;
      const currentRound = swissStage.currentRound;
      const totalRounds = swissStage.totalRounds;
      
      // Get all matches for current matchday
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchday', '==', currentMatchday)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchdayMatches = matchesSnapshot.docs.map(doc => doc.data() as Match);
      
      const completedMatches = matchdayMatches.filter(match => match.isComplete);
      const incompleteMatches = matchdayMatches.filter(match => !match.isComplete);
      
      const isComplete = incompleteMatches.length === 0;
      const canGenerateNextRound = isComplete && currentRound < totalRounds;
      
      return {
        isComplete,
        totalMatches: matchdayMatches.length,
        completedMatches: completedMatches.length,
        incompleteMatches: incompleteMatches.map(match => ({
          id: match.id,
          team1Id: match.team1Id || 'Unknown',
          team2Id: match.team2Id || 'Unknown',
          matchState: match.matchState
        })),
        canGenerateNextRound,
        currentRound,
        totalRounds
      };
    } catch (error) {
      console.error('Error checking matchday completion:', error);
      throw error;
    }
  }

  // Process forfeits at the end of matchdays (1-1 draw, no rounds)
  static async processMatchdayForfeits(tournamentId: string, matchdayNumber: number): Promise<void> {
    try {
      console.log(`🔍 DEBUG: Processing forfeits for matchday ${matchdayNumber}`);
      
      // Get all matches for this matchday that aren't complete
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchday', '==', matchdayNumber),
        where('isComplete', '==', false)
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const now = new Date();
      
      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        
        // Check if matchday has ended
        const matchday = await this.getMatchdayByNumber(tournamentId, matchdayNumber);
        if (now > matchday.endDate) {
          console.log(`🔍 DEBUG: Matchday ${matchdayNumber} ended, forfeiting match ${matchDoc.id}`);
          
          // Forfeit with 1-1 draw, no rounds
          await updateDoc(matchDoc.ref, {
            team1Score: 1,
            team2Score: 1,
            isComplete: true,
            matchState: 'forfeited',
            resolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // No rounds given for forfeits
            mapResults: undefined
          });
          
          console.log(`✅ DEBUG: Match ${matchDoc.id} forfeited with 1-1 draw`);
        }
      }
      
    } catch (error) {
      console.error('Error processing matchday forfeits:', error);
      throw error;
    }
  }

  // Automatically transition all scheduled matches to ready_up when ready
  static async autoTransitionScheduledMatches(): Promise<void> {
    try {
      // Get all matches and filter in memory instead of complex query
      const matchesQuery = query(
        collection(db, 'matches'),
        where('matchState', '==', 'scheduled')
      );
      
      const scheduledSnapshot = await getDocs(matchesQuery);
      const now = new Date();
      
      for (const matchDoc of scheduledSnapshot.docs) {
        try {
          const matchData = matchDoc.data();
          const scheduledTime = matchData.scheduledTime?.toDate?.() || matchData.scheduledTime;
          
          if (scheduledTime) {
            // Check if it's 15 minutes before scheduled time (ready-up window opens)
            const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
            
            // Also check if match is scheduled within the next 24 hours - if so, transition immediately
            const isWithin24Hours = scheduledTime.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
            
            if (now >= readyUpTime || isWithin24Hours) {
              await this.transitionScheduledToReadyUp(matchDoc.id);
            }
          }
        } catch (error) {
          console.warn(`Failed to transition match ${matchDoc.id}:`, error);
        }
      }
      
      console.log(`✅ Auto-transitioned scheduled matches to ready_up`);
      
    } catch (error) {
      console.error('Error auto-transitioning scheduled matches:', error);
      // Don't throw error, just log it to avoid breaking the page
    }
  }



  // Transition scheduled matches to ready_up when they're ready to start
  static async transitionScheduledToReadyUp(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Only transition if match is currently scheduled
      if (matchData.matchState !== 'scheduled') {
        throw new Error('Match is not in scheduled state');
      }
      
      // Check if it's time to open the ready-up window
      const scheduledTime = matchData.scheduledTime?.toDate?.() || matchData.scheduledTime;
      if (scheduledTime) {
        const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
        const now = new Date();
        
        // Allow immediate transition if match is within 24 hours, otherwise wait for 15-minute window
        const isWithin24Hours = scheduledTime.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
        
        if (!isWithin24Hours && now < readyUpTime) {
          throw new Error('Ready-up window has not opened yet (opens 15 minutes before match)');
        }
      }
      
      // Transition to ready_up state
      const forfeitTime = new Date(scheduledTime.getTime() + (15 * 60 * 1000));
      
      await updateDoc(matchRef, {
        matchState: 'ready_up',
        forfeitTime: forfeitTime,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Match ${matchId} transitioned from scheduled to ready_up`);
      
    } catch (error) {
      console.error('Error transitioning match to ready_up:', error);
      throw error;
    }
  }

  // Admin function to force transition to ready_up (bypasses time restrictions)
  static async adminForceTransitionToReadyUp(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Only transition if match is currently scheduled
      if (matchData.matchState !== 'scheduled') {
        throw new Error('Match is not in scheduled state');
      }
      
      // Admin bypasses all time restrictions
      const scheduledTime = matchData.scheduledTime?.toDate?.() || matchData.scheduledTime;
      const forfeitTime = scheduledTime ? new Date(scheduledTime.getTime() + (15 * 60 * 1000)) : new Date(Date.now() + (15 * 60 * 1000));
      
      await updateDoc(matchRef, {
        matchState: 'ready_up',
        forfeitTime: forfeitTime,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ Admin forced transition: Match ${matchId} moved to ready_up state`);
      
    } catch (error) {
      console.error('Error in admin force transition:', error);
      throw error;
    }
  }
}

// Match Scheduling Service
export class MatchSchedulingService {
  
  // Send scheduling proposal
  static async sendSchedulingProposal(
    matchId: string, 
    teamId: string, 
    proposedTime: Date, 
    message?: string
  ): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Verify team is part of this match
      if (matchData.team1Id !== teamId && matchData.team2Id !== teamId) {
        throw new Error('Team not part of this match');
      }
      
      // Get existing proposals and invalidate any previous proposals from the same team
      const existingProposals = matchData.schedulingProposals || [];
      const updatedProposals = existingProposals.map((proposal: SchedulingProposal) => {
        if (proposal.proposedBy === teamId && proposal.status === 'pending') {
          return {
            ...proposal,
            status: 'cancelled' as const,
            responseMessage: 'Cancelled due to new proposal',
            respondedAt: new Date()
          };
        }
        return proposal;
      });

      // Create new proposal - ensure all fields are properly defined
      const newProposal: any = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9),
        proposedBy: teamId,
        proposedTime,
        status: 'pending',
        createdAt: new Date(),
      };
      
      // Only include message if it has a value
      if (message && message.trim()) {
        newProposal.message = message.trim();
      }
      
      // Clean the proposal object to remove any undefined values that Firebase doesn't accept
      const cleanProposal = Object.fromEntries(
        Object.entries(newProposal).filter(([_, value]) => value !== undefined)
      );
      
      // Add the new proposal to the updated list
      updatedProposals.push(cleanProposal);
      
      console.log('🔍 DEBUG: Original proposal:', newProposal);
      console.log('🔍 DEBUG: Cleaned proposal:', cleanProposal);
      console.log('🔍 DEBUG: Updated proposals array:', updatedProposals);
      
      // Update match with updated proposals array (instead of using arrayUnion)
      await updateDoc(matchRef, {
        schedulingProposals: updatedProposals,
        currentSchedulingStatus: 'proposed',
        updatedAt: serverTimestamp(),
      });
      
    } catch (error) {
      console.error('Error sending scheduling proposal:', error);
      throw error;
    }
  }
  
  // Respond to scheduling proposal
  static async respondToSchedulingProposal(
    matchId: string,
    proposalId: string,
    teamId: string,
    response: 'accept' | 'deny',
    responseMessage?: string,
    alternativeProposal?: Date
  ): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Validate matchData
      if (!matchData || typeof matchData !== 'object') {
        throw new Error('Invalid match data');
      }
      
      // Verify team is part of this match
      if (matchData.team1Id !== teamId && matchData.team2Id !== teamId) {
        throw new Error('Team not part of this match');
      }
      
      // Find and update the proposal
      const proposals = matchData.schedulingProposals || [];
      
      // Validate proposals array
      if (!Array.isArray(proposals)) {
        throw new Error('Invalid proposals array');
      }
      
      const proposalIndex = proposals.findIndex((p: SchedulingProposal) => p.id === proposalId);
      
      if (proposalIndex === -1) {
        throw new Error('Proposal not found');
      }
      
      const proposal = proposals[proposalIndex];
      
      // Validate proposal object
      if (!proposal || typeof proposal !== 'object') {
        throw new Error('Invalid proposal object');
      }
      
      if (!proposal.proposedTime) {
        throw new Error('Proposal missing proposedTime');
      }
      
      if (response === 'deny' && !alternativeProposal) {
        throw new Error('Alternative proposal required when denying');
      }
      
      // Ensure alternativeProposal is properly handled
      if (response === 'deny' && alternativeProposal) {
        // Validate that alternativeProposal is a valid Date
        if (!(alternativeProposal instanceof Date) || isNaN(alternativeProposal.getTime())) {
          throw new Error('Invalid alternative proposal date');
        }
      }
      
      // Update proposal - ensure all fields are properly defined
      const updatedProposal: any = {
        ...proposal,
        status: response === 'accept' ? 'accepted' : 'denied',
        respondedAt: new Date(),
      };
      
      // Only add optional fields if they have values
      if (responseMessage && responseMessage.trim()) {
        updatedProposal.responseMessage = responseMessage.trim();
      }
      if (alternativeProposal) {
        updatedProposal.alternativeProposal = alternativeProposal;
      }
      
      proposals[proposalIndex] = updatedProposal;
      
      // Clean the proposals array to remove any undefined values that might exist
      const cleanProposals = proposals.map((proposal: any) => {
        const cleanProposal: any = { ...proposal };
        // Remove any undefined values
        Object.keys(cleanProposal).forEach(key => {
          if (cleanProposal[key] === undefined) {
            delete cleanProposal[key];
          }
        });
        return cleanProposal;
      });
      
      // Update match
      const updateData: any = {
        schedulingProposals: cleanProposals,
        updatedAt: serverTimestamp(),
      };
      
      if (response === 'accept') {
        console.log('🔍 DEBUG: Processing accept response for proposal:', proposal);
        console.log('🔍 DEBUG: proposal.proposedTime:', proposal.proposedTime, 'type:', typeof proposal.proposedTime);
        
        // Convert Firestore Timestamp to Date if needed
        let scheduledTime: Date;
        if (proposal.proposedTime && typeof proposal.proposedTime === 'object' && 'seconds' in proposal.proposedTime) {
          // It's a Firestore Timestamp
          scheduledTime = new Date(proposal.proposedTime.seconds * 1000);
          console.log('🔍 DEBUG: Converted Firestore Timestamp to Date:', scheduledTime);
        } else if (proposal.proposedTime instanceof Date) {
          // It's already a Date
          scheduledTime = proposal.proposedTime;
          console.log('🔍 DEBUG: proposal.proposedTime is already a Date:', scheduledTime);
        } else {
          console.error('🔍 DEBUG: Invalid proposedTime format:', proposal.proposedTime);
          throw new Error('Invalid proposedTime format');
        }
        
        // Validate scheduledTime before setting it
        if (!(scheduledTime instanceof Date) || isNaN(scheduledTime.getTime())) {
          console.error('🔍 DEBUG: Invalid scheduled time:', scheduledTime);
          throw new Error('Invalid scheduled time');
        }
        
        updateData.scheduledTime = scheduledTime;
        updateData.currentSchedulingStatus = 'accepted';
        updateData.matchState = 'scheduled';
        // Set forfeit time to 15 minutes after scheduled time
        updateData.forfeitTime = new Date(scheduledTime.getTime() + (15 * 60 * 1000));
      } else {
        // When denying with alternative proposal, create a new proposal for the other team
        if (alternativeProposal) {
          console.log('🔍 DEBUG: Creating new proposal from alternative time');
          
          // Create new proposal from the alternative time
          const newProposal: SchedulingProposal = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9),
            proposedBy: teamId, // The team that denied and proposed alternative
            proposedTime: alternativeProposal,
            status: 'pending',
            createdAt: new Date(),
            message: responseMessage || 'Alternative time proposed'
          };
          
          // Add the new proposal to the list
          cleanProposals.push(newProposal);
          
          // Update the proposals array
          updateData.schedulingProposals = cleanProposals;
          updateData.currentSchedulingStatus = 'proposed';
          
          console.log('🔍 DEBUG: New alternative proposal created:', newProposal);
          console.log('🔍 DEBUG: Updated proposals array:', cleanProposals);
          console.log('🔍 DEBUG: Final update data:', updateData);
        } else {
          updateData.currentSchedulingStatus = 'denied';
        }
      }
      
      console.log('🔍 DEBUG: Final update data:', updateData);
      console.log('🔍 DEBUG: Cleaned proposals:', cleanProposals);
      
      await updateDoc(matchRef, updateData);
      
    } catch (error) {
      console.error('Error responding to scheduling proposal:', error);
      throw error;
    }
  }
  
  // Note: Auto-scheduling has been removed as per requirements
  // Teams must schedule their own matches within the 7-day matchday window
  
  // Ready-up system functions
  static async readyUpForMatch(
    matchId: string, 
    teamId: string, 
    roster: {
      mainPlayers: string[];
      substitutes: string[];
      coach?: string;
      assistantCoach?: string;
      manager?: string;
    }
  ): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Verify team is part of this match
      if (matchData.team1Id !== teamId && matchData.team2Id !== teamId) {
        throw new Error('Team not part of this match');
      }
      
      // Update the appropriate team's ready status and roster
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (matchData.team1Id === teamId) {
        updateData.team1Ready = true;
        updateData.team1Roster = {
          teamId,
          mainPlayers: roster.mainPlayers,
          substitutes: roster.substitutes,
          coach: roster.coach,
          assistantCoach: roster.assistantCoach,
          manager: roster.manager,
          readyUpTime: new Date(),
          isReady: true,
        };
      } else {
        updateData.team2Ready = true;
        updateData.team2Roster = {
          teamId,
          mainPlayers: roster.mainPlayers,
          substitutes: roster.substitutes,
          coach: roster.coach,
          assistantCoach: roster.assistantCoach,
          manager: roster.manager,
          readyUpTime: new Date(),
          isReady: true,
        };
      }
      
      // Check if both teams are ready and transition to ready_up state if needed
      if (updateData.team1Ready && updateData.team2Ready) {
        updateData.matchState = 'ready_up';
      }
      
      await updateDoc(matchRef, updateData);
      
    } catch (error) {
      console.error('Error readying up for match:', error);
      throw error;
    }
  }
  
  static async startMatch(matchId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Verify both teams are ready
      if (!matchData.team1Ready || !matchData.team2Ready) {
        throw new Error('Both teams must be ready to start the match');
      }
      
      // Start the match
      await updateDoc(matchRef, {
        matchState: 'map_banning',
        updatedAt: serverTimestamp(),
      });
      
    } catch (error) {
      console.error('Error starting match:', error);
      throw error;
    }
  }
  
  // Forfeit system - should be called by a scheduled function
  static async processForfeits(): Promise<void> {
    try {
      const now = new Date();
      
      // Find matches that should be forfeited (15 minutes after scheduled time)
      const forfeitQuery = query(
        collection(db, 'matches'),
        where('matchState', 'in', ['scheduled', 'ready_up']),
        where('scheduledTime', '<=', new Date(now.getTime() - (15 * 60 * 1000))) // 15 minutes ago
      );
      
      const forfeitSnapshot = await getDocs(forfeitQuery);
      
      for (const matchDoc of forfeitSnapshot.docs) {
        const matchData = matchDoc.data();
        
        // Check if teams are ready
        if (!matchData.team1Ready || !matchData.team2Ready) {
          // Determine which team forfeits
          const forfeitingTeam = !matchData.team1Ready ? matchData.team1Id : matchData.team2Id;
          const winningTeam = !matchData.team1Ready ? matchData.team2Id : matchData.team1Id;
          
          await updateDoc(matchDoc.ref, {
            matchState: 'forfeited',
            winnerId: winningTeam,
            isComplete: true,
            resolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      
    } catch (error) {
      console.error('Error processing forfeits:', error);
      throw error;
    }
  }
  
  // Get matches that need scheduling attention
  static async getMatchesNeedingScheduling(tournamentId: string): Promise<Match[]> {
    try {
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchState', 'in', ['pending_scheduling', 'proposed'])
      );
      
      const snapshot = await getDocs(matchesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date(),
        scheduledTime: doc.data().scheduledTime?.toDate?.() || doc.data().scheduledTime || undefined,
      })) as Match[];
      
    } catch (error) {
      console.error('Error getting matches needing scheduling:', error);
      throw error;
    }
  }
}

// Export the service
export default SwissTournamentService; 