import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, ArrowRight, Clock, CheckCircle, Zap, X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fillTournamentWithDemoTeams, startTournament, deleteAllTournaments, getTeamsInActiveMatches } from '../services/firebaseService';
import { useRealtimeTournaments } from '../hooks/useRealtimeData';
import type { Tournament, Team, User } from '../types/tournament';

interface TournamentListProps {
  currentUser: User | null;
}

const TournamentList = ({ currentUser }: TournamentListProps) => {
  const navigate = useNavigate();
  
  // Use real-time hook for tournaments with current user ID
  const { tournaments, loading: tournamentsLoading, error: tournamentsError } = useRealtimeTournaments(currentUser?.id);
  
  const [loading, setLoading] = useState(true);
  const [fillingDemo, setFillingDemo] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [teamsInActiveMatches, setTeamsInActiveMatches] = useState<{ teamId: string; match: any }[]>([]);

  // Helper function to format dates
  const formatDate = (date: Date | string | any | undefined) => {
    if (!date) return 'TBD';
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {

        return 'TBD';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {

        return 'TBD';
      }
      
      return dateObj.toLocaleDateString('de-DE', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {

      return 'TBD';
    }
  };

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin === true;

  // Check Discord requirements
  const discordLinked = !!(currentUser?.discordId && currentUser?.discordLinked);
  const inDiscordServer = discordLinked ? currentUser?.inDiscordServer ?? false : false;

  useEffect(() => {
    loadData();
  }, []);

  // Update loading state based on tournaments loading
  useEffect(() => {
    if (tournamentsLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [tournamentsLoading]);

  // Handle tournaments error
  useEffect(() => {
    if (tournamentsError) {
      setError(`Tournaments error: ${tournamentsError}`);
    }
  }, [tournamentsError]);

  const loadData = async () => {
    try {
      setLoading(true);
      const activeMatchesData = await getTeamsInActiveMatches();
      setTeamsInActiveMatches(activeMatchesData);
    } catch (error) {

      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = async (tournamentId: string) => {
    setFillingDemo(tournamentId);
    setError('');

    try {
      await fillTournamentWithDemoTeams(tournamentId);
      toast.success('Tournament filled with demo teams! Tournament is now ready to start.');
      await loadData(); // Refresh the list
    } catch (error: any) {

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

      setError(error.message || 'Failed to clear tournaments');
    } finally {
      setClearing(false);
    }
  };

  const getStatusBadge = (tournament: Tournament) => {
    if (tournament.status === 'in-progress') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-bold bg-gray-900 text-blue-400 border border-blue-900 uppercase font-mono tracking-widest">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </span>
      );
    }
    
    if (tournament.status === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-bold bg-gray-900 text-gray-400 border border-gray-700 uppercase font-mono tracking-widest">
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
        <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-bold bg-gray-900 text-yellow-500 border border-yellow-900 uppercase font-mono tracking-widest">
          <Clock className="w-3 h-3 mr-1" />
          Ready to Start
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-bold bg-gray-900 text-green-500 border border-green-900 uppercase font-mono tracking-widest">
        <CheckCircle className="w-3 h-3 mr-1" />
        {spotsLeft} spots left
      </span>
    );
  };

  const canSignup = (tournament: Tournament) => {
    // Since we removed sign-up functionality, always return false
    return false;
  };

  const getUserTeamActiveMatch = (teamId: string) => {
    return teamsInActiveMatches.find(activeMatch => activeMatch.teamId === teamId);
  };

  const isTeamSignedUp = (tournament: Tournament) => {
    // Since we removed sign-up functionality, always return false
    return false;
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
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />
      
      {/* Bodax Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white font-bodax tracking-wider uppercase mb-1">Tournaments</h1>
              <div className="h-1 w-20 bg-red-600"></div>
              <p className="text-gray-400 font-mono text-sm mt-2 uppercase tracking-widest">Find and compete in official Bodax tournaments</p>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/admin/tournaments/create')}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 transition-colors font-bodax tracking-wider uppercase text-lg border border-red-800"
                >
                  Create Tournament
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 transition-colors font-bodax tracking-wider uppercase text-lg border border-gray-600"
                >
                  Admin Panel
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="bg-black hover:bg-gray-900 text-red-500 hover:text-red-400 px-6 py-2 transition-colors font-bodax tracking-wider uppercase text-lg border border-red-900/50"
                  disabled={clearing}
                >
                  {clearing ? 'Clearing...' : 'Clear All'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-6 bg-red-900/50 border border-red-400/30 rounded-xl max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <p className="text-red-200 text-center font-mono tracking-tight">{error}</p>
            </div>
          </div>
        )}

        {/* Tournaments Grid with Bodax styling */}
        {tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-[#0a0a0a] p-12 max-w-md mx-auto border border-gray-800 shadow-2xl relative group">
              <div className="absolute top-0 left-0 w-2 h-2 bg-gray-600 group-hover:bg-red-600 transition-colors"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-gray-600 group-hover:bg-red-600 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-gray-600 group-hover:bg-red-600 transition-colors"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-gray-600 group-hover:bg-red-600 transition-colors"></div>
              
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 group-hover:border-red-900 transition-colors">
                <Trophy className="w-10 h-10 text-gray-500 group-hover:text-red-500 transition-colors" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2 font-bodax tracking-wide uppercase">No Tournaments</h3>
              <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Check back soon for upcoming events</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-[#0a0a0a] border border-gray-800 hover:border-red-600 transition-all duration-300 group relative overflow-hidden flex flex-col h-full"
              >
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-gray-600 group-hover:border-red-600 transition-colors z-20"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-gray-600 group-hover:border-red-600 transition-colors z-20"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-gray-600 group-hover:border-red-600 transition-colors z-20"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-gray-600 group-hover:border-red-600 transition-colors z-20"></div>

                {/* Tournament Header */}
                <div className="p-6 border-b border-gray-800 bg-gray-900/20 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-900 flex items-center justify-center border border-gray-700 group-hover:border-red-900 transition-colors">
                        <Trophy className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white font-bodax tracking-wide uppercase leading-none mb-1">{tournament.name}</h3>
                        <p className="text-red-500 font-mono text-xs tracking-widest uppercase">[{tournament.region}]</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                     {getStatusBadge(tournament)}
                  </div>
                  
                  {tournament.description && (
                    <p className="text-gray-400 text-sm leading-relaxed font-sans mt-2 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}
                </div>

                {/* Tournament Stats */}
                <div className="p-6 flex-grow">
                  <div className="grid grid-cols-2 gap-px bg-gray-800 border border-gray-800 mb-6">
                    <div className="bg-[#0a0a0a] p-4 text-center">
                      <div className="text-3xl font-bold text-white font-bodax tracking-wide">
                        {tournament.teams?.length || 0}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">TEAMS</div>
                    </div>
                    <div className="bg-[#0a0a0a] p-4 text-center">
                      <div className="text-3xl font-bold text-red-500 font-bodax tracking-wide">
                        €{tournament.prizePool?.total || 0}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">PRIZE POOL</div>
                    </div>
                  </div>

                  {/* Tournament Details */}
                  <div className="space-y-2 border-l-2 border-gray-800 pl-4 py-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-mono uppercase text-xs tracking-wider">START</span>
                      <span className="text-white font-medium font-mono text-xs uppercase tracking-wider">
                        {formatDate(tournament.schedule?.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-mono uppercase text-xs tracking-wider">FORMAT</span>
                      <span className="text-white font-medium font-mono text-xs uppercase tracking-wider">
                        {tournament.format?.matchFormat || 'BO1'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-mono uppercase text-xs tracking-wider">TYPE</span>
                      <span className="text-white font-medium font-mono text-xs uppercase tracking-wider">
                        {tournament.format?.type?.replace(/-/g, ' ') || 'SINGLE ELIMINATION'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-mono uppercase text-xs tracking-wider">MAX TEAMS</span>
                      <span className="text-white font-medium font-mono text-xs uppercase tracking-wider">
                        {tournament.format?.teamCount || tournament.requirements?.maxTeams || 8}
                      </span>
                    </div>
                  </div>

                  {/* Requirements Badges */}
                  {(tournament.requirements?.requireRiotId || tournament.requirements?.minimumRank) && (
                    <div className="flex flex-wrap gap-2 pt-4 mt-2 border-t border-gray-900">
                      {tournament.requirements?.requireRiotId && (
                        <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-gray-900 text-gray-300 border border-gray-700 font-mono uppercase tracking-wider">
                          RIOT ID REQUIRED
                        </span>
                      )}
                      {tournament.requirements?.minimumRank && (
                        <span className="inline-flex items-center px-2 py-1 text-[10px] font-medium bg-gray-900 text-gray-300 border border-gray-700 font-mono uppercase tracking-wider">
                          MIN RANK: {tournament.requirements.minimumRank}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 pt-0 space-y-4 relative z-10 mt-auto">
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 font-bodax text-xl uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2 clip-path-polygon"
                  >
                    <span>VIEW DETAILS</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  {/* Admin Buttons */}
                  {isAdmin && (
                    <div className="flex gap-3">
                      {tournament.status === 'registration-open' && (
                        <button
                          onClick={() => handleFillDemo(tournament.id)}
                          disabled={!!fillingDemo}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 font-mono text-xs uppercase tracking-wider border border-gray-600 flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          {fillingDemo === tournament.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Users className="w-3 h-3" />
                              <span>FILL DEMO</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {(tournament.status as import('../types/tournament').TournamentStatus) === 'registration-closed' && (
                        <button
                          onClick={() => handleStartTournament(tournament.id)}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 font-mono text-xs uppercase tracking-wider border border-gray-600 flex items-center justify-center space-x-2"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>START</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
      
      {/* Bodax Footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-gray-500 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; TOURNAMENTS LIST</span>
          <span className="text-red-500">// Bodax Masters 2025</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentList; 
