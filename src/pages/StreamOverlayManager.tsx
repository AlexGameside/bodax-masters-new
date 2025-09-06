import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMatches, getTeams, getTournaments } from '../services/firebaseService';
import { getValidTeamCount, cleanupInvalidTeamReferences } from '../services/tournamentService';
import type { Match, Team, Tournament } from '../types/tournament';
import { Copy, ExternalLink, Eye, EyeOff, Link, Users, Calendar, Trophy, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StreamOverlayManager = () => {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showStreamUrl, setShowStreamUrl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string>('');
  const [tournamentTeamCounts, setTournamentTeamCounts] = useState<Record<string, { raw: number; valid: number; name: string }>>({});
  const [cleaningUp, setCleaningUp] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [matchesData, teamsData] = await Promise.all([
          getMatches(),
          getTeams()
        ]);
        setMatches(matchesData);
        setTeams(teamsData);
        
        // Load tournament team counts
        await loadTournamentTeamCounts();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load matches and teams');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadTournamentTeamCounts = async () => {
    try {
      // Get all tournaments
      const tournaments = await getTournaments(undefined, true); // Admin access
      const counts: Record<string, { raw: number; valid: number; name: string }> = {};
      
      for (const tournament of tournaments) {
        try {
          const validCount = await getValidTeamCount(tournament.id);
          const rawCount = tournament.teams?.length || 0;
          counts[tournament.id] = { 
            raw: rawCount, 
            valid: validCount,
            name: tournament.name
          };
        } catch (error) {
          console.warn(`Could not get team count for tournament ${tournament.id}:`, error);
        }
      }
      
      setTournamentTeamCounts(counts);
    } catch (error) {
      console.error('Error loading tournament team counts:', error);
    }
  };

  const handleCleanupTournament = async (tournamentId: string) => {
    if (!window.confirm('This will remove invalid team references from the tournament. Continue?')) {
      return;
    }

    setCleaningUp(tournamentId);
    try {
      const result = await cleanupInvalidTeamReferences(tournamentId);
      toast.success(`Cleaned up ${result.removedTeams.length} invalid team references`);
      await loadTournamentTeamCounts(); // Refresh counts
    } catch (error) {
      console.error('Error cleaning up tournament:', error);
      toast.error('Failed to clean up tournament');
    } finally {
      setCleaningUp(null);
    }
  };

  const copyStreamUrl = (matchId: string) => {
    const streamUrl = `${window.location.origin}/stream/${matchId}`;
    navigator.clipboard.writeText(streamUrl);
    setCopiedUrl(streamUrl);
    toast.success('Stream URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(''), 3000);
  };

  const openStreamOverlay = (matchId: string) => {
    const streamUrl = `${window.location.origin}/stream/${matchId}`;
    window.open(streamUrl, '_blank');
  };

  const getMatchStatus = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return { status: 'Ready Up', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
      case 'map_banning':
        return { status: 'Map Banning', color: 'text-blue-400', bg: 'bg-blue-900/20' };
      case 'playing':
        return { status: 'In Progress', color: 'text-green-400', bg: 'bg-green-900/20' };
      case 'completed':
        return { status: 'Completed', color: 'text-gray-400', bg: 'bg-gray-900/20' };
      case 'scheduled':
        return { status: 'Scheduled', color: 'text-purple-400', bg: 'bg-purple-900/20' };
      default:
        return { status: match.matchState, color: 'text-gray-400', bg: 'bg-gray-900/20' };
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/80">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Loading Stream Manager...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Stream Overlay Manager</h1>
                <p className="text-sm text-white/80">Generate and manage stream overlay URLs for casters</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Team Count Analysis */}
        {Object.keys(tournamentTeamCounts).length > 0 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-400" />
              Tournament Team Count Analysis
            </h3>
            <p className="text-white/80 mb-4">
              This shows the difference between raw team counts and valid team counts (teams that actually exist in the database).
            </p>
            <div className="space-y-3">
                             {Object.entries(tournamentTeamCounts).map(([tournamentId, counts]) => {
                 const hasInvalidTeams = counts.raw !== counts.valid;
                 return (
                   <div key={tournamentId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                     <div className="flex items-center space-x-4">
                       <span className="text-white font-medium">{counts.name}</span>
                       <div className="flex items-center space-x-2">
                         <span className="text-gray-400">Raw:</span>
                         <span className="text-white font-semibold">{counts.raw}</span>
                         <span className="text-gray-400">Valid:</span>
                         <span className="text-white font-semibold">{counts.valid}</span>
                         {hasInvalidTeams && (
                           <span className="text-orange-400 text-sm">
                             ({counts.raw - counts.valid} invalid)
                           </span>
                         )}
                       </div>
                     </div>
                     {hasInvalidTeams && (
                       <button
                         onClick={() => handleCleanupTournament(tournamentId)}
                         disabled={cleaningUp === tournamentId}
                         className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                       >
                         {cleaningUp === tournamentId ? (
                           <RefreshCw className="w-4 h-4 animate-spin" />
                         ) : (
                           'Clean Up'
                         )}
                       </button>
                     )}
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {/* Matches List */}
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-6">Available Matches</h3>
          
          {matches.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-white/60">No matches found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const status = getMatchStatus(match);
                const team1Name = getTeamName(match.team1Id);
                const team2Name = getTeamName(match.team2Id);
                const streamUrl = `${window.location.origin}/stream/${match.id}`;
                const isCopied = copiedUrl === streamUrl;

                return (
                  <div key={match.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="text-white font-semibold">
                            Match #{match.matchNumber}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-white/80">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>{team1Name} vs {team2Name}</span>
                          </div>
                          
                          {match.scheduledTime && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(match.scheduledTime).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyStreamUrl(match.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                            isCopied 
                              ? 'bg-green-600 text-white' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Copy className="w-4 h-4" />
                          <span>{isCopied ? 'Copied!' : 'Copy URL'}</span>
                        </button>
                        
                        <button
                          onClick={() => openStreamOverlay(match.id)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                    
                    {isCopied && (
                      <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <code className="text-sm text-green-300 break-all">
                            {streamUrl}
                          </code>
                          <button
                            onClick={() => setCopiedUrl('')}
                            className="ml-2 text-green-400 hover:text-green-300"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
                 </div>
       </div>
     </div>
   );
 };

export default StreamOverlayManager;
