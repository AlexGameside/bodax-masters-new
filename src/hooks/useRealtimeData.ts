import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Match, Team, Tournament, User } from '../types/tournament';

// Helper function to handle onSnapshot with error handling
const onSnapshotCollection = (
  query: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
) => {
  return onSnapshot(query, onNext, onError);
};

// Real-time match hook
export const useRealtimeMatch = (matchId: string) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    setLoading(true);
    
    const matchRef = doc(db, 'matches', matchId);
    const unsubscribe = onSnapshot(matchRef, (doc) => {
      if (doc.exists()) {
        const matchData = {
          id: doc.id,
          ...doc.data()
        } as Match;
        
        // Convert Firestore Timestamps to Date objects
        if (matchData.scheduledTime && typeof matchData.scheduledTime === 'object' && 'seconds' in matchData.scheduledTime) {
          matchData.scheduledTime = new Date((matchData.scheduledTime as any).seconds * 1000);
        }
        if (matchData.createdAt && typeof matchData.createdAt === 'object' && 'seconds' in matchData.createdAt) {
          matchData.createdAt = new Date((matchData.createdAt as any).seconds * 1000);
        }
        
        setMatch(matchData);
        setError(null);
      } else {
        setMatch(null);
        setError('Match not found');
      }
      setLoading(false);
    }, (error) => {

      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  return { match, loading, error };
};

// Real-time team hook
export const useRealtimeTeam = (teamId: string) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    setLoading(true);
    
    const teamRef = doc(db, 'teams', teamId);
    const unsubscribe = onSnapshot(teamRef, (doc) => {
      if (doc.exists()) {
        const teamData = {
          id: doc.id,
          ...doc.data()
        } as Team;
        
        // Convert Firestore Timestamps to Date objects
        if (teamData.createdAt && typeof teamData.createdAt === 'object' && 'seconds' in teamData.createdAt) {
          teamData.createdAt = new Date((teamData.createdAt as any).seconds * 1000);
        }
        
        setTeam(teamData);
        setError(null);
      } else {
        setTeam(null);
        setError('Team not found');
      }
      setLoading(false);
    }, (error) => {

      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId]);

  return { team, loading, error };
};

// Real-time tournament hook
export const useRealtimeTournament = (tournamentId: string) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    setLoading(true);
    
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const unsubscribe = onSnapshot(tournamentRef, (doc) => {
      if (doc.exists()) {
        const tournamentData = {
          id: doc.id,
          ...doc.data()
        } as Tournament;
        
        // Convert Firestore Timestamps to Date objects
        if (tournamentData.createdAt && typeof tournamentData.createdAt === 'object' && 'seconds' in tournamentData.createdAt) {
          tournamentData.createdAt = new Date((tournamentData.createdAt as any).seconds * 1000);
        }
        if (tournamentData.updatedAt && typeof tournamentData.updatedAt === 'object' && 'seconds' in tournamentData.updatedAt) {
          tournamentData.updatedAt = new Date((tournamentData.updatedAt as any).seconds * 1000);
        }

        
        setTournament(tournamentData);
        setError(null);
      } else {
        setTournament(null);
        setError('Tournament not found');
      }
      setLoading(false);
    }, (error) => {

      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId]);

  return { tournament, loading, error };
};

// Real-time user matches hook - ENHANCED VERSION WITH TEAM DATA
export const useRealtimeUserMatches = (userId: string) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    // Set up real-time listeners for user's teams
    const teamsQuery = query(collection(db, 'teams'));
    
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const updatedTeams: Team[] = [];
      
      snapshot.forEach((doc) => {
        const teamData = {
          id: doc.id,
          ...doc.data()
        } as Team;
        
        // Convert Firestore Timestamps to Date objects
        if (teamData.createdAt && typeof teamData.createdAt === 'object' && 'seconds' in teamData.createdAt) {
          teamData.createdAt = new Date((teamData.createdAt as any).seconds * 1000);
        }
        
        // Filter teams to only include those where the user is a member
        const isOwner = teamData.ownerId === userId;
        const isCaptain = teamData.captainId === userId;
        const isMember = teamData.members && teamData.members.some((member: any) => member.userId === userId);
        
        if (isOwner || isCaptain || isMember) {
          updatedTeams.push(teamData);
        }
      });
      
      setTeams(updatedTeams);
      setLoading(false);
    }, (error) => {

      setError(error.message);
      setLoading(false);
    });

    return () => {
      unsubscribeTeams();
    };
  }, [userId]);

  // Separate effect for matches that depends on teams
  useEffect(() => {
    if (teams.length === 0) {
      setMatches([]);
      return;
    }

    // Set up real-time listeners for matches - only fetch user's matches
    const unsubscribeMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const updatedMatches: Match[] = [];
      
      snapshot.forEach((doc) => {
        const matchData = {
          id: doc.id,
          ...doc.data()
        } as Match;
        
        // Convert Firestore Timestamps to Date objects
        if (matchData.scheduledTime && typeof matchData.scheduledTime === 'object' && 'seconds' in matchData.scheduledTime) {
          matchData.scheduledTime = new Date((matchData.scheduledTime as any).seconds * 1000);
        }
        if (matchData.createdAt && typeof matchData.createdAt === 'object' && 'seconds' in matchData.createdAt) {
          matchData.createdAt = new Date((matchData.createdAt as any).seconds * 1000);
        }
        
        // Only include matches where user's teams are participating
        const userTeamIds = teams.map(team => team.id);
        const isUserInMatch = (matchData.team1Id && userTeamIds.includes(matchData.team1Id)) || 
                             (matchData.team2Id && userTeamIds.includes(matchData.team2Id));
        
        if (isUserInMatch && !matchData.isComplete) {
          updatedMatches.push(matchData);
        }
      });
      
      setMatches(updatedMatches);
    }, (error) => {

      setError(error.message);
    });

    return () => {
      unsubscribeMatches();
    };
  }, [teams]);

  return { matches, teams, loading, error };
};

// Real-time tournaments hook
export const useRealtimeTournaments = (currentUserId?: string) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Use the secure service function instead of direct Firestore access
    const loadTournaments = async () => {
      try {
        // Import the service function dynamically to avoid circular dependencies
        const { getTournaments } = await import('../services/firebaseService');
        
        // Get tournaments using the secure service function with current user ID
        const tournamentsData = await getTournaments(currentUserId, false);
        
        // Convert Firestore Timestamps to Date objects
        const processedTournaments = tournamentsData.map(tournament => ({
          ...tournament,
          createdAt: tournament.createdAt && typeof tournament.createdAt === 'object' && 'seconds' in tournament.createdAt
            ? new Date((tournament.createdAt as any).seconds * 1000)
            : tournament.createdAt,
          updatedAt: tournament.updatedAt && typeof tournament.updatedAt === 'object' && 'seconds' in tournament.updatedAt
            ? new Date((tournament.updatedAt as any).seconds * 1000)
            : tournament.updatedAt,
        }));
        
        setTournaments(processedTournaments);
        setError(null);
        setLoading(false);
      } catch (error) {

        setError(error instanceof Error ? error.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadTournaments();
  }, [currentUserId]);

  return { tournaments, loading, error };
};

// Real-time user teams hook
export const useRealtimeUserTeams = (userId: string) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    
    // Use the secure service function instead of direct Firestore access
    const loadTeams = async () => {
      try {
        // Import the service function dynamically to avoid circular dependencies
        const { getTeams } = await import('../services/firebaseService');
        
        // Get user's teams using the secure service function
        const userTeams = await getTeams(userId, false);
        
        setTeams(userTeams);
        setError(null);
        setLoading(false);
      } catch (error) {

        setError(error instanceof Error ? error.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadTeams();
  }, [userId]);

  return { teams, loading, error };
};

// Real-time all matches hook
export const useRealtimeMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const matchesQuery = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const updatedMatches: Match[] = [];
      
      snapshot.forEach((doc) => {
        const matchData = {
          id: doc.id,
          ...doc.data()
        } as Match;
        
        // Convert Firestore Timestamps to Date objects
        if (matchData.scheduledTime && typeof matchData.scheduledTime === 'object' && 'seconds' in matchData.scheduledTime) {
          matchData.scheduledTime = new Date((matchData.scheduledTime as any).seconds * 1000);
        }
        if (matchData.createdAt && typeof matchData.createdAt === 'object' && 'seconds' in matchData.createdAt) {
          matchData.createdAt = new Date((matchData.createdAt as any).seconds * 1000);
        }
        
        updatedMatches.push(matchData);
      });
      
      setMatches(updatedMatches);
      setError(null);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { matches, loading, error };
};

// Real-time all teams hook
export const useRealtimeTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const teamsQuery = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const updatedTeams: Team[] = [];
      
      snapshot.forEach((doc) => {
        const teamData = {
          id: doc.id,
          ...doc.data()
        } as Team;
        
        // Convert Firestore Timestamps to Date objects
        if (teamData.createdAt && typeof teamData.createdAt === 'object' && 'seconds' in teamData.createdAt) {
          teamData.createdAt = new Date((teamData.createdAt as any).seconds * 1000);
        }
        
        updatedTeams.push(teamData);
      });
      
      setTeams(updatedTeams);
      setError(null);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { teams, loading, error };
}; 