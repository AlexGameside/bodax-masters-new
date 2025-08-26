import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeUserMatches } from '../hooks/useRealtimeData';
import UserMatches from '../components/UserMatches';
import type { Team } from '../types/tournament';

const MyMatches: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Use real-time hook for user matches
  const { matches, loading, error } = useRealtimeUserMatches(currentUser?.id || '');
  
  // Add some debugging
  console.log('[MyMatches] Debug:', {
    currentUserId: currentUser?.id,
    matchesCount: matches.length,
    matches: matches.map(m => ({ id: m.id, team1Id: m.team1Id, team2Id: m.team2Id, matchState: m.matchState })),
    loading,
    error
  });
  
  // Create basic teams for matches (extract team IDs from matches)
  console.log('[MyMatches] Creating teams for matches:', matches.map(m => ({ id: m.id, team1Id: m.team1Id, team2Id: m.team2Id })));
  console.log('[MyMatches] Current user ID:', currentUser?.id);
  
  const teams: Team[] = matches.flatMap(match => {
    const teamList = [];
    if (match.team1Id) {
      // Check if current user is in team1 (they would be the owner/captain)
      const isUserTeam = match.team1Id === currentUser?.id || match.team1Id.includes(currentUser?.id || '');
      teamList.push({
        id: match.team1Id,
        name: isUserTeam ? `Your Team (${match.team1Id.slice(0, 8)})` : `Team ${match.team1Id.slice(0, 8)}`,
        ownerId: isUserTeam ? (currentUser?.id || '') : 'opponent',
        captainId: isUserTeam ? (currentUser?.id || '') : 'opponent',
        members: isUserTeam ? [{ userId: currentUser?.id || '', role: 'owner' as const, joinedAt: new Date(), isActive: true }] : [{ userId: 'opponent', role: 'owner' as const, joinedAt: new Date(), isActive: true }],
        teamTag: '',
        description: '',
        createdAt: new Date(),
        registeredForTournament: false,
        maxMembers: 10,
        maxMainPlayers: 5,
        maxSubstitutes: 2,
        maxCoaches: 1,
        maxAssistantCoaches: 1,
        maxManagers: 1
      });
    }
    if (match.team2Id) {
      // Check if current user is in team2
      const isUserTeam = match.team2Id === currentUser?.id || match.team2Id.includes(currentUser?.id || '');
      teamList.push({
        id: match.team2Id,
        name: isUserTeam ? `Your Team (${match.team2Id.slice(0, 8)})` : `Team ${match.team2Id.slice(0, 8)}`,
        ownerId: isUserTeam ? (currentUser?.id || '') : 'opponent',
        captainId: isUserTeam ? (currentUser?.id || '') : 'opponent',
        members: isUserTeam ? [{ userId: currentUser?.id || '', role: 'owner' as const, joinedAt: new Date(), isActive: true }] : [{ userId: 'opponent', role: 'owner' as const, joinedAt: new Date(), isActive: true }],
        teamTag: '',
        description: '',
        createdAt: new Date(),
        registeredForTournament: false,
        maxMembers: 10,
        maxMainPlayers: 5,
        maxSubstitutes: 2,
        maxCoaches: 1,
        maxAssistantCoaches: 1,
        maxManagers: 1
      });
    }
    return teamList;
  }).filter((team, index, self) => 
    // Remove duplicates by team ID
    index === self.findIndex(t => t.id === team.id)
  );
  
  console.log('[MyMatches] Final teams created:', teams.map(t => ({ id: t.id, name: t.name, ownerId: t.ownerId, isUserTeam: t.ownerId === currentUser?.id })));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please log in to view your matches</h1>
          <p className="text-gray-400">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading your matches...</h1>
          <p className="text-gray-400">Please wait while we fetch your match data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error loading matches</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">My Matches</h1>
          <p className="text-gray-300 text-lg">
            View and manage all your upcoming matches across all tournaments.
          </p>
        </div>
        
        <UserMatches
          userId={currentUser.id}
          teams={teams}
          matches={matches}
        />
      </div>
    </div>
  );
};

export default MyMatches; 