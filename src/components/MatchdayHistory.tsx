import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, Trophy, Clock, CheckCircle, XCircle, Minus } from 'lucide-react';
import { SwissTournamentService } from '../services/swissTournamentService';
import type { Matchday, Match, Tournament, Team } from '../types/tournament';

interface MatchdayHistoryProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  onUpdate: () => void;
}

const MatchdayHistory: React.FC<MatchdayHistoryProps> = ({
  tournament,
  matches,
  teams,
  onUpdate
}) => {
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadMatchdays();
  }, [tournament.id]);

  const loadMatchdays = async () => {
    try {
      setIsLoading(true);
      
      // Get actual matchdays from the service
      const actualMatchdays = await SwissTournamentService.getAllMatchdays(tournament.id);
      
      if (actualMatchdays.length > 0) {
        setMatchdays(actualMatchdays);
        
        // Set current matchday as default selected
        const currentMatchday = tournament.stageManagement?.swissStage?.currentMatchday || 1;
        setSelectedMatchday(currentMatchday);
      } else {
        // Fallback to mock data if no matchdays exist yet
        const swissConfig = tournament.format.swissConfig;
        if (swissConfig) {
          const mockMatchdays: Matchday[] = [];
          for (let i = 1; i <= swissConfig.rounds; i++) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + (i - 1) * 7);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            
            mockMatchdays.push({
              id: `matchday-${i}`,
              tournamentId: tournament.id,
              matchdayNumber: i,
              startDate,
              endDate,
              matches: matches.filter(m => m.matchday === i).map(m => m.id),
              isComplete: false,
              schedulingDeadline: endDate, // Teams must play by the end of the matchday
              // autoScheduleTime removed - no auto-scheduling
            });
          }
          setMatchdays(mockMatchdays);
          
          // Set current matchday as default selected
          const currentMatchday = tournament.stageManagement?.swissStage?.currentMatchday || 1;
          setSelectedMatchday(currentMatchday);
        }
      }
    } catch (error) {
      setError('Failed to load matchdays');

    } finally {
      setIsLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getTeamTag = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.teamTag || '???';
  };

  const getMatchdayMatches = (matchdayNumber: number) => {
    return matches.filter(m => m.matchday === matchdayNumber);
  };

  const getMatchdayStatus = (matchday: Matchday) => {
    const matchdayMatches = getMatchdayMatches(matchday.matchdayNumber);
    const completedMatches = matchdayMatches.filter(m => m.isComplete);
    const totalMatches = matchdayMatches.length;
    
    if (matchday.isComplete || completedMatches.length === totalMatches) {
      return { status: 'completed', color: 'bg-green-600', text: 'Completed', icon: CheckCircle };
    }
    
    if (completedMatches.length > 0) {
      return { status: 'in-progress', color: 'bg-blue-600', text: 'In Progress', icon: Clock };
    }
    
    return { status: 'pending', color: 'bg-yellow-600', text: 'Pending', icon: Minus };
  };

  const formatDate = (date: Date | string | any | undefined) => {
    if (!date) return 'TBD';
    
    try {
      let dateObj: Date;
      
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'TBD';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'TBD';
      }
      
      return new Intl.DateTimeFormat('de-DE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      }).format(dateObj);
    } catch (error) {
      return 'TBD';
    }
  };

  const getMatchResult = (match: Match) => {
    if (!match.isComplete) {
      return { status: 'pending', text: 'Not Played', color: 'text-gray-400' };
    }
    
    if (match.winnerId === match.team1Id) {
      return { 
        status: 'team1-win', 
        text: `${getTeamTag(match.team1Id!)} ${match.team1Score}-${match.team2Score}`,
        color: 'text-green-400',
        winner: match.team1Id
      };
    } else if (match.winnerId === match.team2Id) {
      return { 
        status: 'team2-win', 
        text: `${getTeamTag(match.team2Id!)} ${match.team2Score}-${match.team1Score}`,
        color: 'text-green-400',
        winner: match.team2Id
      };
    } else {
      return { status: 'draw', text: 'Draw', color: 'text-yellow-400' };
    }
  };

  const getMatchdaySummary = (matchdayNumber: number) => {
    const matchdayMatches = getMatchdayMatches(matchdayNumber);
    const completedMatches = matchdayMatches.filter(m => m.isComplete);
    const totalMatches = matchdayMatches.length;
    
    if (totalMatches === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const percentage = Math.round((completedMatches.length / totalMatches) * 100);
    return {
      completed: completedMatches.length,
      total: totalMatches,
      percentage
    };
  };

  if (isLoading) {
    return (
      <div className="bg-black/60 rounded-xl p-6 border border-cyan-400/30 backdrop-blur-sm">
        <div className="text-center text-cyan-200">Loading matchday history...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 border-b border-cyan-400/30">
        <h2 className="text-2xl font-bold text-white mb-2">Matchday History</h2>
        <div className="text-cyan-200">
          Swiss System Tournament • Complete Match History
        </div>
      </div>

      {/* Matchday Selection */}
      <div className="p-6 border-b border-cyan-400/30">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-white font-medium">Select Matchday:</span>
          <div className="flex gap-2">
            {matchdays.map((matchday) => {
              const status = getMatchdayStatus(matchday);
              const summary = getMatchdaySummary(matchday.matchdayNumber);
              const isSelected = selectedMatchday === matchday.matchdayNumber;
              
              return (
                <button
                  key={matchday.id}
                  onClick={() => setSelectedMatchday(matchday.matchdayNumber)}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isSelected 
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200' 
                      : 'border-gray-600 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <status.icon className="w-4 h-4" />
                    <span className="font-medium">MD {matchday.matchdayNumber}</span>
                    <span className="text-xs">({summary.completed}/{summary.total})</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Matchday Details */}
      {selectedMatchday && (
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Matchday {selectedMatchday} Details
            </h3>
            
            {/* Matchday Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Date Range
                </div>
                <div className="text-white font-medium">
                  {(() => {
                    const matchday = matchdays.find(m => m.matchdayNumber === selectedMatchday);
                    if (matchday) {
                      return `${formatDate(matchday.startDate)} - ${formatDate(matchday.endDate)}`;
                    }
                    return 'TBD';
                  })()}
                </div>
              </div>
              
              <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Matches
                </div>
                <div className="text-white font-medium">
                  {(() => {
                    const summary = getMatchdaySummary(selectedMatchday);
                    return `${summary.completed}/${summary.total} (${summary.percentage}%)`;
                  })()}
                </div>
              </div>
              
              <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
                  <Trophy className="w-4 h-4" />
                  Status
                </div>
                <div className="text-white font-medium">
                  {(() => {
                    const matchday = matchdays.find(m => m.matchdayNumber === selectedMatchday);
                    if (matchday) {
                      const status = getMatchdayStatus(matchday);
                      return status.text;
                    }
                    return 'Unknown';
                  })()}
                </div>
              </div>
              
              <div className="bg-black/40 border border-cyan-400/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-cyan-200 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Deadline
                </div>
                <div className="text-white font-medium">
                  {(() => {
                    const matchday = matchdays.find(m => m.matchdayNumber === selectedMatchday);
                    if (matchday) {
                      return formatDate(matchday.schedulingDeadline);
                    }
                    return 'TBD';
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">Match Results</h4>
            
            {(() => {
              const matchdayMatches = getMatchdayMatches(selectedMatchday);
              
              if (matchdayMatches.length === 0) {
                return (
                  <div className="text-center text-gray-400 py-8">
                    No matches found for Matchday {selectedMatchday}
                  </div>
                );
              }
              
              return matchdayMatches.map((match) => {
                const result = getMatchResult(match);
                const team1Name = match.team1Id ? getTeamName(match.team1Id) : 'TBD';
                const team2Name = match.team2Id ? getTeamName(match.team2Id) : 'TBD';
                const team1Tag = match.team1Id ? getTeamTag(match.team1Id) : '???';
                const team2Tag = match.team2Id ? getTeamTag(match.team2Id) : '???';
                
                return (
                  <div 
                    key={match.id}
                    className="bg-black/40 border border-cyan-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      {/* Teams */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-white font-medium text-lg">{team1Name}</div>
                          <div className="text-cyan-300 text-sm font-mono">{team1Tag}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">VS</div>
                          <div className="text-xs text-gray-400">Match #{match.matchNumber}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-white font-medium text-lg">{team2Name}</div>
                          <div className="text-cyan-300 text-sm font-mono">{team2Tag}</div>
                        </div>
                      </div>
                      
                      {/* Result */}
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${result.color}`}>
                          {result.text}
                        </div>
                        <div className="text-xs text-gray-400">
                          {match.isComplete ? 'Completed' : 'Not Played'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Match Info */}
                    {match.isComplete && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Match State</div>
                            <div className="text-white font-medium">{match.matchState}</div>
                          </div>
                          
                          <div>
                            <div className="text-gray-400">Round</div>
                            <div className="text-white font-medium">{match.round}</div>
                          </div>
                          
                          <div>
                            <div className="text-gray-400">Winner</div>
                            <div className="text-green-400 font-medium">
                              {result.winner ? getTeamName(result.winner) : 'N/A'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-gray-400">Score</div>
                            <div className="text-white font-medium">
                              {match.team1Score} - {match.team2Score}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Navigation Help */}
      <div className="p-6 bg-gray-700 border-t border-gray-600">
        <div className="text-gray-300 text-sm">
          <div className="font-medium mb-2">Matchday History Features:</div>
          <ul className="space-y-1 text-xs">
            <li>• View complete match history for each matchday</li>
            <li>• See who played who and final scores</li>
            <li>• Track matchday completion progress</li>
            <li>• Review scheduling deadlines and auto-schedule times</li>
            <li>• Monitor tournament progression through Swiss rounds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MatchdayHistory;
