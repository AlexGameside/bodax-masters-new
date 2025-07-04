import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, ArrowRight, Clock, CheckCircle, Zap, X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getTournaments, signupTeamForTournament, getUserTeams, fillTournamentWithDemoTeams, startTournament, deleteAllTournaments, getTeamsInActiveMatches } from '../services/firebaseService';
import { registerTeamForTournamentWithVerification } from '../services/tournamentService';
import { checkUserInDiscordServer } from '../services/discordService';
import type { Tournament, Team, User } from '../types/tournament';
import TeamMemberSelection from '../components/TeamMemberSelection';

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
  const [showTeamMemberSelection, setShowTeamMemberSelection] = useState(false);
  const [selectedTeamForRegistration, setSelectedTeamForRegistration] = useState<Team | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin === true;

  // Check Discord requirements
  const discordLinked = !!(currentUser?.discordId && currentUser?.discordLinked);
  const inDiscordServer = discordLinked ? currentUser?.inDiscordServer ?? false : false;

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

    // If only one team, auto-select it; otherwise, let user pick
    const team = userTeams.length === 1 ? userTeams[0] : selectedTeam;
    if (!team) {
      setError('No team selected');
      return;
    }
    setSelectedTeamForRegistration(team);
    setPendingTournamentId(tournamentId);
    setShowTeamMemberSelection(true);
  };

  const performSignup = async (tournamentId: string, teamId: string) => {
    setSigningUp(tournamentId);
    setError('');

    try {
      // Use the new verification system (no Discord checks)
      const result = await registerTeamForTournamentWithVerification(
        tournamentId,
        teamId,
        {
          players: userTeams.find(t => t.id === teamId)?.members.map(m => m.userId) || [],
          captainId: userTeams.find(t => t.id === teamId)?.captainId || '',
          verificationStatus: 'pending'
        }
      );

      if (result.success) {
        toast.success(result.message);
        await loadData(); // Refresh the list
        
        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          toast.error(`Registration successful with warnings: ${result.warnings.join(', ')}`);
        }
      } else {
        // Show detailed error messages
        if (result.errors && result.errors.length > 0) {
          const errorMessage = result.errors.join('\n');
          toast.error(`Registration failed:\n${errorMessage}`);
          setError(errorMessage);
        } else {
          toast.error(result.message || 'Failed to register team');
          setError(result.message || 'Failed to register team');
        }
      }
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
    
    // Use the actual configured team count from tournament format, not requirements
    const maxTeams = tournament.format?.teamCount || tournament.requirements?.maxTeams || 8;
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
    // Use the actual configured team count from tournament format, not requirements
    const maxTeams = tournament.format?.teamCount || tournament.requirements?.maxTeams || 8;
    if ((tournament.teams?.length || 0) >= maxTeams) return false;
    
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

  const handleTeamMembersSelected = async (selectedUserIds: string[]) => {
    if (!pendingTournamentId || !selectedTeamForRegistration) return;
    setShowTeamMemberSelection(false);
    setSelectedTeamForRegistration(null);
    setPendingTournamentId(null);
    // Call performSignup with selected players
    await performSignupWithPlayers(pendingTournamentId, selectedTeamForRegistration.id, selectedUserIds);
  };

  // New function to handle registration with selected players
  const performSignupWithPlayers = async (tournamentId: string, teamId: string, playerIds: string[]) => {
    setSigningUp(tournamentId);
    setError('');
    try {
      // Use the new verification system with selected players
      const result = await registerTeamForTournamentWithVerification(
        tournamentId,
        teamId,
        {
          players: playerIds,
          captainId: userTeams.find(t => t.id === teamId)?.captainId || '',
          verificationStatus: 'pending'
        }
      );
      if (result.success) {
        toast.success(result.message);
        await loadData();
        if (result.warnings && result.warnings.length > 0) {
          toast.error(`Registration successful with warnings: ${result.warnings.join(', ')}`);
        }
      } else {
        if (result.errors && result.errors.length > 0) {
          const errorMessage = result.errors.join('\n');
          toast.error(`Registration failed:\n${errorMessage}`);
          setError(errorMessage);
        } else {
          toast.error(result.message || 'Failed to register team');
          setError(result.message || 'Failed to register team');
        }
      }
    } catch (error: any) {
      console.error('Error signing up for tournament:', error);
      setError(error.message || 'Failed to sign up for tournament');
    } finally {
      setSigningUp(null);
    }
  };

  const handleCancelTeamMemberSelection = () => {
    setShowTeamMemberSelection(false);
    setSelectedTeamForRegistration(null);
    setPendingTournamentId(null);
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
      {/* Tech background with grid and glow effects */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{backgroundImage: 'repeating-linear-gradient(0deg, #ff000011 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #ff000011 0 1px, transparent 1px 40px)'}} />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-red-500/5 via-transparent to-purple-500/5" />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with tech styling */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-purple-600 mb-2 tracking-wider">
              TOURNAMENTS
            </h1>
            <div className="h-1 bg-gradient-to-r from-red-400 via-red-500 to-purple-600 rounded-full"></div>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
            <span className="text-red-400">[</span> Find and join tournaments to compete with other teams <span className="text-red-400">]</span>
          </p>
          {isAdmin && (
            <div className="mt-8">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-8 py-4 rounded-lg flex items-center space-x-3 transition-all duration-300 border border-red-500/50 shadow-lg hover:shadow-red-500/25 mx-auto font-mono text-sm tracking-wider"
                disabled={clearing}
              >
                <Trash2 className="w-5 h-5" />
                <span>{clearing ? 'CLEARING...' : 'CLEAR ALL TOURNAMENTS'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Error Message with tech styling */}
        {error && (
          <div className="mb-8 p-6 bg-red-900/30 border border-red-500/50 rounded-lg max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <p className="text-red-300 text-center font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* Tournaments Grid with tech styling */}
        {tournaments.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-900/50 rounded-2xl p-12 max-w-md mx-auto border border-gray-700/50 backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600">
                <Trophy className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 font-mono tracking-wider">NO OPEN TOURNAMENTS</h3>
              <p className="text-gray-400 font-mono">There are currently no tournaments open for signups.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="group bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 shadow-2xl hover:shadow-red-500/20 transition-all duration-500 hover:scale-105 overflow-hidden backdrop-blur-sm relative"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Tournament Header */}
                <div className="p-6 border-b border-gray-700/50 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-red-600 to-red-500 rounded-xl flex items-center justify-center border border-red-500/50 shadow-lg">
                        <Trophy className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white font-mono tracking-wide">{tournament.name}</h3>
                        <p className="text-sm text-red-400 font-mono">[{tournament.region}]</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(tournament)}
                    </div>
                  </div>
                  
                  {tournament.description && (
                    <p className="text-gray-300 text-sm leading-relaxed font-mono">
                      {tournament.description.length > 120 
                        ? `${tournament.description.substring(0, 120)}...` 
                        : tournament.description}
                    </p>
                  )}
                </div>

                {/* Tournament Stats with tech styling */}
                <div className="p-6 space-y-6 relative z-10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-lg p-4 text-center border border-gray-600/50">
                      <div className="text-3xl font-bold text-red-400 font-mono">
                        {tournament.teams?.length || 0}
                      </div>
                      <div className="text-xs text-gray-400 font-mono tracking-wider">TEAMS</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-lg p-4 text-center border border-gray-600/50">
                      <div className="text-3xl font-bold text-yellow-400 font-mono">
                        €{tournament.prizePool?.total || 0}
                      </div>
                      <div className="text-xs text-gray-400 font-mono tracking-wider">PRIZE POOL</div>
                    </div>
                  </div>

                  {/* Tournament Details with tech styling */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-mono">FORMAT:</span>
                      <span className="text-white font-medium font-mono">
                        {tournament.format?.matchFormat || 'BO1'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-mono">TYPE:</span>
                      <span className="text-white font-medium font-mono">
                        {tournament.format?.type?.replace(/-/g, ' ') || 'SINGLE ELIMINATION'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-mono">MAX TEAMS:</span>
                      <span className="text-white font-medium font-mono">
                        {tournament.format?.teamCount || tournament.requirements?.maxTeams || 8}
                      </span>
                    </div>
                  </div>

                  {/* Requirements Badges with tech styling */}
                  {(tournament.requirements?.requireRiotId || tournament.requirements?.minimumRank) && (
                    <div className="flex flex-wrap gap-2 pt-3">
                      {tournament.requirements?.requireRiotId && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-500/50 font-mono">
                          RIOT ID REQUIRED
                        </span>
                      )}
                      {tournament.requirements?.minimumRank && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-500/50 font-mono">
                          MIN RANK: {tournament.requirements.minimumRank}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons with tech styling */}
                <div className="p-6 pt-0 space-y-4 relative z-10">
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-3 border border-red-500/50 shadow-lg hover:shadow-red-500/25 font-mono tracking-wider"
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span>VIEW DETAILS</span>
                  </button>
                  
                  {/* Signup Button for logged-in users */}
                  {currentUser && tournament.status === 'registration-open' && (
                    <div className="space-y-3">
                      {isTeamSignedUp(tournament) ? (
                        <div className="w-full bg-green-900/30 border border-green-500/50 text-green-300 py-4 px-6 rounded-xl text-center flex items-center justify-center space-x-3 font-mono tracking-wider">
                          <CheckCircle className="w-5 h-5" />
                          <span>TEAM REGISTERED</span>
                        </div>
                      ) : canSignup(tournament) ? (
                        <button
                          onClick={() => handleSignup(tournament.id)}
                          disabled={!!signingUp}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-3 border border-green-500/50 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-wider"
                        >
                          {signingUp === tournament.id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>SIGNING UP...</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-5 h-5" />
                              <span>SIGN UP</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full bg-gray-800/50 border border-gray-600/50 text-gray-300 py-4 px-6 rounded-xl text-center flex items-center justify-center space-x-3 font-mono tracking-wider">
                          <X className="w-5 h-5" />
                          <span>CANNOT SIGN UP</span>
                        </div>
                      )}
                      
                      {/* Admin Buttons with tech styling */}
                      {isAdmin && (
                        <div className="flex gap-3">
                          {tournament.status === 'registration-open' && (
                            <button
                              onClick={() => handleFillDemo(tournament.id)}
                              disabled={!!fillingDemo}
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-3 px-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center space-x-2 border border-red-500/50 shadow-lg hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm tracking-wider"
                            >
                              {fillingDemo === tournament.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <Users className="w-4 h-4" />
                                  <span>FILL DEMO</span>
                                </>
                              )}
                            </button>
                          )}
                          
                          {(tournament.status as import('../types/tournament').TournamentStatus) === 'registration-closed' && (
                            <button
                              onClick={() => handleStartTournament(tournament.id)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center space-x-2 border border-purple-500/50 shadow-lg hover:shadow-purple-500/25 font-mono text-sm tracking-wider"
                            >
                              <Trophy className="w-4 h-4" />
                              <span>START</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Team Member Selection Modal */}
      {showTeamMemberSelection && selectedTeamForRegistration && (
        <TeamMemberSelection
          teamMembers={selectedTeamForRegistration.members || []}
          onMembersSelected={handleTeamMembersSelected}
          onCancel={handleCancelTeamMemberSelection}
          tournamentId={pendingTournamentId || ''}
          maxPlayers={5}
        />
      )}
    </div>
  );
};

export default TournamentList; 
