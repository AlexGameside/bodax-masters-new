import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Plus, ArrowRight, Clock, CheckCircle, Zap, X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getTournaments, signupTeamForTournament, getUserTeams, fillTournamentWithDemoTeams, createTournament, startTournament, deleteAllTournaments, getTeamsInActiveMatches } from '../services/firebaseService';
import type { Tournament, Team, User } from '../types/tournament';

interface TournamentListProps {
  currentUser: User | null;
}

const TournamentList = ({ currentUser }: TournamentListProps) => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [fillingDemo, setFillingDemo] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [pendingTournamentId, setPendingTournamentId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [teamsInActiveMatches, setTeamsInActiveMatches] = useState<{ teamId: string; match: any }[]>([]);

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin === true;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTournaments, teams, activeMatchesData] = await Promise.all([
        getTournaments(),
        currentUser ? getUserTeams(currentUser.id) : Promise.resolve([]),
        getTeamsInActiveMatches()
      ]);
      
      setTournaments(allTournaments);
      setUserTeams(teams);
      setTeamsInActiveMatches(activeMatchesData);
      // Set the first team as selected by default
      setSelectedTeam(teams.length > 0 ? teams[0] : null);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (tournamentId: string) => {
    if (userTeams.length === 0) {
      setError('You need to be part of a team to sign up for tournaments');
      return;
    }

    if (userTeams.length === 1) {
      // Only one team, sign up directly
      await performSignup(tournamentId, userTeams[0].id);
    } else {
      // Multiple teams, show selection modal
      setPendingTournamentId(tournamentId);
      setShowTeamModal(true);
    }
  };

  const performSignup = async (tournamentId: string, teamId: string) => {
    setSigningUp(tournamentId);
    setError('');

    try {
      await signupTeamForTournament(tournamentId, teamId);
      toast.success('Successfully signed up for tournament!');
      await loadData(); // Refresh the list
    } catch (error: any) {
      console.error('Error signing up for tournament:', error);
      setError(error.message || 'Failed to sign up for tournament');
    } finally {
      setSigningUp(null);
    }
  };

  const handleTeamSelection = async () => {
    if (!selectedTeam || !pendingTournamentId) return;
    
    setShowTeamModal(false);
    await performSignup(pendingTournamentId, selectedTeam.id);
    setPendingTournamentId(null);
  };

  const handleFillDemo = async (tournamentId: string) => {
    setFillingDemo(tournamentId);
    setError('');

    try {
      await fillTournamentWithDemoTeams(tournamentId, selectedTeam?.id);
      toast.success('Tournament filled with demo teams! Tournament is now ready to start.');
      await loadData(); // Refresh the list
    } catch (error: any) {
      console.error('Error filling tournament with demo teams:', error);
      setError(error.message || 'Failed to fill tournament with demo teams');
    } finally {
      setFillingDemo(null);
    }
  };

  const handleStartTournament = async (tournamentId: string) => {
    setError('');
    
    try {
      await startTournament(tournamentId);
      toast.success('Tournament started! Bracket has been generated.');
      await loadData(); // Refresh the list
    } catch (error: any) {
      console.error('Error starting tournament:', error);
      setError(error.message || 'Failed to start tournament');
    }
  };

  const handleClearAllTournaments = async () => {
    setClearing(true);
    setError('');

    try {
      await deleteAllTournaments();
      toast.success('All tournaments have been cleared!');
      await loadData(); // Refresh the list
      setShowClearConfirm(false);
    } catch (error: any) {
      console.error('Error clearing tournaments:', error);
      setError(error.message || 'Failed to clear tournaments');
    } finally {
      setClearing(false);
    }
  };

  const getStatusBadge = (tournament: Tournament) => {
    if (tournament.status === 'in-progress') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </span>
      );
    }
    
    if (tournament.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }
    
    const maxTeams = tournament.requirements?.maxTeams || 8;
    const spotsLeft = maxTeams - (tournament.teams?.length || 0);
    
    if (spotsLeft === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          Ready to Start
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        {spotsLeft} spots left
      </span>
    );
  };

  const canSignup = (tournament: Tournament) => {
    if (userTeams.length === 0) return false;
    if (tournament.teams?.some(teamId => userTeams.some(userTeam => userTeam.id === teamId))) return false;
    if ((tournament.teams?.length || 0) >= (tournament.requirements?.maxTeams || 8)) return false;
    
    // Check if any of the user's teams are in active matches
    const userTeamInActiveMatch = userTeams.some(userTeam => 
      teamsInActiveMatches.some(activeMatch => activeMatch.teamId === userTeam.id)
    );
    
    return !userTeamInActiveMatch;
  };

  const getUserTeamActiveMatch = (teamId: string) => {
    return teamsInActiveMatches.find(activeMatch => activeMatch.teamId === teamId);
  };

  const isTeamSignedUp = (tournament: Tournament) => {
    return tournament.teams?.some(teamId => userTeams.some(userTeam => userTeam.id === teamId)) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-6xl mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-gray-300">Find and join tournaments to compete with other teams</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors border border-red-800"
              disabled={clearing}
            >
              <Trash2 className="w-4 h-4" />
              <span>{clearing ? 'Clearing...' : 'Clear All'}</span>
            </button>
            <button
              onClick={() => navigate('/tournaments/create')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors border border-red-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* No Team Warning */}
        {currentUser && userTeams.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
            <div className="flex items-start">
              <Users className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-200 mb-1">Join a Team First</h3>
                <p className="text-sm text-yellow-300 mb-3">
                  You need to be part of a team to sign up for tournaments.
                </p>
                <button
                  onClick={() => navigate('/teams')}
                  className="bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-lg transition-colors border border-gray-700 text-sm"
                >
                  Browse Teams
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How to Join Info */}
        {currentUser && userTeams.length > 0 && (
          <div className="mb-6 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
            <div className="flex items-start">
              <Trophy className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-200 mb-1">How to Join Tournaments</h3>
                <div className="text-sm text-blue-300 space-y-1">
                  <p>• Click <strong>"Sign Up"</strong> on any open tournament to join with your team</p>
                  {userTeams.length > 1 && (
                    <p>• You're in multiple teams - you'll be asked to choose which team to sign up with</p>
                  )}
                  <p>• Use <strong>"Fill with Demo Teams"</strong> to quickly populate tournaments for testing</p>
                  <p>• Once a tournament is full, the bracket will generate automatically</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Match Warning */}
        {currentUser && userTeams.length > 0 && teamsInActiveMatches.some(activeMatch => 
          userTeams.some(userTeam => userTeam.id === activeMatch.teamId)
        ) && (
          <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-200 mb-1">Team in Active Match</h3>
                <div className="text-sm text-yellow-300 space-y-1">
                  {userTeams.map(userTeam => {
                    const activeMatch = getUserTeamActiveMatch(userTeam.id);
                    if (activeMatch) {
                      return (
                        <p key={userTeam.id}>
                          • <strong>{userTeam.name}</strong> is currently in Match #{activeMatch.match.matchNumber} 
                          ({activeMatch.match.matchState?.replace('_', ' ') || 'Unknown'})
                        </p>
                      );
                    }
                    return null;
                  })}
                  <p className="mt-2">You can only be in one match at a time. Complete your current match before joining new tournaments.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournaments List */}
        {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Open Tournaments</h3>
            <p className="text-gray-400 mb-6">There are currently no tournaments open for signups.</p>
            <button
              onClick={() => navigate('/tournaments/create')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-800"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-black/60 border border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {tournament.name}
                    </h3>
                    {getStatusBadge(tournament)}
                  </div>
                  <Trophy className="w-6 h-6 text-red-400 flex-shrink-0" />
                </div>

                {tournament.description && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-300">
                    <Users className="w-4 h-4 mr-2" />
                    {tournament.teams?.length} / {tournament.requirements?.maxTeams || 8} teams
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    Created {tournament.createdAt.toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg flex items-center justify-center flex-1 border border-gray-700 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    View Details
                  </button>
                  
                  {canSignup(tournament) && (
                    <button
                      onClick={() => handleSignup(tournament.id)}
                      disabled={signingUp === tournament.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center flex-1 border border-red-800 transition-colors"
                    >
                      {signingUp === tournament.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing up...
                        </div>
                      ) : (
                        'Sign Up'
                      )}
                    </button>
                  )}
                  
                  {isTeamSignedUp(tournament) && (
                    <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-300 bg-green-900/50 rounded-lg border border-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Signed Up
                    </span>
                  )}
                </div>

                {/* Demo Fill Button - Show if tournament is open and has spots */}
                {userTeams.length > 0 && tournament.status === 'registration-open' && (tournament.teams?.length || 0) < (tournament.requirements?.maxTeams || 8) && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => handleFillDemo(tournament.id)}
                      disabled={fillingDemo === tournament.id}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 border border-purple-800"
                    >
                      {fillingDemo === tournament.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Filling...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Fill with Demo Teams</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Selection Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Select Team</h3>
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  setPendingTournamentId(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              You're in multiple teams. Which team would you like to sign up with?
            </p>
            
            <div className="space-y-2 mb-6">
              {userTeams.map((team) => (
                <label key={team.id} className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 bg-black/40">
                  <input
                    type="radio"
                    name="selectedTeam"
                    value={team.id}
                    checked={selectedTeam?.id === team.id}
                    onChange={() => setSelectedTeam(team)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-white">{team.name}</div>
                    <div className="text-sm text-gray-400">[{team.teamTag}]</div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  setPendingTournamentId(null);
                }}
                className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700 flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTeamSelection}
                disabled={!selectedTeam}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-800 flex-1"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Tournaments Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Clear All Tournaments</h3>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <Trash2 className="w-6 h-6 text-red-400 mr-3" />
                <span className="text-red-300 font-medium">Warning: This action cannot be undone!</span>
              </div>
              <p className="text-gray-300 text-sm">
                This will permanently delete all tournaments and their associated matches. 
                Are you sure you want to continue?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700 flex-1"
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllTournaments}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 flex-1 border border-red-800"
              >
                {clearing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentList; 