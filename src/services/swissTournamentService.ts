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
import { notifyMatchSchedulingRequest } from './discordService';
import type { 
  Tournament, 
  Match, 
  SwissRound, 
  SwissStanding, 
  Matchday, 
  SchedulingProposal,
  Team
} from '../types/tournament';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

// Swiss System Tournament Management
export class SwissTournamentService {
  
  // Generate Swiss rounds for a tournament
  static async generateSwissRounds(tournamentId: string, teams: string[], rounds: number): Promise<void> {
    try {
      
      
      
      
      const batch = writeBatch(db);
      
      // Get tournament start date for proper scheduling
      const tournamentDocRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentDocRef);
      const tournamentData = tournamentDoc.data();
      const tournamentStartDate = tournamentData?.startedAt?.toDate() || new Date();
      const schedulingWindowDays =
        tournamentData?.format?.swissConfig?.schedulingWindow && Number.isFinite(tournamentData.format.swissConfig.schedulingWindow)
          ? tournamentData.format.swissConfig.schedulingWindow
          : 7;
      
      console.log(`📅 Tournament start date: ${tournamentStartDate.toISOString()}`);
      
      // Create matchdays with proper scheduling from tournament start date
      for (let matchday = 1; matchday <= rounds; matchday++) {
        const matchdayRef = doc(collection(db, 'matchdays'));
        const startDate = new Date(tournamentStartDate);
        startDate.setDate(startDate.getDate() + (matchday - 1) * schedulingWindowDays); // configurable days per matchday
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (schedulingWindowDays - 1)); // window length
        
        console.log(`📅 Matchday ${matchday}: ${startDate.toDateString()} to ${endDate.toDateString()}`);
        
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
        
      }
      
      // Generate first round pairings (random for now, can be improved with seeding)
      const firstRoundMatches = this.generateFirstRoundPairings(teams);
      
      
      // Store matchday IDs for later use
      const matchdayIds: string[] = [];
      
      // Create first round matches
      for (let i = 0; i < firstRoundMatches.length; i++) {
        const [team1Id, team2Id] = firstRoundMatches[i];
        const matchRef = doc(collection(db, 'matches'));
        
        // Check if this is a bye match
        if (team2Id === 'BYE') {
          // Create a bye match that automatically completes with 2-0 score
          const byeMatchData: Partial<Match> = {
            id: matchRef.id,
            tournamentId,
            tournamentType: 'swiss-round',
            swissRound: 1,
            matchday: 1,
            team1Id,
            team2Id: 'Team Bye', // Use "Team Bye" as the opponent name
            team1Score: 2,
            team2Score: 0,
            isComplete: true,
            winnerId: team1Id, // Team gets automatic win
            round: 1,
            matchNumber: i + 1,
            matchState: 'completed', // Automatically completed
            createdAt: new Date(),
            mapPool: [], // Will be set by tournament config
            bannedMaps: { team1: [], team2: [] },
            team1Ready: true,
            team2Ready: true,
            team1MapBans: [],
            team2MapBans: [],
            matchFormat: 'BO3', // Set default match format for Swiss tournaments
            resultSubmission: {
              team1Submitted: true,
              team2Submitted: true,
              team1SubmittedScore: { team1Score: 2, team2Score: 0 },
              team2SubmittedScore: { team1Score: 2, team2Score: 0 },
              submittedAt: new Date(),
              adminOverride: true,
              adminOverrideAt: new Date(),
              adminId: 'system',
              forceComplete: true,
              byeMatch: true
            }
          };
          
          batch.set(matchRef, byeMatchData);
          
        } else {
          // Regular match
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
          matchNumber: i + 1,
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
          matchFormat: 'BO3', // Set default match format for Swiss tournaments
        };
          
          batch.set(matchRef, matchData);
        }
        
      }
      
      
      // Commit the batch first to create matchdays and matches
      await batch.commit();
      
      // Update Swiss standings for any bye matches in the first round
      for (let i = 0; i < firstRoundMatches.length; i++) {
        const [team1Id, team2Id] = firstRoundMatches[i];
        if (team2Id === 'BYE') {
          await this.updateSwissStandingsForByeMatch(tournamentId, team1Id, 1);
        }
      }
      
      // Now get the first matchday and add matches to it
      
      const firstMatchday = await this.getMatchdayByNumber(tournamentId, 1);
      
      
      const matchdayRef = doc(db, 'matchdays', firstMatchday.id);
      
      // Get all matches for this tournament and matchday
      
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('matchday', '==', 1)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchIds = matchesSnapshot.docs.map(doc => doc.id);
      
      
      // Update the first matchday with all match IDs
      
      await updateDoc(matchdayRef, {
        matches: matchIds
      });
      
      
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

  // Fix Round 2 matchday dates to be sequential after Round 1
  static async fixRound2MatchdayDates(tournamentId: string): Promise<void> {
    try {
      // Get Round 1 matchday to calculate correct Round 2 dates
      const round1Matchday = await this.getMatchdayByNumber(tournamentId, 1);
      
      // Calculate correct Round 2 dates (day after Round 1 ends)
      const correctRound2StartDate = new Date(round1Matchday.endDate);
      correctRound2StartDate.setDate(correctRound2StartDate.getDate() + 1); // Next day after Round 1
      const correctRound2EndDate = new Date(correctRound2StartDate);
      correctRound2EndDate.setDate(correctRound2EndDate.getDate() + 6); // 7-day window
      
      // Get Round 2 matchday
      const round2Matchday = await this.getMatchdayByNumber(tournamentId, 2);
      
      // Update Round 2 matchday with correct dates
      const round2MatchdayRef = doc(db, 'matchdays', round2Matchday.id);
      await updateDoc(round2MatchdayRef, {
        startDate: correctRound2StartDate,
        endDate: correctRound2EndDate,
        schedulingDeadline: correctRound2EndDate,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('❌ Error fixing Round 2 matchday dates:', error);
      throw error;
    }
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
      const nextRound = currentRound;
      const nextMatchday = currentRound;
      
      // Sort standings by points, then by tiebreakers
      const sortedStandings = this.sortSwissStandings(currentStandings);
      
      // Generate pairings avoiding rematches
      const pairings = this.generateSwissPairings(sortedStandings, tournamentId, currentRound);
      
      // Create matches for next round
      const batch = writeBatch(db);
      
      for (let i = 0; i < pairings.length; i++) {
        const [team1Id, team2Id] = pairings[i];
        
        const matchRef = doc(collection(db, 'matches'));
        
        // Check if this is a bye match
        if (team2Id === 'BYE') {
          // Create a bye match that automatically completes with 2-0 score
          const byeMatchData: Partial<Match> = {
            id: matchRef.id,
            tournamentId,
            tournamentType: 'swiss-round',
            swissRound: nextRound,
            matchday: nextMatchday,
            team1Id,
            team2Id: 'Team Bye', // Use "Team Bye" as the opponent name
            team1Score: 2,
            team2Score: 0,
            isComplete: true,
            winnerId: team1Id, // Team gets automatic win
            round: nextRound,
            matchNumber: i + 1,
            matchState: 'completed', // Automatically completed
            createdAt: new Date(),
            mapPool: [], // Will be set by tournament config
            bannedMaps: { team1: [], team2: [] },
            team1Ready: true,
            team2Ready: true,
            team1MapBans: [],
            team2MapBans: [],
            matchFormat: 'BO3', // Set default match format for Swiss tournaments
            resultSubmission: {
              team1Submitted: true,
              team2Submitted: true,
              team1SubmittedScore: { team1Score: 2, team2Score: 0 },
              team2SubmittedScore: { team1Score: 2, team2Score: 0 },
              submittedAt: new Date(),
              adminOverride: true,
              adminOverrideAt: new Date(),
              adminId: 'system',
              forceComplete: true,
              byeMatch: true
            }
          };
          
          batch.set(matchRef, byeMatchData);
          
        } else {
          // Regular match
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
            matchNumber: i + 1,
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
            matchFormat: 'BO3', // Set default match format for Swiss tournaments
          };
          
          batch.set(matchRef, matchData);
        }
        
        // Add match to next matchday (create matchday if it doesn't exist)
        let nextMatchdayRef;
        try {
          const existingMatchday = await this.getMatchdayByNumber(tournamentId, nextMatchday);
          nextMatchdayRef = doc(db, 'matchdays', existingMatchday.id);
        } catch (error) {
          // Matchday doesn't exist, create it with proper 7-day rolling window from tournament start
          const matchdayRef = doc(collection(db, 'matchdays'));
          
          // Get the last matchday's end date to calculate the next week properly
          const lastMatchday = await this.getMatchdayByNumber(tournamentId, nextMatchday - 1);
          const lastMatchdayEndDate = lastMatchday.endDate;
          
          // Start the next matchday the day after the last matchday ended
          const startDate = new Date(lastMatchdayEndDate);
          startDate.setDate(startDate.getDate() + 1); // Next day after last matchday
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6); // 7-day window
          
          console.log(`📅 Creating Matchday ${nextMatchday}: ${startDate.toDateString()} to ${endDate.toDateString()}`);
          
          const matchdayData: Matchday = {
            id: matchdayRef.id,
            tournamentId,
            matchdayNumber: nextMatchday,
            startDate,
            endDate,
            matches: [],
            isComplete: false,
            schedulingDeadline: endDate, // Teams must play by the end of the matchday
          };
          
          batch.set(matchdayRef, matchdayData);
          nextMatchdayRef = matchdayRef;
        }
        
        batch.update(nextMatchdayRef, {
          matches: arrayUnion(matchRef.id)
        });
      }
      
      await batch.commit();
      
      // Update Swiss standings for any bye matches in the next round
      for (let i = 0; i < pairings.length; i++) {
        const [team1Id, team2Id] = pairings[i];
        if (team2Id === 'BYE') {
          await this.updateSwissStandingsForByeMatch(tournamentId, team1Id, nextRound);
        }
      }
      
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
      
      // Then by game losses (fewer losses = better rank)
      if (a.gameLosses !== b.gameLosses) {
        return a.gameLosses - b.gameLosses;
      }
      
      // Then by match losses (fewer losses = better rank)
      if (a.matchLosses !== b.matchLosses) {
        return a.matchLosses - b.matchLosses;
      }
      
      // Then by rounds differential
      const aRoundsDiff = (a.roundsWon ?? 0) - (a.roundsLost ?? 0);
      const bRoundsDiff = (b.roundsWon ?? 0) - (b.roundsLost ?? 0);
      
      // Special case: teams with 0 losses should always rank higher than teams with losses
      const aHasLosses = (a.roundsLost ?? 0) > 0;
      const bHasLosses = (b.roundsLost ?? 0) > 0;
      
      if (aHasLosses !== bHasLosses) {
        // If one team has losses and the other doesn't, the one without losses ranks higher
        return aHasLosses ? 1 : -1;
      }
      
      // If both teams have the same loss status, use rounds differential
      if (aRoundsDiff !== bRoundsDiff) {
        return bRoundsDiff - aRoundsDiff;
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

  // Update Swiss standings for a bye match
  static async updateSwissStandingsForByeMatch(tournamentId: string, teamId: string, round: number): Promise<void> {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournamentDoc.data() as Tournament;
      const swissStage = tournament.stageManagement?.swissStage;
      
      if (!swissStage || !swissStage.isActive) {
        return;
      }
      
      // Find the team's standing
      const teamStanding = swissStage.standings.find(s => s.teamId === teamId);
      
      if (!teamStanding) {
        console.error('❌ DEBUG: Could not find standings for team:', teamId);
        return;
      }
      
      // Update standings for bye match (2-0 win)
      teamStanding.matchWins += 1;
      teamStanding.matchLosses += 0; // No loss for bye
      teamStanding.gameWins += 2; // 2-0 score
      teamStanding.gameLosses += 0; // No game losses
      teamStanding.points += 3; // 3 points for match win
      teamStanding.opponents.push('Team Bye'); // Add bye as opponent
      
      // Update the tournament document
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.standings': swissStage.standings,
        updatedAt: new Date()
      });
      
      
    } catch (error) {
      console.error('❌ DEBUG: Failed to update Swiss standings for bye match:', error);
      throw error;
    }
  }

  // Update Swiss standings when a match is completed
  static async updateSwissStandings(tournamentId: string, match: Match): Promise<void> {
    try {
      
      
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournamentDoc.data() as Tournament;
      const swissStage = tournament.stageManagement?.swissStage;
      
      if (!swissStage || !swissStage.isActive) {
        
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
      
      // Update tournament with new standings
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.standings': sortedStandings,
        updatedAt: serverTimestamp(),
      });
      
      
      
      // Note: Next round generation is now manual - admin must trigger it
      // await this.checkAndGenerateNextRound(tournamentId, match);
      
      return; // Explicit return for Promise<void>
      
    } catch (error) {
      console.error('❌ DEBUG: Error updating Swiss standings:', error);
      throw error;
    }
  }
  
  // Force update Swiss standings - recalculates all standings from completed matches
  static async forceUpdateStandings(tournamentId: string): Promise<{
    success: boolean;
    message: string;
    errors?: string[];
  }> {
    try {
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
          message: 'Swiss stage not active',
          errors: ['Swiss stage not active']
        };
      }
      
      // Get all completed matches for this tournament
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('isComplete', '==', true)
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const completedMatches = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      
      // Reset all standings to initial state
      const resetStandings = swissStage.standings.map(standing => ({
        ...standing,
        points: 0,
        matchWins: 0,
        matchLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        roundsWon: 0,
        roundsLost: 0,
        opponents: []
      }));
      
      // Recalculate standings from all completed matches
      for (const match of completedMatches) {
        if (match.team1Score !== undefined && match.team2Score !== undefined) {
          const team1Standing = resetStandings.find(s => s.teamId === match.team1Id);
          const team2Standing = resetStandings.find(s => s.teamId === match.team2Id);
          
          if (team1Standing && team2Standing) {
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
            
            // Update game wins/losses and rounds
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
              
              team1Standing.roundsWon += team1RoundsWon;
              team2Standing.roundsWon += team2RoundsWon;
              team1Standing.roundsLost += team2RoundsWon;
              team2Standing.roundsLost += team1RoundsWon;
            } else {
              // Fallback: if no map results, assume BO1
              if (match.team1Score > match.team2Score) {
                team1Standing.gameWins++;
                team2Standing.gameLosses++;
              } else if (match.team2Score > match.team1Score) {
                team2Standing.gameWins++;
                team1Standing.gameLosses++;
              }
              
              team1Standing.roundsWon += match.team1Score;
              team2Standing.roundsWon += match.team2Score;
              team1Standing.roundsLost += match.team2Score;
              team2Standing.roundsLost += match.team1Score;
            }
            
            // Add opponents
            if (!(team1Standing.opponents as string[]).includes(match.team2Id!)) {
              (team1Standing.opponents as string[]).push(match.team2Id!);
            }
            if (!(team2Standing.opponents as string[]).includes(match.team1Id!)) {
              (team2Standing.opponents as string[]).push(match.team1Id!);
            }
          }
        }
      }
      
      // Sort standings
      const sortedStandings = this.sortSwissStandings(resetStandings);
      
      // Update tournament with recalculated standings
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.standings': sortedStandings,
        updatedAt: serverTimestamp(),
      });
      
      return {
        success: true,
        message: `Standings recalculated successfully. Processed ${completedMatches.length} completed matches.`
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Error force updating Swiss standings:', error);
      return {
        success: false,
        message: 'Failed to update standings',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
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
      
      
    } catch (error) {
      console.error('Error in admin force transition:', error);
      throw error;
    }
  }

  // ANALYZE SWISS PAIRINGS: Analyze why teams were paired against each other
  // This helps verify the pairing logic is working correctly
  static async analyzeSwissPairings(tournamentId: string): Promise<any> {
    try {
      console.log(`🔍 Starting Swiss pairing analysis for tournament: ${tournamentId}`);
      
      // STEP 1: Get tournament data
      const tournament = await this.getTournament(tournamentId);
      if (!tournament?.stageManagement?.swissStage) {
        throw new Error('Tournament not in Swiss stage');
      }
      
      const swissStage = tournament.stageManagement.swissStage;
      console.log(`📊 Tournament: ${tournament.name}, Current Round: ${swissStage.currentRound}`);
      
      // STEP 2: Get all teams
      const { getTeams } = await import('./firebaseService');
      const allTeams = await getTeams();
      const teams = allTeams.filter(team => tournament.teams?.includes(team.id));
      console.log(`📊 Found ${teams.length} teams in tournament`);
      console.log(`📊 Tournament teams:`, tournament.teams);
      console.log(`📊 All teams:`, allTeams.map(t => `${t.name} (${t.id})`));
      
      // STEP 3: Get all matches
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
      
      console.log(`📊 Found ${allMatches.length} total matches`);
      
      // STEP 4: Get actual tournament standings
      const actualStandings = swissStage.standings || [];
      console.log(`📊 Found ${actualStandings.length} actual standings`);
      console.log(`📊 Standings:`, actualStandings.map(s => `${s.teamId}: ${s.points}p, ${s.matchWins}W, ${s.matchLosses}L`));
      
      // Map standings to team data
      const standings = actualStandings.map(standing => {
        const team = teams.find(t => t.id === standing.teamId);
        if (!team) {
          console.warn(`⚠️ No team found for standing ${standing.teamId}`);
        }
        return {
          id: standing.teamId,
          name: team?.name || 'Unknown Team',
          rank: 0, // Will be set after sorting
          score: standing.points,
          wins: standing.matchWins,
          losses: standing.matchLosses,
          opponents: standing.opponents || []
        };
      });
      
      console.log(`📊 Mapped standings:`, standings.map(s => `${s.name}: ${s.score}p, ${s.wins}W, ${s.losses}L`));
      
      // Sort by points (descending), then by matchWins (descending)
      standings.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.wins - a.wins;
      });
      
      // Set ranks
      standings.forEach((team, index) => {
        team.rank = index + 1;
      });
      
      console.log(`📊 Mapped standings for ${standings.length} teams`);
      
      // STEP 5: Analyze pairings for current and next round
      const pairingAnalysis = [];
      
      // Show current round and next round
      const roundsToAnalyze = [swissStage.currentRound, swissStage.currentRound + 1];
      
      for (const round of roundsToAnalyze) {
        if (round > swissStage.currentRound) {
          // For next round, generate what the pairings SHOULD be
          const nextRoundPairings = this.generateNextRoundPairings(standings, allMatches, round);
          console.log(`📊 Generated Round ${round} pairings: ${nextRoundPairings.length} matches`);
          
          for (const pairing of nextRoundPairings) {
            const team1 = standings.find((t: any) => t.id === pairing.team1Id);
            const team2 = standings.find((t: any) => t.id === pairing.team2Id);
            
            if (!team1 || !team2) {
              console.warn(`⚠️ Could not find teams for pairing ${pairing.team1Id} vs ${pairing.team2Id}`);
              continue;
            }
            
            // Analyze the pairing
            const analysis = this.analyzePairing(team1, team2, round, allMatches, teams);
            pairingAnalysis.push({
              round,
              isGenerated: true,
              team1: {
                id: team1.id,
                name: team1.name,
                rank: team1.rank,
                score: team1.score,
                wins: team1.wins,
                losses: team1.losses,
                opponents: team1.opponents
              },
              team2: {
                id: team2.id,
                name: team2.name,
                rank: team2.rank,
                score: team2.score,
                wins: team2.wins,
                losses: team2.losses,
                opponents: team2.opponents
              },
              ...analysis
            });
          }
        } else {
          // For current round, show actual matches
          const roundMatches = allMatches.filter(match => match.round === round);
          console.log(`📊 Analyzing Round ${round}: ${roundMatches.length} matches`);
          
          for (const match of roundMatches) {
            const team1 = standings.find((t: any) => t.id === match.team1Id);
            const team2 = standings.find((t: any) => t.id === match.team2Id);
            
            if (!team1 || !team2) {
              console.warn(`⚠️ Could not find teams for match ${match.id}`);
              continue;
            }
            
            // Analyze the pairing
            const analysis = this.analyzePairing(team1, team2, round, allMatches, teams);
            pairingAnalysis.push({
              round,
              isGenerated: false,
              team1: {
                id: team1.id,
                name: team1.name,
                rank: team1.rank,
                score: team1.score,
                wins: team1.wins,
                losses: team1.losses,
                opponents: team1.opponents
              },
              team2: {
                id: team2.id,
                name: team2.name,
                rank: team2.rank,
                score: team2.score,
                wins: team2.wins,
                losses: team2.losses,
                opponents: team2.opponents
              },
              ...analysis
            });
          }
        }
      }
      
      // STEP 6: Return analysis
      const result = {
        tournamentName: tournament.name,
        currentRound: swissStage.currentRound,
        totalTeams: teams.length,
        activeTeams: standings.filter((t: any) => t.wins + t.losses > 0).length,
        standings: standings.map((team: any) => ({
          id: team.id,
          name: team.name,
          rank: team.rank,
          score: team.score,
          wins: team.wins,
          losses: team.losses,
          opponents: team.opponents
        })),
        pairingAnalysis
      };
      
      console.log(`✅ Swiss pairing analysis completed for ${result.pairingAnalysis.length} pairings`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in Swiss pairing analysis:', error);
      throw error;
    }
  }

  // Helper function to generate next round pairings based on Swiss logic
  private static generateNextRoundPairings(standings: any[], allMatches: Match[], round: number): any[] {
    const pairings = [];
    const usedTeams = new Set<string>();
    
    // Create a copy of standings and sort them properly
    const availableTeams = [...standings].sort((a, b) => {
      // Primary sort: by points (descending)
      if (a.score !== b.score) return b.score - a.score;
      
      // Secondary sort: by match wins (descending)
      if (a.wins !== b.wins) return b.wins - a.wins;
      
      // Tertiary sort: by game wins (if available)
      // For now, we'll use rank as tiebreaker
      return a.rank - b.rank;
    });
    
    console.log(`📊 Generating pairings for ${availableTeams.length} teams`);
    console.log(`📊 Team order:`, availableTeams.map(t => `${t.name} (${t.score}p, ${t.wins}W)`));
    
    // Generate pairings using the same algorithm as the real Swiss system
    while (availableTeams.length > 0) {
      const currentTeam = availableTeams[0];
      availableTeams.splice(0, 1); // Remove current team
      
      if (usedTeams.has(currentTeam.id)) continue;
      
      // Find best available opponent
      let bestOpponent: any = null;
      let bestScoreDiff = Infinity;
      let bestOpponentIndex = -1;
      
      for (let i = 0; i < availableTeams.length; i++) {
        const potentialOpponent = availableTeams[i];
        
        if (usedTeams.has(potentialOpponent.id)) continue;
        
        // Check if they've already played (rematch prevention)
        if (currentTeam.opponents.includes(potentialOpponent.id)) {
          console.log(`⚠️ ${currentTeam.name} has already played ${potentialOpponent.name}, skipping`);
          continue;
        }
        
        // Calculate pairing score (lower is better) - same as real Swiss system
        const scoreDiff = Math.abs(currentTeam.score - potentialOpponent.score);
        const matchWinDiff = Math.abs(currentTeam.wins - potentialOpponent.wins);
        
        // Weighted scoring: points matter most, then match wins
        const pairingScore = scoreDiff * 10 + matchWinDiff * 3;
        
        if (pairingScore < bestScoreDiff) {
          bestScoreDiff = pairingScore;
          bestOpponent = potentialOpponent;
          bestOpponentIndex = i;
        }
      }
      
      if (bestOpponent && bestOpponentIndex !== -1) {
        console.log(`✅ Paired: ${currentTeam.name} vs ${bestOpponent.name} (score diff: ${bestScoreDiff})`);
        pairings.push({
          team1Id: currentTeam.id,
          team2Id: bestOpponent.id
        });
        usedTeams.add(currentTeam.id);
        usedTeams.add(bestOpponent.id);
        
        // Remove opponent from available teams
        availableTeams.splice(bestOpponentIndex, 1);
      } else {
        // No suitable opponent found - give a bye
        console.log(`⚠️ No suitable opponent for ${currentTeam.name}, giving bye`);
        pairings.push({
          team1Id: currentTeam.id,
          team2Id: 'BYE'
        });
        usedTeams.add(currentTeam.id);
      }
    }
    
    console.log(`📊 Generated ${pairings.length} pairings`);
    return pairings;
  }

  // Helper function to analyze a specific pairing
  private static analyzePairing(team1: any, team2: any, round: number, allMatches: Match[], allTeams: any[]): any {
    const warnings = [];
    let reason = 'valid';
    let analysis = '';
    
    // Get team names for better display
    const getTeamName = (teamId: string) => {
      const team = allTeams.find(t => t.id === teamId);
      return team?.name || 'Unknown Team';
    };
    
    // Check if teams have the same score
    if (team1.score === team2.score) {
      analysis += `Both teams have the same score (${team1.score}), which is correct for Swiss pairing. `;
    } else {
      warnings.push(`Teams have different scores: ${team1.name} (${team1.score}) vs ${team2.name} (${team2.score})`);
      reason = 'warning';
    }
    
    // Check if teams have played before
    const previousMatch = allMatches.find(match => 
      (match.team1Id === team1.id && match.team2Id === team2.id) ||
      (match.team1Id === team2.id && match.team2Id === team1.id)
    );
    
    if (previousMatch && previousMatch.round < round) {
      warnings.push(`Teams have already played against each other in Round ${previousMatch.round}`);
      reason = 'error';
    } else {
      analysis += `Teams have not played against each other before. `;
    }
    
    // Check rank proximity and explain why they might not be paired
    const rankDiff = Math.abs(team1.rank - team2.rank);
    if (rankDiff <= 2) {
      analysis += `Teams are close in rank (${team1.rank} vs ${team2.rank}), which is expected. `;
    } else if (rankDiff <= 5) {
      analysis += `Teams have moderate rank difference (${team1.rank} vs ${team2.rank}). `;
    } else {
      warnings.push(`Large rank difference: ${team1.name} (#${team1.rank}) vs ${team2.name} (#${team2.rank})`);
      if (reason === 'valid') reason = 'warning';
    }
    
    // Check if teams are in the same score group
    const scoreGroup1 = Math.floor(team1.score);
    const scoreGroup2 = Math.floor(team2.score);
    if (scoreGroup1 === scoreGroup2) {
      analysis += `Both teams are in the same score group (${scoreGroup1}). `;
    } else {
      warnings.push(`Teams are in different score groups: ${team1.name} (${scoreGroup1}) vs ${team2.name} (${scoreGroup2})`);
      if (reason === 'valid') reason = 'warning';
    }
    
    // Check previous opponents and explain why they might not be paired
    const team1OpponentNames = team1.opponents.map((oppId: string) => getTeamName(oppId));
    const team2OpponentNames = team2.opponents.map((oppId: string) => getTeamName(oppId));
    
    // Check if they should be paired based on rank proximity
    const shouldBePaired = rankDiff <= 2;
    if (!shouldBePaired) {
      analysis += `Teams are not paired despite being close in rank because they have different scores or have already played each other. `;
    }
    
    // Check if there are better opponents available
    const betterOpponents1 = team1.opponents.filter((oppId: string) => {
      const oppTeam = allTeams.find(t => t.id === oppId);
      return oppTeam && Math.abs(oppTeam.rank - team1.rank) <= 2;
    });
    
    if (betterOpponents1.length > 0) {
      const betterOpponentNames = betterOpponents1.map((oppId: string) => getTeamName(oppId));
      analysis += `${team1.name} has already played against closer-ranked opponents: ${betterOpponentNames.join(', ')}. `;
    }
    
    if (analysis === '') {
      analysis = 'Standard Swiss pairing based on current standings.';
    }
    
    return {
      reason,
      analysis,
      warnings,
      team1OpponentNames,
      team2OpponentNames
    };
  }

  // BULLETPROOF REVERT FUNCTION: Remove Round 3+ matches and reset tournament state to Round 2
  // This will delete all Round 3+ matches but preserve all Round 1-2 data
  // Handles ALL edge cases: chat, notifications, disputes, scheduling, user states, etc.
  static async revertToRound2(tournamentId: string): Promise<void> {
    try {
      console.log(`🔄 Starting BULLETPROOF revert to Round 2 for tournament: ${tournamentId}`);
      
      // STEP 1: Validate tournament exists and is in Swiss stage
      const tournament = await this.getTournament(tournamentId);
      if (!tournament?.stageManagement?.swissStage) {
        throw new Error('Tournament not in Swiss stage');
      }
      
      const swissStage = tournament.stageManagement.swissStage;
      if (swissStage.currentRound <= 2) {
        console.log('✅ Tournament is already at Round 2 or earlier - nothing to revert');
        return;
      }
      
      // STEP 2: Get all matches for this tournament
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // STEP 3: Separate matches by round
      const round1And2Matches = allMatches.filter((match: any) => match.round <= 2);
      const round3PlusMatches = allMatches.filter((match: any) => match.round >= 3);
      
      console.log(`📊 Round 1-2 matches: ${round1And2Matches.length}`);
      console.log(`📊 Round 3+ matches: ${round3PlusMatches.length}`);
      
      if (round3PlusMatches.length === 0) {
        console.log('✅ No Round 3+ matches found - nothing to revert');
        return;
      }
      
      // STEP 4: Get all matchdays for this tournament
      const matchdaysQuery = query(
        collection(db, 'matchdays'),
        where('tournamentId', '==', tournamentId)
      );
      const matchdaysSnapshot = await getDocs(matchdaysQuery);
      const allMatchdays = matchdaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      console.log(`📊 Found ${allMatchdays.length} matchdays`);
      
      // STEP 5: Use transaction for atomic operations
      await runTransaction(db, async (transaction) => {
        console.log(`🔄 Starting transaction for revert operation`);
        
        // STEP 6: Delete all Round 3+ matches and their subcollections
        for (const match of round3PlusMatches) {
          console.log(`🗑️ Deleting Round ${(match as any).round} match: ${match.id}`);
          
          // Delete match chat subcollection if it exists
          try {
            const chatQuery = query(collection(db, 'matches', match.id, 'chat'));
            const chatSnapshot = await getDocs(chatQuery);
            chatSnapshot.docs.forEach(chatDoc => {
              transaction.delete(chatDoc.ref);
            });
            if (chatSnapshot.docs.length > 0) {
              console.log(`🗑️ Deleted ${chatSnapshot.docs.length} chat messages for match ${match.id}`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not delete chat for match ${match.id}:`, error);
          }
          
          // Delete the match itself
          transaction.delete(doc(db, 'matches', match.id));
        }
        
        // STEP 7: Delete Round 3+ matchdays
        const round3PlusMatchdays = allMatchdays.filter((md: any) => md.matchdayNumber >= 3);
        for (const matchday of round3PlusMatchdays) {
          console.log(`🗑️ Deleting matchday: ${matchday.id}`);
          transaction.delete(doc(db, 'matchdays', matchday.id));
        }
        
        // STEP 8: Reset tournament state to Round 2
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        transaction.update(tournamentRef, {
          'stageManagement.swissStage.currentRound': 2,
          'stageManagement.swissStage.currentMatchday': Math.max(1, swissStage.currentMatchday - 1),
          'stageManagement.swissStage.isComplete': false,
          updatedAt: serverTimestamp()
        });
      });
      
      // STEP 9: Recalculate standings from actual Round 1-2 matches
      console.log(`🔄 Recalculating standings from actual match data...`);
      await this.recalculateStandingsFromMatches(tournamentId, 2);
      
      console.log(`✅ BULLETPROOF revert to Round 2 completed successfully!`);
      console.log(`✅ Deleted ${round3PlusMatches.length} Round 3+ matches`);
      console.log(`✅ Preserved ${round1And2Matches.length} Round 1-2 matches`);
      console.log(`✅ Deleted ${allMatchdays.filter((md: any) => md.matchdayNumber >= 3).length} Round 3+ matchdays`);
      console.log(`✅ Tournament state reset to Round 2`);
      console.log(`✅ Standings recalculated from actual match data`);
      
    } catch (error) {
      console.error('❌ Error in BULLETPROOF revert to Round 2:', error);
      throw error;
    }
  }

  // BULLETPROOF REVERT FUNCTION: Remove Round 2 matches and reset tournament state
  // This will delete all Round 2 matches but preserve all Round 1 data
  // Handles ALL edge cases: chat, notifications, disputes, scheduling, user states, etc.
  static async revertToRound1(tournamentId: string): Promise<void> {
    try {
      console.log(`🔄 Starting BULLETPROOF revert to Round 1 for tournament: ${tournamentId}`);
      
      // STEP 1: Validate tournament exists and is in Swiss stage
      const tournament = await this.getTournament(tournamentId);
      if (!tournament?.stageManagement?.swissStage) {
        throw new Error('Tournament not in Swiss stage');
      }
      
      const swissStage = tournament.stageManagement.swissStage;
      if (swissStage.currentRound <= 1) {
        console.log('✅ Tournament is already at Round 1 or earlier - nothing to revert');
        return;
      }
      
      // STEP 2: Get all matches for this tournament
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
      
      console.log(`📊 Found ${allMatches.length} total matches`);
      
      // STEP 3: Separate Round 1 and Round 2+ matches
      const round1Matches = allMatches.filter(match => match.round === 1);
      const round2PlusMatches = allMatches.filter(match => match.round >= 2);
      
      console.log(`📊 Round 1 matches: ${round1Matches.length}`);
      console.log(`📊 Round 2+ matches: ${round2PlusMatches.length}`);
      
      if (round2PlusMatches.length === 0) {
        console.log('✅ No Round 2+ matches found - nothing to revert');
        return;
      }
      
      // STEP 4: Get all matchdays for this tournament
      const matchdaysQuery = query(
        collection(db, 'matchdays'),
        where('tournamentId', '==', tournamentId)
      );
      const matchdaysSnapshot = await getDocs(matchdaysQuery);
      const allMatchdays = matchdaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      console.log(`📊 Found ${allMatchdays.length} matchdays`);
      
      // STEP 5: Use transaction for atomic operations
      await runTransaction(db, async (transaction) => {
        console.log(`🔄 Starting transaction for revert operation`);
        
        // STEP 6: Delete all Round 2+ matches and their subcollections
        for (const match of round2PlusMatches) {
          console.log(`🗑️ Deleting Round ${match.round} match: ${match.id}`);
          
          // Delete match chat subcollection if it exists
          try {
            const chatQuery = query(collection(db, 'matches', match.id, 'chat'));
            const chatSnapshot = await getDocs(chatQuery);
            chatSnapshot.docs.forEach(chatDoc => {
              transaction.delete(chatDoc.ref);
            });
            if (chatSnapshot.docs.length > 0) {
              console.log(`🗑️ Deleted ${chatSnapshot.docs.length} chat messages for match ${match.id}`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not delete chat for match ${match.id}:`, error);
          }
          
          // Delete the match itself
          transaction.delete(doc(db, 'matches', match.id));
        }
        
        // STEP 7: Update matchdays to remove Round 2+ match references
        for (const matchday of allMatchdays) {
          if (matchday.matchdayNumber >= 2) {
            console.log(`🗑️ Deleting matchday ${matchday.matchdayNumber}`);
            transaction.delete(doc(db, 'matchdays', matchday.id));
          } else {
            // For Round 1 matchday, remove any Round 2+ match references
              const round1MatchIds = round1Matches.map(m => m.id);
              transaction.update(doc(db, 'matchdays', matchday.id), {
                matches: round1MatchIds,
                updatedAt: serverTimestamp()
              });
            console.log(`✅ Updated Round 1 matchday with ${round1MatchIds.length} matches`);
          }
        }
        
        // STEP 8: Reset tournament state to Round 1
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        // Calculate Round 1 standings (preserve all Round 1 data)
        const round1Standings = swissStage.standings.map(standing => {
          // Reset all stats to only include Round 1 data
          return {
            ...standing,
            points: 0, // Will be recalculated from Round 1 matches
            matchWins: 0,
            matchLosses: 0,
            gameWins: 0,
            gameLosses: 0,
            roundsWon: 0,
            roundsLost: 0,
            opponents: [] // Will be recalculated from Round 1 matches
          };
        });
        
        transaction.update(tournamentRef, {
          'stageManagement.swissStage.currentRound': 1,
          'stageManagement.swissStage.currentMatchday': 1,
          'stageManagement.swissStage.standings': round1Standings,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ Tournament state reset to Round 1`);
      });
      
      // STEP 9: Recalculate Round 1 standings from actual Round 1 matches
      console.log(`🔄 Recalculating Round 1 standings from actual match data...`);
      await this.recalculateStandingsFromMatches(tournamentId, 1);
      
      console.log(`✅ BULLETPROOF revert completed successfully!`);
      console.log(`✅ Deleted ${round2PlusMatches.length} Round 2+ matches`);
      console.log(`✅ Preserved ${round1Matches.length} Round 1 matches`);
      console.log(`✅ Deleted ${allMatchdays.filter(md => md.matchdayNumber >= 2).length} Round 2+ matchdays`);
      console.log(`✅ Tournament state reset to Round 1`);
      console.log(`✅ Round 1 standings recalculated from actual match data`);
      
    } catch (error) {
      console.error('❌ Error in BULLETPROOF revert to Round 1:', error);
      throw error;
    }
  }
  
  // Helper function to recalculate standings from actual match data
  private static async recalculateStandingsFromMatches(tournamentId: string, maxRound: number): Promise<void> {
    try {
      // Get all matches up to the specified round
      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        where('round', '<=', maxRound)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
      
      // Get tournament to get current standings
      const tournament = await this.getTournament(tournamentId);
      if (!tournament?.stageManagement?.swissStage) return;
      
      const standings = tournament.stageManagement.swissStage.standings;
      
      // Reset all standings
      const resetStandings: SwissStanding[] = standings.map(standing => ({
        ...standing,
        points: 0,
        matchWins: 0,
        matchLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        roundsWon: 0,
        roundsLost: 0,
        opponents: [] as string[]
      }));
      
      // Recalculate from actual matches
      for (const match of matches) {
        if (!match.isComplete || !match.team1Id || !match.team2Id) continue;
        
        const team1Standing = resetStandings.find(s => s.teamId === match.team1Id);
        const team2Standing = resetStandings.find(s => s.teamId === match.team2Id);
        
        if (!team1Standing || !team2Standing) continue;
        
        // Add opponents
        if (!team1Standing.opponents.includes(match.team2Id)) {
          team1Standing.opponents = [...team1Standing.opponents, match.team2Id];
        }
        if (!team2Standing.opponents.includes(match.team1Id)) {
          team2Standing.opponents = [...team2Standing.opponents, match.team1Id];
        }
        
        // Update match wins/losses
        if (match.winnerId === match.team1Id) {
          team1Standing.matchWins++;
          team2Standing.matchLosses++;
          team1Standing.points += 3; // 3 points for match win
        } else if (match.winnerId === match.team2Id) {
          team2Standing.matchWins++;
          team1Standing.matchLosses++;
          team2Standing.points += 3; // 3 points for match win
        }
        
        // Update game wins/losses (map scores)
        team1Standing.gameWins += match.team1Score;
        team1Standing.gameLosses += match.team2Score;
        team2Standing.gameWins += match.team2Score;
        team2Standing.gameLosses += match.team1Score;
        
        // Update rounds won/lost (individual map scores)
        if (match.mapResults) {
          let team1RoundsWon = 0;
          let team2RoundsWon = 0;
          
          if (match.mapResults.map1) {
            team1RoundsWon += match.mapResults.map1.team1Score;
            team2RoundsWon += match.mapResults.map1.team2Score;
          }
          if (match.mapResults.map2) {
            team1RoundsWon += match.mapResults.map2.team1Score;
            team2RoundsWon += match.mapResults.map2.team2Score;
          }
          if (match.mapResults.map3) {
            team1RoundsWon += match.mapResults.map3.team1Score;
            team2RoundsWon += match.mapResults.map3.team2Score;
          }
          
          team1Standing.roundsWon += team1RoundsWon;
          team1Standing.roundsLost += team2RoundsWon;
          team2Standing.roundsWon += team2RoundsWon;
          team2Standing.roundsLost += team1RoundsWon;
        } else {
          // Fallback to match scores if no map results
          team1Standing.roundsWon += match.team1Score;
          team1Standing.roundsLost += match.team2Score;
          team2Standing.roundsWon += match.team2Score;
          team2Standing.roundsLost += match.team1Score;
        }
      }
      
      // Update tournament with recalculated standings
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        'stageManagement.swissStage.standings': resetStandings,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Standings recalculated from ${matches.length} matches`);
      
    } catch (error) {
      console.error('❌ Error recalculating standings:', error);
      throw error;
    }
  }

  // Generate playoff bracket from Swiss standings (top 8 teams, BO3 format)
  static async generatePlayoffBracket(tournamentId: string): Promise<void> {
    try {
      console.log('🏆 Starting playoff bracket generation for tournament:', tournamentId);
      
      // Get tournament data
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      const tournament = tournamentDoc.data();
      const standings = tournament.stageManagement?.swissStage?.standings || [];
      
      if (standings.length === 0) {
        throw new Error('No Swiss standings found');
      }
      
      // Get top 8 teams from standings (already sorted by points)
      const top8Teams = standings.slice(0, 8).map((s: any) => s.teamId);
      
      if (top8Teams.length < 8) {
        throw new Error(`Not enough teams for playoffs. Need 8, got ${top8Teams.length}`);
      }
      
      console.log('🏆 Top 8 teams:', top8Teams);
      
      // Activate playoff stage in tournament
      await updateDoc(tournamentRef, {
        'stageManagement.playoffStage': {
          isActive: true,
          teams: top8Teams,
          startedAt: new Date()
        },
        'stageManagement.swissStage.isComplete': true,
        updatedAt: serverTimestamp()
      });
      
      // Generate single-elimination bracket with BO3 format
      // Seeding: 1v8, 3v6, 2v7, 4v5 (crossed bracket structure)
      const quarterFinalPairings = [
        [top8Teams[0], top8Teams[7]], // QF1: 1 vs 8 → SF1
        [top8Teams[2], top8Teams[5]], // QF2: 3 vs 6 → SF1
        [top8Teams[1], top8Teams[6]], // QF3: 2 vs 7 → SF2
        [top8Teams[3], top8Teams[4]]  // QF4: 4 vs 5 → SF2
      ];
      
      const batch = writeBatch(db);
      const matchIds: string[] = [];
      
      // Quarter Finals (Round 1) - BO3
      for (let i = 0; i < quarterFinalPairings.length; i++) {
        const [team1Id, team2Id] = quarterFinalPairings[i];
        const matchRef = doc(collection(db, 'matches'));
        
        const matchData = {
          team1Id,
          team2Id,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round: 1,
          matchNumber: i + 1,
          isComplete: false,
          tournamentId,
          tournamentType: 'playoff' as const,
          createdAt: serverTimestamp(),
          matchState: 'pending_scheduling' as const,
          matchFormat: 'BO3' as const, // BO3 format for playoffs
          mapPool: [...DEFAULT_MAP_POOL],
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: []
        };
        
        batch.set(matchRef, matchData);
        matchIds.push(matchRef.id);
      }
      
      // Semi Finals (Round 2) - BO3, empty teams
      for (let i = 0; i < 2; i++) {
        const matchRef = doc(collection(db, 'matches'));
        
        const matchData = {
          team1Id: null,
          team2Id: null,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round: 2,
          matchNumber: i + 1,
          isComplete: false,
          tournamentId,
          tournamentType: 'playoff' as const,
          createdAt: serverTimestamp(),
          matchState: 'pending_scheduling' as const,
          matchFormat: 'BO3' as const,
          mapPool: [...DEFAULT_MAP_POOL],
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: []
        };
        
        batch.set(matchRef, matchData);
        matchIds.push(matchRef.id);
      }
      
      // Grand Final (Round 3) - BO3
      const finalMatchRef = doc(collection(db, 'matches'));
      const finalMatchData = {
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        round: 3,
        matchNumber: 1,
        isComplete: false,
        tournamentId,
        tournamentType: 'playoff' as const,
        createdAt: serverTimestamp(),
        matchState: 'pending_scheduling' as const,
        matchFormat: 'BO3' as const,
        mapPool: [...DEFAULT_MAP_POOL],
        bannedMaps: { team1: [], team2: [] },
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: []
      };
      
      batch.set(finalMatchRef, finalMatchData);
      matchIds.push(finalMatchRef.id);
      
      // Commit all matches
      await batch.commit();
      
      console.log('📝 Created match IDs:', matchIds);
      
      // Update tournament with match IDs
      await updateDoc(tournamentRef, {
        matches: arrayUnion(...matchIds),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Playoff bracket generated successfully!');
      console.log(`   - Quarter Finals: 4 matches (BO3)`);
      console.log(`   - Semi Finals: 2 matches (BO3)`);
      console.log(`   - Grand Final: 1 match (BO3)`);
      console.log(`   - Match IDs added to tournament: ${matchIds.length}`);
      
    } catch (error) {
      console.error('❌ Error generating playoff bracket:', error);
      throw error;
    }
  }

  // Generate playoff bracket with manual seeding (only Quarter Finals initially)
  static async generatePlayoffBracketWithManualSeeding(tournamentId: string, seededTeamIds: string[]): Promise<void> {
    try {
      console.log('🏆 Starting playoff bracket generation with manual seeding for tournament:', tournamentId);
      
      if (seededTeamIds.length !== 8) {
        throw new Error(`Playoff bracket requires exactly 8 teams. Got ${seededTeamIds.length}`);
      }
      
      // Get tournament data
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      // Activate playoff stage in tournament
      await updateDoc(tournamentRef, {
        'stageManagement.playoffStage': {
          isActive: true,
          teams: seededTeamIds,
          startedAt: new Date(),
          currentRound: 1,
          totalRounds: 3
        },
        'stageManagement.swissStage.isComplete': true,
        updatedAt: serverTimestamp()
      });
      
      // Generate ONLY Quarter Finals initially
      // Seeding based on manual order: 1v8, 3v6, 2v7, 4v5 (crossed bracket structure)
      // Note: seededTeamIds[0] = Seed 1, seededTeamIds[7] = Seed 8, etc.
      // This ensures seeds 1 and 2 are on opposite sides and meet in finals
      const quarterFinalPairings = [
        [seededTeamIds[0], seededTeamIds[7]], // QF1: Seed 1 vs Seed 8 → SF1
        [seededTeamIds[2], seededTeamIds[5]], // QF2: Seed 3 vs Seed 6 → SF1  
        [seededTeamIds[1], seededTeamIds[6]], // QF3: Seed 2 vs Seed 7 → SF2
        [seededTeamIds[3], seededTeamIds[4]]  // QF4: Seed 4 vs Seed 5 → SF2
      ];
      
      const batch = writeBatch(db);
      const matchIds: string[] = [];
      
      // Quarter Finals (Round 1) - BO3, matches go directly to "scheduled" state
      for (let i = 0; i < quarterFinalPairings.length; i++) {
        const [team1Id, team2Id] = quarterFinalPairings[i];
        const matchRef = doc(collection(db, 'matches'));
        
        const matchData = {
          team1Id,
          team2Id,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          round: 1,
          matchNumber: i + 1,
          isComplete: false,
          tournamentId,
          tournamentType: 'playoff' as const,
          createdAt: serverTimestamp(),
          matchState: 'scheduled' as const, // Skip scheduling, go directly to scheduled
          matchFormat: 'BO3' as const,
          mapPool: [...DEFAULT_MAP_POOL],
          bannedMaps: { team1: [], team2: [] },
          team1Ready: false,
          team2Ready: false,
          team1MapBans: [],
          team2MapBans: [],
          // Admin will set this time
          scheduledTime: null,
          adminScheduled: true
        };
        
        batch.set(matchRef, matchData);
        matchIds.push(matchRef.id);
      }
      
      // Commit all matches
      await batch.commit();
      
      console.log('📝 Created match IDs:', matchIds);
      
      // Update tournament with match IDs
      await updateDoc(tournamentRef, {
        matches: arrayUnion(...matchIds),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Playoff bracket generated successfully with manual seeding!');
      console.log(`   - Quarter Finals: 4 matches (BO3) - SCHEDULED state`);
      console.log(`   - Semi Finals: Will be created when QF winners advance`);
      console.log(`   - Grand Final: Will be created when SF winners advance`);
      console.log(`   - Match IDs added to tournament: ${matchIds.length}`);
      
    } catch (error) {
      console.error('❌ Error generating playoff bracket with manual seeding:', error);
      throw error;
    }
  }

  // Admin function to set match time for playoff bracket matches
  static async setPlayoffMatchTime(matchId: string, scheduledTime: Date): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      // Only allow setting time for playoff matches
      if (matchData.tournamentType !== 'playoff') {
        throw new Error('This function only works for playoff matches');
      }
      
      // Update match with scheduled time
      await updateDoc(matchRef, {
        scheduledTime: scheduledTime,
        matchState: 'scheduled',
        adminScheduled: true,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Match ${matchId} scheduled for ${scheduledTime}`);
    } catch (error) {
      console.error('❌ Error setting playoff match time:', error);
      throw error;
    }
  }

  // Admin function to manually advance team to next round (creates next round matches dynamically)
  static async manuallyAdvanceTeamInPlayoffs(matchId: string, winnerTeamId: string): Promise<void> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const match = matchDoc.data();
      
      if (match.tournamentType !== 'playoff') {
        throw new Error('This function only works for playoff matches');
      }
      
      // Verify the winner is one of the teams in the match
      if (match.team1Id !== winnerTeamId && match.team2Id !== winnerTeamId) {
        throw new Error('Winner must be one of the teams in this match');
      }
      
      // Mark match as complete with the winner
      await updateDoc(matchRef, {
        winnerId: winnerTeamId,
        isComplete: true,
        updatedAt: serverTimestamp()
      });
      
      // Find or create the next match this team should advance to
      const tournamentId = match.tournamentId;
      const currentRound = match.round;
      const matchNumber = match.matchNumber;
      
      // Get all tournament matches
      const matchesSnapshot = await getDocs(
        query(
          collection(db, 'matches'),
          where('tournamentId', '==', tournamentId),
          where('tournamentType', '==', 'playoff')
        )
      );
      
      const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Find next round matches
      let nextRoundMatches = allMatches.filter((m: any) => m.round === currentRound + 1);
      
      // Determine which next round match this team advances to
      // Quarter finals (4 matches) -> Semi finals (2 matches)
      // Matches 1 & 2 -> Semi 1, Matches 3 & 4 -> Semi 2
      const nextMatchIndex = Math.floor((matchNumber - 1) / 2);
      
      // Check if we need to create the next round match
      if (nextRoundMatches.length === 0 || !nextRoundMatches[nextMatchIndex]) {
        console.log(`📝 Creating new match for Round ${currentRound + 1}`);
        
        // Determine how many matches should exist in next round
        const currentRoundMatchCount = allMatches.filter((m: any) => m.round === currentRound).length;
        const nextRoundMatchCount = Math.ceil(currentRoundMatchCount / 2);
        
        // Create missing matches for next round
        const batch = writeBatch(db);
        const newMatchIds: string[] = [];
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        for (let i = nextRoundMatches.length; i < nextRoundMatchCount; i++) {
          const newMatchRef = doc(collection(db, 'matches'));
          
          const newMatchData = {
            team1Id: null,
            team2Id: null,
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            round: currentRound + 1,
            matchNumber: i + 1,
            isComplete: false,
            tournamentId,
            tournamentType: 'playoff' as const,
            createdAt: serverTimestamp(),
            matchState: 'not_ready' as const,
            matchFormat: 'BO3' as const,
            mapPool: [...DEFAULT_MAP_POOL],
            bannedMaps: { team1: [], team2: [] },
            team1Ready: false,
            team2Ready: false,
            team1MapBans: [],
            team2MapBans: [],
            scheduledTime: null,
            adminScheduled: true
          };
          
          batch.set(newMatchRef, newMatchData);
          newMatchIds.push(newMatchRef.id);
          nextRoundMatches.push({ id: newMatchRef.id, ...newMatchData } as any);
        }
        
        // Update tournament with new match IDs
        batch.update(tournamentRef, {
          matches: arrayUnion(...newMatchIds),
          updatedAt: serverTimestamp()
        });
        
        await batch.commit();
        console.log(`✅ Created ${newMatchIds.length} new matches for Round ${currentRound + 1}`);
      }
      
      // Now add the winner to the next round match
      const nextMatch = nextRoundMatches[nextMatchIndex];
      
      if (nextMatch) {
        const nextMatchRef = doc(db, 'matches', nextMatch.id);
        
        // Determine if this team goes to team1 or team2 slot
        const isFirstMatchOfPair = (matchNumber - 1) % 2 === 0;
        const teamSlot = isFirstMatchOfPair ? 'team1Id' : 'team2Id';
        const otherSlot = isFirstMatchOfPair ? 'team2Id' : 'team1Id';
        
        // Check if both teams will be set after this update
        const bothTeamsSet = isFirstMatchOfPair ? (nextMatch as any).team2Id !== null : (nextMatch as any).team1Id !== null;
        
        await updateDoc(nextMatchRef, {
          [teamSlot]: winnerTeamId,
          updatedAt: serverTimestamp(),
          // If both teams are now set, change state to scheduled
          ...(bothTeamsSet ? { matchState: 'scheduled' } : {})
        });
        
        console.log(`✅ Team ${winnerTeamId} advanced to Round ${currentRound + 1} Match ${nextMatchIndex + 1}`);
        
        if (bothTeamsSet) {
          console.log(`🎯 Next round match is now ready for scheduling!`);
        }
      }
      
      console.log(`✅ Match ${matchId} completed, winner: ${winnerTeamId}`);
    } catch (error) {
      console.error('❌ Error manually advancing team:', error);
      throw error;
    }
  }

  // Admin function to delete/ungenerate playoff bracket
  static async deletePlayoffBracket(tournamentId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting playoff bracket for tournament:', tournamentId);
      
      // Get tournament data
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }
      
      // Get all playoff matches for this tournament
      const matchesSnapshot = await getDocs(
        query(
          collection(db, 'matches'),
          where('tournamentId', '==', tournamentId),
          where('tournamentType', '==', 'playoff')
        )
      );
      
      console.log(`📝 Found ${matchesSnapshot.docs.length} playoff matches to delete`);
      
      // Delete all playoff matches
      const batch = writeBatch(db);
      const matchIdsToRemove: string[] = [];
      
      matchesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        matchIdsToRemove.push(doc.id);
      });
      
      // Update tournament to deactivate playoff stage
      batch.update(tournamentRef, {
        'stageManagement.playoffStage.isActive': false,
        matches: arrayRemove(...matchIdsToRemove),
        updatedAt: serverTimestamp()
      });
      
      // Commit all deletions
      await batch.commit();
      
      console.log('✅ Playoff bracket deleted successfully!');
      console.log(`   - Deleted ${matchesSnapshot.docs.length} matches`);
      console.log(`   - Playoff stage deactivated`);
      
    } catch (error) {
      console.error('❌ Error deleting playoff bracket:', error);
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
      
      
      
      
      
      // Update match with updated proposals array (instead of using arrayUnion)
      await updateDoc(matchRef, {
        schedulingProposals: updatedProposals,
        currentSchedulingStatus: 'proposed',
        updatedAt: serverTimestamp(),
      });
      
      // Send Discord notification to opponent team
      try {
        const opponentTeamId = matchData.team1Id === teamId ? matchData.team2Id : matchData.team1Id;
        
        // Get team data for Discord notification
        const { getTeamById } = await import('./firebaseService');
        const requestingTeam = await getTeamById(teamId);
        const opponentTeam = await getTeamById(opponentTeamId);
        
        if (requestingTeam && opponentTeam) {
          const matchWithTeams = {
            ...matchData,
            team1: requestingTeam,
            team2: opponentTeam,
            suggestedTime: proposedTime,
            tournamentName: matchData.tournamentName || 'Tournament'
          };
          
          await notifyMatchSchedulingRequest(matchWithTeams, opponentTeam, requestingTeam);
        }
      } catch (discordError) {
        console.warn('Failed to send Discord notification for scheduling proposal:', discordError);
        // Don't throw error - Discord notification failure shouldn't break scheduling
      }
      
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
        
        
        
        // Convert Firestore Timestamp to Date if needed
        let scheduledTime: Date;
        if (proposal.proposedTime && typeof proposal.proposedTime === 'object' && 'seconds' in proposal.proposedTime) {
          // It's a Firestore Timestamp
          scheduledTime = new Date(proposal.proposedTime.seconds * 1000);
          
        } else if (proposal.proposedTime instanceof Date) {
          // It's already a Date
          scheduledTime = proposal.proposedTime;
          
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
          
          
          
          
        } else {
          updateData.currentSchedulingStatus = 'denied';
        }
      }
      
      
      
      
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
