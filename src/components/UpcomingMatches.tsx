import React, { useState, useEffect } from 'react';
import { getMatches, getTeams } from '../services/firebaseService';
import type { Match, Team } from '../types/tournament';
import { Calendar, Clock, CheckCircle, AlertTriangle, Users, MapPin, Filter } from 'lucide-react';

interface UpcomingMatchesProps {
  tournamentId: string;
}

const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({ tournamentId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'this-week' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'matchday'>('date');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [matchesData, teamsData] = await Promise.all([
          getMatches(),
          getTeams()
        ]);
        
        // Filter matches for this tournament
        const tournamentMatches = matchesData.filter(match => match.tournamentId === tournamentId);
        setMatches(tournamentMatches);
        setTeams(teamsData);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId]);

  const getMatchStatus = (match: Match) => {
    if (match.isComplete) return { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20' };
    if (match.matchState === 'playing') return { label: 'In Progress', color: 'text-purple-400', bg: 'bg-purple-900/20' };
    if (match.matchState === 'ready_up') return { label: 'Ready Up', color: 'text-orange-400', bg: 'bg-orange-900/20' };
    if (match.scheduledTime) return { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/20' };
    if (match.matchState === 'pending_scheduling') return { label: 'Pending Schedule', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-900/20' };
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team ${teamId.slice(-4)}`;
  };

  const filterMatches = (matches: Match[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'today':
        return matches.filter(match => {
          if (!match.scheduledTime) return false;
          const matchDate = new Date(match.scheduledTime);
          return matchDate.toDateString() === today.toDateString();
        });
      case 'this-week':
        return matches.filter(match => {
          if (!match.scheduledTime) return false;
          const matchDate = new Date(match.scheduledTime);
          return matchDate >= today && matchDate <= thisWeek;
        });
      case 'pending':
        return matches.filter(match => match.matchState === 'pending_scheduling');
      default:
        return matches;
    }
  };

  const sortMatches = (matches: Match[]) => {
    switch (sortBy) {
      case 'date':
        return [...matches].sort((a, b) => {
          if (a.scheduledTime && b.scheduledTime) {
            const aTime = (a.scheduledTime as any)?.seconds !== undefined 
              ? (a.scheduledTime as any).seconds * 1000 
              : a.scheduledTime instanceof Date 
                ? a.scheduledTime.getTime() 
                : new Date(a.scheduledTime).getTime();
            const bTime = (b.scheduledTime as any)?.seconds !== undefined 
              ? (b.scheduledTime as any).seconds * 1000 
              : b.scheduledTime instanceof Date 
                ? b.scheduledTime.getTime() 
                : new Date(b.scheduledTime).getTime();
            return aTime - bTime;
          }
          if (a.scheduledTime) return -1;
          if (b.scheduledTime) return 1;
          return 0;
        });
      case 'status':
        return [...matches].sort((a, b) => {
          const statusOrder = {
            'pending_scheduling': 0,
            'scheduled': 1,
            'ready_up': 2,
            'playing': 3,
            'completed': 4
          };
          return (statusOrder[a.matchState as keyof typeof statusOrder] || 5) - 
                 (statusOrder[b.matchState as keyof typeof statusOrder] || 5);
        });
      case 'matchday':
        return [...matches].sort((a, b) => {
          const aMatchday = a.matchday || 0;
          const bMatchday = b.matchday || 0;
          if (aMatchday !== bMatchday) return aMatchday - bMatchday;
          return (a.swissRound || 0) - (b.swissRound || 0);
        });
      default:
        return matches;
    }
  };

  const getFilteredAndSortedMatches = () => {
    const filtered = filterMatches(matches);
    return sortMatches(filtered);
  };

  const getMatchTimeDisplay = (match: Match) => {
    if (match.scheduledTime) {
      try {
        const date = new Date(match.scheduledTime);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) {

          return 'Invalid date';
        }
        
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        if (date.toDateString() === today.toDateString()) {
          return `Heute um ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
          return `Morgen um ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`;
        } else {
          return date.toLocaleDateString('de-DE', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Europe/Berlin'
          });
        }
      } catch (error) {

        return 'Error displaying time';
      }
    }
    return 'Not scheduled';
  };

  if (loading) {
    return (
      <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-200">Loading matches...</p>
        </div>
      </div>
    );
  }

  const filteredMatches = getFilteredAndSortedMatches();
  const stats = {
    total: matches.length,
    pending: matches.filter(m => m.matchState === 'pending_scheduling').length,
    scheduled: matches.filter(m => m.scheduledTime && !m.isComplete).length,
    completed: matches.filter(m => m.isComplete).length,
    inProgress: matches.filter(m => m.matchState === 'playing').length
  };

  return (
    <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-cyan-400 font-bold text-xl flex items-center">
          <Calendar className="w-6 h-6 mr-2" />
          Upcoming Matches
        </h2>
        <div className="flex items-center space-x-4">
          {/* Filter Controls */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-cyan-300" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-black/40 border border-cyan-400/30 text-cyan-200 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Matches</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="pending">Pending Schedule</option>
            </select>
          </div>
          
          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-black/40 border border-cyan-400/30 text-cyan-200 rounded px-3 py-1 text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="matchday">Sort by Matchday</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-3 text-center">
          <div className="text-cyan-400 text-xl font-bold">{stats.total}</div>
          <div className="text-cyan-200 text-xs">Total</div>
        </div>
        <div className="bg-black/40 border border-yellow-400/20 rounded-lg p-3 text-center">
          <div className="text-yellow-400 text-xl font-bold">{stats.pending}</div>
          <div className="text-yellow-200 text-xs">Pending</div>
        </div>
        <div className="bg-black/40 border border-blue-400/20 rounded-lg p-3 text-center">
          <div className="text-blue-400 text-xl font-bold">{stats.scheduled}</div>
          <div className="text-blue-200 text-xs">Scheduled</div>
        </div>
        <div className="bg-black/40 border border-purple-400/20 rounded-lg p-3 text-center">
          <div className="text-purple-400 text-xl font-bold">{stats.inProgress}</div>
          <div className="text-purple-200 text-xs">In Progress</div>
        </div>
        <div className="bg-black/40 border border-green-400/20 rounded-lg p-3 text-center">
          <div className="text-green-400 text-xl font-bold">{stats.completed}</div>
          <div className="text-green-200 text-xs">Completed</div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => {
            const status = getMatchStatus(match);
            const isTeam1 = match.team1Id === match.team1Id;
            
            return (
              <div key={match.id} className="bg-black/40 border border-cyan-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg mb-1">
                      {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                    </div>
                    <div className="text-cyan-300 text-sm">
                      Matchday {match.matchday} • Round {match.swissRound || match.round}
                    </div>
                  </div>
                  
                  <div className={`text-xs px-3 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                    {status.label}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-cyan-200 text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {getMatchTimeDisplay(match)}
                  </div>
                  
                  {match.scheduledTime && (
                    <div className="text-cyan-300 text-xs">
                      {(() => {
                        try {
                          const date = new Date(match.scheduledTime);
                          if (isNaN(date.getTime())) {
                            return 'Invalid date';
                          }
                          return date.toLocaleDateString();
                        } catch (error) {
                          return 'Error displaying date';
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {match.matchState === 'pending_scheduling' && (
                  <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-400/30 rounded text-yellow-200 text-xs">
                    ⏰ Teams need to schedule this match within the matchday timeframe
                  </div>
                )}
                
                {match.scheduledTime && !match.isComplete && (
                  <div className="mt-3 p-2 bg-blue-900/20 border border-blue-400/30 rounded text-blue-200 text-xs">
                    📅 Match is scheduled and ready to begin
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-cyan-300 text-lg mb-2">No matches found</div>
            <div className="text-cyan-200 text-sm">
              {filter === 'today' && 'No matches scheduled for today'}
              {filter === 'this-week' && 'No matches scheduled for this week'}
              {filter === 'pending' && 'No matches pending scheduling'}
              {filter === 'all' && 'No matches found for this tournament'}
            </div>
          </div>
        )}
      </div>

      {/* Show More Button */}
      {filteredMatches.length > 0 && (
        <div className="text-center mt-6">
          <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg transition-colors">
            View All Matches
          </button>
        </div>
      )}
    </div>
  );
};

export default UpcomingMatches; 