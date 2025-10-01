import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Play, 
  Users, 
  ExternalLink, 
  Eye, 
  Mic, 
  Mic2,
  Tv,
  Tv2,
  MapPin,
  Trophy,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRealtimeMatches } from '../hooks/useRealtimeData';
import { useRealtimeTeams } from '../hooks/useRealtimeData';
import type { Match, Team, User } from '../types/tournament';

interface UpcomingMatchesProps {
  currentUser: User | null;
}

const UpcomingMatches = ({ currentUser }: UpcomingMatchesProps) => {
  const navigate = useNavigate();
  
  // Use real-time hooks for matches and teams
  const { matches, loading: matchesLoading, error: matchesError } = useRealtimeMatches();
  const { teams, loading: teamsLoading, error: teamsError } = useRealtimeTeams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'streamed' | 'not-streamed' | 'live'>('all');
  const [roundFilter, setRoundFilter] = useState<'all' | number>('all');

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin === true;

  useEffect(() => {
    if (matchesLoading || teamsLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [matchesLoading, teamsLoading]);

  useEffect(() => {
    if (matchesError || teamsError) {
      setError(`Error loading data: ${matchesError || teamsError}`);
    }
  }, [matchesError, teamsError]);

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

  // Helper function to get time until match
  const getTimeUntilMatch = (date: Date | string | any | undefined) => {
    if (!date) return null;
    
    try {
      let dateObj: Date;
      
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return null;
      }
      
      if (isNaN(dateObj.getTime())) {
        return null;
      }
      
      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      
      if (diffMs < 0) return null; // Match has passed
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        return `${days}d ${diffHours % 24}h`;
      } else if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        return `${diffMinutes}m`;
      }
    } catch (error) {
      return null;
    }
  };

  // Get team by ID
  const getTeamById = (teamId: string | null): Team | null => {
    if (!teamId) return null;
    return teams.find(team => team.id === teamId) || null;
  };

  // Get unique rounds for filter
  const availableRounds = Array.from(new Set(matches
    .filter(match => ['scheduled', 'ready_up', 'pending_scheduling'].includes(match.matchState))
    .map(match => match.round)
    .filter(round => round !== undefined)
  )).sort((a, b) => a - b);

  // Filter upcoming matches
  const upcomingMatches = matches.filter(match => {
    // For live filter, show matches that are currently active/live
    if (filter === 'live') {
      // Show matches that are live streaming OR in active states
      const isLiveStreaming = match.streamingInfo?.isLive === true;
      const isActiveMatch = ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing', 'waiting_results'].includes(match.matchState);
      
      if (!isLiveStreaming && !isActiveMatch) {
        return false;
      }
    } else {
      // For other filters, only show matches that are scheduled or ready_up
      if (!['scheduled', 'ready_up', 'pending_scheduling'].includes(match.matchState)) {
        return false;
      }
    }
    
    // Apply streaming filter
    if (filter === 'streamed' && !match.streamingInfo?.isStreamed) {
      return false;
    }
    if (filter === 'not-streamed' && match.streamingInfo?.isStreamed) {
      return false;
    }
    
    // Apply round filter
    if (roundFilter !== 'all' && match.round !== roundFilter) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by scheduled time, with TBD matches at the end
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1; // TBD matches go to bottom
    if (!b.scheduledTime) return -1; // TBD matches go to bottom
    
    const aTime = a.scheduledTime instanceof Date ? a.scheduledTime : new Date(a.scheduledTime);
    const bTime = b.scheduledTime instanceof Date ? b.scheduledTime : new Date(b.scheduledTime);
    
    return aTime.getTime() - bTime.getTime(); // Soonest matches first
  });

  const getMatchStatusBadge = (match: Match) => {
    // Check if match is live streaming
    if (match.streamingInfo?.isLive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700 animate-pulse">
          <Play className="w-3 h-3 mr-1" />
          LIVE NOW
        </span>
      );
    }
    
    // Check if match is in active playing state
    if (['playing', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'waiting_results'].includes(match.matchState)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-700">
          <Play className="w-3 h-3 mr-1" />
          RUNNING
        </span>
      );
    }
    
    if (match.matchState === 'ready_up') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ready Up
        </span>
      );
    }
    
    if (match.matchState === 'scheduled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
          <Calendar className="w-3 h-3 mr-1" />
          Scheduled
        </span>
      );
    }
    
    if (match.matchState === 'pending_scheduling') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
    
    return null;
  };

  const getStreamingBadge = (match: Match) => {
    if (!match.streamingInfo?.isStreamed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
          <Tv2 className="w-3 h-3 mr-1" />
          Not Streamed
        </span>
      );
    }
    
    const isLive = match.streamingInfo.isLive;
    const platform = match.streamingInfo.streamPlatform;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isLive 
          ? 'bg-red-900/50 text-red-300 border-red-700' 
          : 'bg-purple-900/50 text-purple-300 border-purple-700'
      }`}>
        <Tv className="w-3 h-3 mr-1" />
        {isLive ? 'LIVE' : `${platform?.toUpperCase() || 'STREAM'}`}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading upcoming matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700">
      {/* Unity League Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">UPCOMING MATCHES</h1>
              <p className="text-sm sm:text-base text-white/80 font-mono tracking-tight">WATCH LIVE STREAMS AND SCHEDULED MATCHES</p>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg transition-colors font-medium font-mono tracking-tight"
                >
                  MANAGE STREAMS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-8 p-6 bg-red-900/50 border border-red-400/30 rounded-xl max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <p className="text-red-200 text-center font-mono tracking-tight">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-8 space-y-4">
          {/* Streaming Filter */}
          <div className="flex justify-center overflow-x-auto">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-2 border border-white/20">
              <div className="flex space-x-2 min-w-max">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'all' 
                      ? 'bg-cyan-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setFilter('streamed')}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'streamed' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  STREAMED
                </button>
                <button
                  onClick={() => setFilter('not-streamed')}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'not-streamed' 
                      ? 'bg-gray-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  NOT STREAMED
                </button>
                <button
                  onClick={() => setFilter('live')}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'live' 
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  LIVE
                </button>
              </div>
            </div>
          </div>

          {/* Round Filter */}
          {availableRounds.length > 0 && (
            <div className="flex justify-center overflow-x-auto">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                <div className="flex space-x-2 min-w-max">
                  <button
                    onClick={() => setRoundFilter('all')}
                    className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      roundFilter === 'all' 
                        ? 'bg-pink-600 text-white' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ALL
                  </button>
                  {availableRounds.map(round => (
                    <button
                      key={round}
                      onClick={() => setRoundFilter(round)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        roundFilter === round 
                          ? 'bg-pink-600 text-white' 
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      R{round}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Matches Grid */}
        {upcomingMatches.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-900/50 rounded-2xl p-12 max-w-md mx-auto border border-gray-700/50 backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600">
                <Calendar className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 font-mono tracking-wider">NO UPCOMING MATCHES</h3>
              <p className="text-gray-400 font-mono">
                {filter === 'streamed' 
                  ? 'No streamed matches scheduled.' 
                  : filter === 'not-streamed'
                  ? 'No non-streamed matches scheduled.'
                  : filter === 'live'
                  ? 'No matches are currently live or running.'
                  : 'No matches are currently scheduled.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingMatches.map((match) => {
              const team1 = getTeamById(match.team1Id);
              const team2 = getTeamById(match.team2Id);
              const timeUntil = getTimeUntilMatch(match.scheduledTime);
              
              return (
                <div
                  key={match.id}
                  className="unity-card-pink group hover:scale-105 transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/match/${match.id}`)}
                >
                  {/* Match Header */}
                  <div className="p-4 sm:p-6 border-b border-pink-400/30 relative z-10">
                    {/* Team Names - BIG and Prominent */}
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight mb-2 truncate">
                        {team1?.name || 'TBD'}
                      </h3>
                      <div className="text-pink-400 font-mono text-base sm:text-lg font-bold mb-2">VS</div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight truncate">
                        {team2?.name || 'TBD'}
                      </h3>
                    </div>

                    {/* Date and Time - Most Important Info */}
                    <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-gray-600/50">
                      <div className="text-center">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-white font-mono mb-1">
                          {formatDate(match.scheduledTime)}
                        </div>
                        {timeUntil && (
                          <div className="text-cyan-400 font-mono text-xs sm:text-sm">
                            In {timeUntil}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap justify-center gap-2 mb-3 sm:mb-4">
                      {getMatchStatusBadge(match)}
                      {getStreamingBadge(match)}
                    </div>

                    {/* Additional Info - Smaller */}
                    <div className="text-center text-xs sm:text-sm text-gray-400 font-mono">
                      Round {match.round} • Match {match.matchNumber}
                      {match.swissRound && ` • Swiss Round ${match.swissRound}`}
                    </div>
                  </div>


                  {/* Action Buttons */}
                  <div className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4 relative z-10">
                    {match.streamingInfo?.isStreamed && match.streamingInfo?.streamUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(match.streamingInfo?.streamUrl, '_blank');
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white py-2.5 sm:py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 border border-purple-500/50 shadow-lg hover:shadow-purple-500/25 font-mono text-xs sm:text-sm tracking-wider"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>WATCH STREAM</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Unity League Footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-pink-300 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; UPCOMING MATCHES</span>
          <span className="text-cyan-400">// Unity League 2025</span>
        </div>
      </div>
    </div>
  );
};

export default UpcomingMatches;
