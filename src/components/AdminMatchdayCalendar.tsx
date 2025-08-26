import React, { useState, useEffect } from 'react';
import { getMatches, getTeams } from '../services/firebaseService';
import type { Match, Team } from '../types/tournament';
import { Calendar, Clock, CheckCircle, AlertTriangle, Users, MapPin } from 'lucide-react';

interface AdminMatchdayCalendarProps {
  tournamentId: string;
}

const AdminMatchdayCalendar: React.FC<AdminMatchdayCalendarProps> = ({ tournamentId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

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
        console.error('Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId]);

  const getMatchesForDate = (date: Date) => {
    return matches.filter(match => {
      if (!match.scheduledTime) return false;
      const matchDate = new Date(match.scheduledTime);
      return matchDate.toDateString() === date.toDateString();
    });
  };

  const getMatchesByDateRange = (startDate: Date, endDate: Date) => {
    return matches.filter(match => {
      if (!match.scheduledTime) return false;
      const matchDate = new Date(match.scheduledTime);
      return matchDate >= startDate && matchDate <= endDate;
    });
  };

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

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getDateStats = (date: Date) => {
    const dayMatches = getMatchesForDate(date);
    const scheduled = dayMatches.filter(m => m.scheduledTime).length;
    const pending = dayMatches.filter(m => m.matchState === 'pending_scheduling').length;
    const completed = dayMatches.filter(m => m.isComplete).length;
    
    return { scheduled, pending, completed, total: dayMatches.length };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="bg-black/60 rounded-xl border border-pink-400/30 backdrop-blur-sm p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <p className="text-pink-200">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
          const monthName = selectedDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });

  return (
    <div className="bg-black/60 rounded-xl border border-pink-400/30 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-pink-400 font-bold text-xl flex items-center">
          <Calendar className="w-6 h-6 mr-2" />
          Matchday Calendar
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-black/40 text-pink-200 hover:bg-black/60'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'list' 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-black/40 text-pink-200 hover:bg-black/60'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Previous
            </button>
            <h3 className="text-white text-xl font-semibold">{monthName}</h3>
            <button
              onClick={() => navigateMonth('next')}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-pink-300 text-center text-sm font-medium p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const stats = getDateStats(date);
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-pink-400/20 rounded-lg ${
                    isCurrentMonth ? 'bg-black/40' : 'bg-black/20'
                  } ${isToday ? 'ring-2 ring-pink-400' : ''}`}
                >
                  <div className="text-right mb-1">
                    <span className={`text-sm ${
                      isCurrentMonth ? 'text-white' : 'text-white/40'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>
                  
                  {stats.total > 0 && (
                    <div className="space-y-1">
                      {stats.scheduled > 0 && (
                        <div className="text-xs bg-blue-900/50 text-blue-300 px-1 py-0.5 rounded">
                          {stats.scheduled} scheduled
                        </div>
                      )}
                      {stats.pending > 0 && (
                        <div className="text-xs bg-yellow-900/50 text-yellow-300 px-1 py-0.5 rounded">
                          {stats.pending} pending
                        </div>
                      )}
                      {stats.completed > 0 && (
                        <div className="text-xs bg-green-900/50 text-green-300 px-1 py-0.5 rounded">
                          {stats.completed} completed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* List View */}
          <div className="mb-6">
            <h3 className="text-white text-lg font-semibold mb-4">Upcoming Matches</h3>
            <div className="space-y-3">
              {matches
                .filter(match => !match.isComplete)
                .sort((a, b) => {
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
                })
                .slice(0, 10)
                .map(match => {
                  const status = getMatchStatus(match);
                  const isTeam1 = match.team1Id === match.team1Id;
                  
                  return (
                    <div key={match.id} className="bg-black/40 border border-pink-400/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">
                          {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color}`}>
                          {status.label}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-pink-200">
                          {match.scheduledTime ? (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(match.scheduledTime).toLocaleString('de-DE', {
                                timeZone: 'Europe/Berlin',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-400">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Not scheduled
                            </span>
                          )}
                        </div>
                        <div className="text-pink-200">
                          Matchday {match.matchday} • Round {match.swissRound || match.round}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4 text-center">
              <div className="text-pink-400 text-2xl font-bold">
                {matches.filter(m => m.matchState === 'pending_scheduling').length}
              </div>
              <div className="text-pink-200 text-sm">Pending Schedule</div>
            </div>
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4 text-center">
              <div className="text-blue-400 text-2xl font-bold">
                {matches.filter(m => m.scheduledTime && !m.isComplete).length}
              </div>
              <div className="text-blue-200 text-sm">Scheduled</div>
            </div>
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4 text-center">
              <div className="text-green-400 text-2xl font-bold">
                {matches.filter(m => m.isComplete).length}
              </div>
              <div className="text-green-200 text-sm">Completed</div>
            </div>
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4 text-center">
              <div className="text-purple-400 text-2xl font-bold">
                {matches.filter(m => m.matchState === 'playing').length}
              </div>
              <div className="text-purple-200 text-sm">In Progress</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminMatchdayCalendar; 