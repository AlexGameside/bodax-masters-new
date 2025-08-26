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
      console.error('Error listening to match:', error);
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
      console.error('Error listening to team:', error);
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
      console.error('Error listening to tournament:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId]);

  return { tournament, loading, error };
};

// Real-time user matches hook - SIMPLIFIED VERSION FOR DEBUGGING
export const useRealtimeUserMatches = (userId: string) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    console.log('[useRealtimeUserMatches] Starting with userId:', userId);
    
    // For debugging, let's listen to ALL matches and filter them
    const matchesQuery = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshotCollection(matchesQuery, (snapshot) => {
      const allMatches = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      
      console.log('[useRealtimeUserMatches] All matches loaded:', allMatches.length);
      console.log('[useRealtimeUserMatches] Match details:', allMatches.map(m => ({
        id: m.id,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        matchState: m.matchState,
        tournamentId: m.tournamentId
      })));
      
      // For now, show ALL matches for debugging
      // TODO: Implement proper team filtering
      setMatches(allMatches);
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to matches:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { matches, loading, error };
};

// Real-time tournaments hook
export const useRealtimeTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const tournamentsQuery = query(
      collection(db, 'tournaments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshotCollection(tournamentsQuery, (snapshot) => {
      const tournamentsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      
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
    }, (error) => {
      console.error('Error listening to tournaments:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    
    // Listen to all teams and filter for the current user
    const teamsQuery = query(
      collection(db, 'teams'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshotCollection(teamsQuery, (snapshot) => {
      const allTeams = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      
      // Filter teams where user is a member
      const userTeams = allTeams.filter(team => 
        team.members && team.members.some(member => member.userId === userId)
      );
      
      console.log('[useRealtimeUserTeams] Debug:', {
        userId,
        totalTeams: allTeams.length,
        userTeams: userTeams.length,
        teamIds: userTeams.map(t => t.id),
        teamNames: userTeams.map(t => t.name)
      });
      
      setTeams(userTeams);
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to teams:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { teams, loading, error };
}; 