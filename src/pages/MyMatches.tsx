import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeUserMatches } from '../hooks/useRealtimeData';
import UserMatches from '../components/UserMatches';
import type { Team } from '../types/tournament';

const MyMatches: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Use real-time hook for user matches and teams
  const { matches, teams, loading, error } = useRealtimeUserMatches(currentUser?.id || '');
  
  // Add some debugging
  console.log('[MyMatches] Debug:', {
    currentUserId: currentUser?.id,
    matchesCount: matches.length,
    teamsCount: teams.length,
    matches: matches.map(m => ({ id: m.id, team1Id: m.team1Id, team2Id: m.team2Id, matchState: m.matchState })),
    teams: teams.map(t => ({ id: t.id, name: t.name, ownerId: t.ownerId })),
    loading,
    error
  });
  
  // No need to create fake teams anymore - we get real team data from the hook
  console.log('[MyMatches] Using teams from hook:', teams.map(t => ({ id: t.id, name: t.name, ownerId: t.ownerId })));
  
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

  // If no matches, show tournament signup phase message
  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Tournament Signup Phase</h1>
            <p className="text-gray-300 text-lg">
              The tournament is currently in the signup phase. No matches have been created yet.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-600/10 backdrop-blur-sm rounded-2xl p-8 border border-purple-400/30 shadow-2xl">
            <div className="text-center">
              <div className="bg-purple-600/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">🏆</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Tournament Not Started</h3>
              <p className="text-purple-200 mb-6">
                Teams are still registering and the tournament hasn't begun yet. 
                Once the signup phase ends and matches are generated, you'll see your matches here.
              </p>
              
              {currentUser?.isAdmin && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <strong>Admin Note:</strong> You can manage the tournament and view all teams from the Admin Panel.
                  </p>
                </div>
              )}
            </div>
          </div>
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