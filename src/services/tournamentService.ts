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
  TournamentType, 
  TournamentStatus,
  TournamentFormat,
  TournamentRules,
  RegistrationRequirements,
  TournamentSchedule,
  PrizePool,
  TournamentStats,
  SeedingMethod,
  TournamentStage,
  Match,
  Team
} from '../types/tournament';
import { checkUserInDiscordServer } from './discordService';
import { getUserById } from './firebaseService';
import { 
  generateSingleEliminationBracket, 
  generateDoubleEliminationBracket 
} from './firebaseService';

// Helper function to retry Firebase operations
const retryOperation = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Firebase operation failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
};

// Tournament Creation
export const createTournament = async (tournamentData: Partial<Tournament>, adminId: string): Promise<string> => {
  try {
    console.log('🚀 DEBUG: createTournament called with:', { tournamentData, adminId });

    // Validate required fields
    if (!tournamentData.name?.trim()) {
      throw new Error('Tournament name is required');
    }

    if (!tournamentData.description?.trim()) {
      throw new Error('Tournament description is required');
    }

    if (!tournamentData.format?.teamCount) {
      throw new Error('Number of teams is required');
    }

    // Create the tournament document
    const tournamentRef = await addDoc(collection(db, 'tournaments'), {
      ...tournamentData,
      status: 'registration',
      createdAt: new Date(),
      createdBy: adminId,
      adminIds: [adminId],
      teams: [],
      waitlist: [],
      rejectedTeams: [],
      stats: {
        registrationCount: 0,
        completedMatches: 0,
        totalMatches: 0,
        averageMatchDuration: 0,
        disputeCount: 0,
        forfeitCount: 0,
        viewershipPeak: 0,
        totalViewership: 0,
        completionRate: 0,
      },
      seeding: {
        method: 'random',
        rankings: [],
      },
      brackets: {},
      matches: [],
    });

    const tournamentId = tournamentRef.id;
    console.log('✅ DEBUG: Tournament created with ID:', tournamentId);

    // Generate brackets based on tournament type
    if (tournamentData.format?.type === 'double-elimination') {
      console.log('🔍 DEBUG: Generating double elimination bracket for tournament:', tournamentId);
      // For double elimination, we'll generate brackets when teams register
      // The bracket generation will happen when the tournament starts
    } else {
      console.log('🔍 DEBUG: Single elimination tournament - brackets will be generated when tournament starts');
    }

    return tournamentId;
  } catch (error) {
    console.error('❌ DEBUG: Error creating tournament:', error);
    throw error;
  }
};

// Tournament Management
export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Handle date conversions
    if (updates.schedule) {
      updateData.schedule = {
        ...updates.schedule,
        startDate: Timestamp.fromDate(updates.schedule.startDate),
        endDate: Timestamp.fromDate(updates.schedule.endDate),
        blackoutDates: updates.schedule.blackoutDates.map(date => Timestamp.fromDate(date)),
      };
    }

    if (updates.requirements?.registrationDeadline) {
      updateData.requirements = {
        ...updates.requirements,
        registrationDeadline: Timestamp.fromDate(updates.requirements.registrationDeadline),
      };
    }

    await updateDoc(tournamentRef, updateData);
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw new Error('Failed to update tournament');
  }
};

export const deleteTournament = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await deleteDoc(tournamentRef);
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw new Error('Failed to delete tournament');
  }
};

// Tournament Retrieval
export const getTournament = async (tournamentId: string): Promise<Tournament | null> => {
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
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      publishedAt: data.publishedAt?.toDate(),
      schedule: {
        ...data.schedule,
        startDate: data.schedule?.startDate?.toDate() || new Date(),
        endDate: data.schedule?.endDate?.toDate() || new Date(),
        blackoutDates: data.schedule?.blackoutDates?.map((date: Timestamp) => date.toDate()) || [],
      },
      requirements: {
        ...data.requirements,
        registrationDeadline: data.requirements?.registrationDeadline?.toDate() || new Date(),
      },
    } as Tournament;
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw new Error('Failed to get tournament');
  }
};

export const getTournaments = async (filters?: {
  status?: TournamentStatus;
  region?: string;
  skillLevel?: string;
  isPublic?: boolean;
  featured?: boolean;
  createdBy?: string;
}): Promise<Tournament[]> => {
  return retryOperation(async () => {
    try {
      let q = query(collection(db, 'tournaments'));

      // Apply filters one by one to avoid complex composite indexes
      if (filters?.createdBy) {
        q = query(q, where('createdBy', '==', filters.createdBy));
      }
      
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters?.region) {
        q = query(q, where('region', '==', filters.region));
      }
      
      if (filters?.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }
      
      if (filters?.featured) {
        q = query(q, where('featured', '==', true));
      }

      // Add ordering at the end
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const tournaments: Tournament[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tournaments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          schedule: {
            ...data.schedule,
            startDate: data.schedule?.startDate?.toDate() || new Date(),
            endDate: data.schedule?.endDate?.toDate() || new Date(),
            blackoutDates: data.schedule?.blackoutDates?.map((date: Timestamp) => date.toDate()) || [],
          },
          requirements: {
            ...data.requirements,
            registrationDeadline: data.requirements?.registrationDeadline?.toDate() || new Date(),
          },
        } as Tournament);
      });

      return tournaments;
    } catch (error) {
      console.error('Error getting tournaments:', error);
      throw new Error('Failed to get tournaments');
    }
  });
};

// Tournament Status Management
export const publishTournament = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      status: 'registration-open',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error publishing tournament:', error);
    throw new Error('Failed to publish tournament');
  }
};

export const closeRegistration = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      status: 'registration-closed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error closing registration:', error);
    throw new Error('Failed to close registration');
  }
};

export const startTournament = async (tournamentId: string): Promise<void> => {
  try {
    console.log('🚀 DEBUG: startTournament called for tournament:', tournamentId);

    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration-open') {
      throw new Error('Tournament is not in registration status');
    }

    if (tournament.teams.length < 2) {
      throw new Error('Need at least 2 teams to start tournament');
    }

    // Get the configured team count from tournament format
    const configuredTeamCount = tournament.format.teamCount;
    console.log(`🔍 DEBUG: Tournament configured for ${configuredTeamCount} teams, but ${tournament.teams.length} teams registered`);

    // Use the configured team count for bracket generation, not the actual registered teams
    // If more teams registered than configured, use the first N teams
    const teamsForBracket = tournament.teams.slice(0, configuredTeamCount);
    console.log(`🔍 DEBUG: Using first ${teamsForBracket.length} teams for bracket generation`);

    // Update tournament status
    await updateDoc(doc(db, 'tournaments', tournamentId), {
      status: 'in-progress',
      startedAt: new Date(),
      updatedAt: new Date()
    });

    // Generate brackets based on tournament type using the configured team count
    if (tournament.format.type === 'double-elimination') {
      console.log('🔍 DEBUG: Generating double elimination bracket');
      await generateDoubleEliminationBracket(tournamentId, teamsForBracket);
    } else {
      console.log('🔍 DEBUG: Generating single elimination bracket');
      await generateSingleEliminationBracket(tournamentId, teamsForBracket);
    }

    console.log('✅ DEBUG: Tournament started successfully');
  } catch (error) {
    console.error('❌ DEBUG: Error starting tournament:', error);
    throw error;
  }
};

export const completeTournament = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing tournament:', error);
    throw new Error('Failed to complete tournament');
  }
};

// Team Registration Management
export const registerTeamForTournament = async (
  tournamentId: string, 
  teamId: string, 
  registrationData: {
    players: string[];
    captainId: string;
    entryFeePaid?: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }
): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration-open') {
      throw new Error('Tournament registration is not open');
    }

    if (tournament.teams.length >= tournament.format.teamCount) {
      // Add to waitlist
      await updateDoc(tournamentRef, {
        waitlist: [...tournament.waitlist, teamId],
        'stats.registrationCount': tournament.stats.registrationCount + 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Add to main teams
      await updateDoc(tournamentRef, {
        teams: [...tournament.teams, teamId],
        'stats.registrationCount': tournament.stats.registrationCount + 1,
        updatedAt: serverTimestamp(),
      });
    }

    // Create registration record
    await addDoc(collection(db, 'tournamentRegistrations'), {
      tournamentId,
      teamId,
      ...registrationData,
      registeredAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registering team:', error);
    throw new Error('Failed to register team');
  }
};

export const approveTeamRegistration = async (tournamentId: string, teamId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Move from waitlist to main teams if there's space
    const waitlistIndex = tournament.waitlist.indexOf(teamId);
    if (waitlistIndex > -1 && tournament.teams.length < tournament.format.teamCount) {
      const newWaitlist = tournament.waitlist.filter(id => id !== teamId);
      const newTeams = [...tournament.teams, teamId];
      
      await updateDoc(tournamentRef, {
        teams: newTeams,
        waitlist: newWaitlist,
        updatedAt: serverTimestamp(),
      });
    }

    // Update registration status
    const registrationsRef = collection(db, 'tournamentRegistrations');
    const registrationQuery = query(
      registrationsRef,
      where('tournamentId', '==', tournamentId),
      where('teamId', '==', teamId)
    );
    const registrationDocs = await getDocs(registrationQuery);
    
    if (!registrationDocs.empty) {
      const registrationRef = doc(db, 'tournamentRegistrations', registrationDocs.docs[0].id);
      await updateDoc(registrationRef, {
        verificationStatus: 'approved',
        approvedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error approving team registration:', error);
    throw new Error('Failed to approve team registration');
  }
};

export const rejectTeamRegistration = async (tournamentId: string, teamId: string, reason: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Remove from teams and waitlist, add to rejected
    const newTeams = tournament.teams.filter(id => id !== teamId);
    const newWaitlist = tournament.waitlist.filter(id => id !== teamId);
    const newRejectedTeams = [...tournament.rejectedTeams, teamId];
    
    await updateDoc(tournamentRef, {
      teams: newTeams,
      waitlist: newWaitlist,
      rejectedTeams: newRejectedTeams,
      updatedAt: serverTimestamp(),
    });

    // Update registration status
    const registrationsRef = collection(db, 'tournamentRegistrations');
    const registrationQuery = query(
      registrationsRef,
      where('tournamentId', '==', tournamentId),
      where('teamId', '==', teamId)
    );
    const registrationDocs = await getDocs(registrationQuery);
    
    if (!registrationDocs.empty) {
      const registrationRef = doc(db, 'tournamentRegistrations', registrationDocs.docs[0].id);
      await updateDoc(registrationRef, {
        verificationStatus: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error rejecting team registration:', error);
    throw new Error('Failed to reject team registration');
  }
};

// Tournament Statistics
export const updateTournamentStats = async (tournamentId: string, stats: Partial<TournamentStats>): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      stats: stats,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating tournament stats:', error);
    throw new Error('Failed to update tournament stats');
  }
};

// Tournament Seeding
export const generateTournamentSeeding = async (tournamentId: string, seedingMethod: SeedingMethod): Promise<void> => {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    let rankings: { teamId: string; seed: number; elo?: number }[] = [];

    switch (seedingMethod) {
      case 'random':
        rankings = tournament.teams.map((teamId, index) => ({
          teamId,
          seed: index + 1,
        }));
        // Shuffle the rankings
        for (let i = rankings.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rankings[i], rankings[j]] = [rankings[j], rankings[i]];
        }
        break;

      case 'manual':
        // Manual seeding will be set by admin
        rankings = tournament.teams.map((teamId, index) => ({
          teamId,
          seed: index + 1,
        }));
        break;

      case 'elo-based':
        // TODO: Implement ELO-based seeding
        rankings = tournament.teams.map((teamId, index) => ({
          teamId,
          seed: index + 1,
          elo: 1000, // Default ELO
        }));
        break;

      case 'previous-tournament':
        // TODO: Implement previous tournament performance seeding
        rankings = tournament.teams.map((teamId, index) => ({
          teamId,
          seed: index + 1,
        }));
        break;

      case 'qualifier-results':
        // TODO: Implement qualifier results seeding
        rankings = tournament.teams.map((teamId, index) => ({
          teamId,
          seed: index + 1,
        }));
        break;
    }

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      seeding: {
        method: seedingMethod,
        rankings: rankings,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error generating tournament seeding:', error);
    throw new Error('Failed to generate tournament seeding');
  }
};

// Tournament Bracket Generation
export const generateTournamentBracket = async (tournamentId: string): Promise<void> => {
  try {
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.teams.length < 2) {
      throw new Error('Not enough teams to generate bracket');
    }

    // TODO: Implement bracket generation based on tournament type
    // This will be a complex function that generates different bracket structures
    // based on the tournament format (single elim, double elim, group stage, etc.)

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      brackets: {
        // Generated bracket structure will go here
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error generating tournament bracket:', error);
    throw new Error('Failed to generate tournament bracket');
  }
};

// Tournament Search and Discovery
export const searchTournaments = async (searchTerm: string, filters?: {
  status?: TournamentStatus;
  region?: string;
  skillLevel?: string;
  tournamentType?: TournamentType;
}): Promise<Tournament[]> => {
  try {
    // TODO: Implement full-text search when Firestore supports it
    // For now, we'll do basic filtering
    const tournaments = await getTournaments(filters);
    
    return tournaments.filter(tournament => 
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  } catch (error) {
    console.error('Error searching tournaments:', error);
    throw new Error('Failed to search tournaments');
  }
};

// Tournament Analytics
export const getTournamentAnalytics = async (tournamentId: string): Promise<{
  registrationTrends: any[];
  matchStatistics: any;
  participantEngagement: any;
  viewershipData: any;
}> => {
  try {
    // TODO: Implement comprehensive analytics
    // This would aggregate data from matches, registrations, and other sources
    return {
      registrationTrends: [],
      matchStatistics: {},
      participantEngagement: {},
      viewershipData: {},
    };
  } catch (error) {
    console.error('Error getting tournament analytics:', error);
    throw new Error('Failed to get tournament analytics');
  }
};

// Enhanced team registration with Discord verification (DISCORD CHECKS REMOVED)
export const registerTeamForTournamentWithVerification = async (
  tournamentId: string, 
  teamId: string, 
  registrationData: {
    players: string[];
    captainId: string;
    entryFeePaid?: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }
): Promise<{ 
  success: boolean; 
  message: string; 
  errors?: string[]; 
  warnings?: string[] 
}> => {
  try {
    // Directly register the team, skip Discord checks
    await registerTeamForTournament(tournamentId, teamId, registrationData);
    return {
      success: true,
      message: 'Team registered successfully',
      warnings: []
    };
  } catch (error) {
    console.error('Error registering team:', error);
    return {
      success: false,
      message: 'Failed to register team',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}; 