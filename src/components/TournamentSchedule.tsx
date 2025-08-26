import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Clock, Eye, ChevronLeft, ChevronRight, MapPin, Zap } from 'lucide-react';
import { getTournamentMatches, getTeamById, getTeams } from '../services/firebaseService';
import type { Match, Team, Tournament } from '../types/tournament';

interface TournamentScheduleProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  currentUser?: any;
}

interface MatchDay {
  date: string;
  matches: Match[];
  dayNumber: number;
}

interface UpcomingMatch {
  match: Match;
  team1?: Team;
  team2?: Team;
  timeUntil: string;
}

const TournamentSchedule: React.FC<TournamentScheduleProps> = ({ tournament, matches, teams, currentUser }) => {
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'schedule' | 'upcoming'>('schedule');

  useEffect(() => {
    // Generate match days
    const days = generateMatchDays(matches);
    setMatchDays(days);
    
    // Generate upcoming matches
    const upcoming = generateUpcomingMatches(matches, teams);
    setUpcomingMatches(upcoming);
    
    if (days.length > 0) {
      setSelectedDate(days[0].date);
    }
  }, [tournament.id, matches, teams]);

  const generateMatchDays = (allMatches: Match[]): MatchDay[] => {
    const daysMap: { [date: string]: Match[] } = {};
    
    allMatches.forEach(match => {
      const matchDate = new Date(match.createdAt);
      const dateKey = matchDate.toISOString().split('T')[0];
      
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = [];
      }
      daysMap[dateKey].push(match);
    });
    
    return Object.entries(daysMap)
      .map(([date, matches]) => ({
        date,
        matches: matches.sort((a, b) => a.matchNumber - b.matchNumber),
        dayNumber: Math.floor((new Date(date).getTime() - ((tournament.schedule.startDate as any)?.seconds !== undefined 
          ? (tournament.schedule.startDate as any).seconds * 1000 
          : tournament.schedule.startDate instanceof Date 
            ? tournament.schedule.startDate.getTime() 
            : new Date(tournament.schedule.startDate).getTime())) / (1000 * 60 * 60 * 24)) + 1
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const generateUpcomingMatches = (allMatches: Match[], allTeams: Team[]): UpcomingMatch[] => {
    const now = new Date();
    const upcoming = allMatches
      .filter(match => !match.isComplete && new Date(match.createdAt) > now)
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.seconds !== undefined 
          ? (a.createdAt as any).seconds * 1000 
          : a.createdAt instanceof Date 
            ? a.createdAt.getTime() 
            : new Date(a.createdAt).getTime();
        const bTime = (b.createdAt as any)?.seconds !== undefined 
          ? (b.createdAt as any).seconds * 1000 
          : b.createdAt instanceof Date 
            ? b.createdAt.getTime() 
            : new Date(b.createdAt).getTime();
        return aTime - bTime;
      })
      .slice(0, 10)
      .map(match => ({
        match,
        team1: getTeamById(match.team1Id, allTeams),
        team2: getTeamById(match.team2Id, allTeams),
        timeUntil: getTimeUntil(match.createdAt)
      }));
    
    return upcoming;
  };

  const getTeamById = (teamId: string | null, allTeams: Team[]): Team | undefined => {
    if (!teamId) return undefined;
    return allTeams.find(team => team.id === teamId);
  };

  const getTimeUntil = (matchDate: Date | any): string => {
    const now = new Date();
    let match: Date;
    
    // Handle Firestore Timestamp objects
    if (matchDate && typeof matchDate === 'object' && matchDate.seconds !== undefined) {
      match = new Date(matchDate.seconds * 1000);
    } else if (matchDate instanceof Date) {
      match = matchDate;
    } else {
      match = new Date(matchDate);
    }
    
    const diff = match.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Starting soon';
  };

  const getMatchStatusColor = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'map_banning':
        return 'border-blue-500 bg-blue-900/20';
      case 'ready_up':
        return 'border-purple-500 bg-purple-900/20';
      case 'playing':
        return 'border-green-500 bg-green-900/20';
      case 'completed':
        return 'border-gray-500 bg-gray-900/20';
      default:
        return 'border-gray-600 bg-gray-800/20';
    }
  };

  const getMatchStatusText = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return 'Ready Up';
      case 'map_banning':
        return 'Map Banning';
      case 'ready_up':
        return 'Side Selection';
      case 'playing':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Scheduled';
    }
  };

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
        console.warn('Unsupported date type received:', date);
        return 'TBD';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date received:', date);
        return 'TBD';
      }
      
      return dateObj.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'TBD';
    }
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading tournament schedule...</p>
        </div>
      </div>
    );
  }

  const selectedDayData = matchDays.find(day => day.date === selectedDate);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
          <p className="text-gray-300 mb-4">Tournament Schedule</p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(tournament.schedule.startDate)} - {formatDate(tournament.schedule.endDate)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{tournament.schedule.timeZone}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>{matches.length} Matches</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('schedule')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                viewMode === 'schedule'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Full Schedule
            </button>
            <button
              onClick={() => setViewMode('upcoming')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                viewMode === 'upcoming'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Upcoming Matches
            </button>
          </div>
        </div>

        {viewMode === 'schedule' ? (
          /* Full Schedule View */
          <div className="space-y-6">
            {/* Match Day Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {matchDays.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    selectedDate === day.date
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm">Day {day.dayNumber}</div>
                    <div className="text-xs opacity-75">{formatDate(day.date)}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Day Matches */}
            {selectedDayData && (
              <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Day {selectedDayData.dayNumber} - {formatDate(selectedDayData.date)}
                  </h2>
                  <div className="text-gray-400">
                    {selectedDayData.matches.length} matches
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedDayData.matches.map((match) => {
                    const team1 = getTeamById(match.team1Id, teams);
                    const team2 = getTeamById(match.team2Id, teams);
                    
                    return (
                      <div
                        key={match.id}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${getMatchStatusColor(match)}`}
                        onClick={() => window.location.href = `/match/${match.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-400">
                            Match #{match.matchNumber}
                          </span>
                          <span className="text-xs text-gray-300">
                            {formatTime(match.createdAt)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                            <span className="text-sm font-medium text-white">
                              {team1?.name || 'TBD'}
                            </span>
                            {match.isComplete && (
                              <span className="text-sm font-bold text-white">
                                {match.team1Score}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                            <span className="text-sm font-medium text-white">
                              {team2?.name || 'TBD'}
                            </span>
                            {match.isComplete && (
                              <span className="text-sm font-bold text-white">
                                {match.team2Score}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400">
                            {getMatchStatusText(match)}
                          </span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upcoming Matches View */
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Upcoming Matches</h2>
              <div className="text-gray-400">
                {upcomingMatches.length} upcoming
              </div>
            </div>

            {upcomingMatches.length > 0 ? (
              <div className="space-y-4">
                {upcomingMatches.map((upcoming) => {
                  const { match, team1, team2, timeUntil } = upcoming;
                  
                  return (
                    <div
                      key={match.id}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 cursor-pointer"
                      onClick={() => window.location.href = `/match/${match.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-400">Match #{match.matchNumber}</div>
                            <div className="text-xs text-gray-500">{formatTime(match.createdAt)}</div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-white font-medium">{team1?.name || 'TBD'}</div>
                              <div className="text-gray-400 text-sm">[{team1?.teamTag}]</div>
                            </div>
                            
                            <div className="text-gray-400 font-bold">VS</div>
                            
                            <div className="text-left">
                              <div className="text-white font-medium">{team2?.name || 'TBD'}</div>
                              <div className="text-gray-400 text-sm">[{team2?.teamTag}]</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-green-400 font-medium">{timeUntil}</div>
                          <div className="text-gray-400 text-sm">{getMatchStatusText(match)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Matches</h3>
                <p className="text-gray-400">All matches have been completed or scheduled.</p>
              </div>
            )}
          </div>
        )}

        {/* Tournament Schedule Info */}
        <div className="mt-8 bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Schedule Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{tournament.schedule.matchDuration}</div>
              <div className="text-gray-400 text-sm">Match Duration (min)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{tournament.schedule.breakTime}</div>
              <div className="text-gray-400 text-sm">Break Time (min)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{tournament.schedule.maxMatchesPerDay}</div>
              <div className="text-gray-400 text-sm">Max Matches/Day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{tournament.schedule.checkInTime}</div>
              <div className="text-gray-400 text-sm">Check-in Time (min)</div>
            </div>
          </div>
          
          {tournament.schedule.preferredMatchTimes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Preferred Match Times</h3>
              <div className="flex flex-wrap gap-2">
                {tournament.schedule.preferredMatchTimes.map((time, index) => (
                  <span key={index} className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-300">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentSchedule; 