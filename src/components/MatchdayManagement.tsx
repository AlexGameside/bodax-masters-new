import React, { useState, useEffect } from 'react';
import { SwissTournamentService, MatchSchedulingService } from '../services/swissTournamentService';
import type { Matchday, Match, Tournament } from '../types/tournament';

interface MatchdayManagementProps {
  tournament: Tournament;
  matches: Match[];
  onUpdate: () => void;
}

const MatchdayManagement: React.FC<MatchdayManagementProps> = ({
  tournament,
  matches,
  onUpdate
}) => {
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [currentMatchday, setCurrentMatchday] = useState<Matchday | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadMatchdays();
  }, [tournament.id]);

  const loadMatchdays = async () => {
    try {
      setIsLoading(true);
      // This would need to be implemented in the service
      // For now, we'll create mock data based on tournament config
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
        
        const current = mockMatchdays.find(m => !m.isComplete);
        setCurrentMatchday(current || null);
      }
    } catch (error) {
      setError('Failed to load matchdays');
    } finally {
      setIsLoading(false);
    }
  };

  const advanceToNextRound = async () => {
    if (!currentMatchday || !tournament.stageManagement?.swissStage) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const currentRound = tournament.stageManagement.swissStage.currentRound;
      
      // Mark current matchday as complete
      const updatedMatchdays = matchdays.map(m => 
        m.matchdayNumber === currentMatchday.matchdayNumber 
          ? { ...m, isComplete: true }
          : m
      );
      setMatchdays(updatedMatchdays);
      
      // Generate next round
      await SwissTournamentService.generateNextSwissRound(tournament.id, currentRound);
      
      setSuccess(`Advanced to Round ${currentRound + 1}`);
      onUpdate();
      
      // Load updated matchdays
      await loadMatchdays();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to advance round');
    } finally {
      setIsLoading(false);
    }
  };

  // Note: Auto-scheduling has been removed as per requirements
  // Teams must schedule their own matches within the 7-day window

  const getMatchdayStatus = (matchday: Matchday) => {
    const matchdayMatches = matches.filter(m => m.matchday === matchday.matchdayNumber);
    const scheduledMatches = matchdayMatches.filter(m => m.matchState === 'scheduled');
    const pendingMatches = matchdayMatches.filter(m => m.matchState === 'pending_scheduling');
    
    if (matchday.isComplete) {
      return { status: 'completed', color: 'bg-green-600', text: 'Completed' };
    }
    
    if (scheduledMatches.length === matchdayMatches.length) {
      return { status: 'ready', color: 'bg-blue-600', text: 'Ready to Play' };
    }
    
    if (pendingMatches.length > 0) {
      return { status: 'pending', color: 'bg-yellow-600', text: `${pendingMatches.length} Pending` };
    }
    
    return { status: 'partial', color: 'bg-orange-600', text: 'Partially Scheduled' };
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
      
      return new Intl.DateTimeFormat('de-DE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'TBD';
    }
  };

  const formatDateRange = (start: Date, end: Date) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-black/60 rounded-xl p-6 border border-pink-400/30 backdrop-blur-sm">
        <div className="text-center text-pink-200">Loading matchday management...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/60 rounded-xl border border-pink-400/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 border-b border-pink-400/30">
        <h2 className="text-2xl font-bold text-white mb-2">Matchday Management</h2>
        <div className="text-pink-200">
          Swiss System Tournament • {tournament.format.swissConfig?.rounds || 0} Rounds
        </div>
      </div>

      {/* Current Matchday Status */}
      {currentMatchday && (
        <div className="p-6 border-b border-pink-400/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">
              Matchday {currentMatchday.matchdayNumber}
            </h3>
                      <div className="flex gap-3">
            <button
              onClick={advanceToNextRound}
              disabled={isLoading || !currentMatchday.isComplete}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Advance to Next Round
            </button>
          </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4">
              <div className="text-pink-200 text-sm">Date Range</div>
              <div className="text-white font-medium">
                {formatDateRange(currentMatchday.startDate, currentMatchday.endDate)}
              </div>
            </div>
            
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4">
              <div className="text-pink-200 text-sm">Scheduling Deadline</div>
              <div className="text-white font-medium">
                {formatDate(currentMatchday.schedulingDeadline)}
              </div>
            </div>
            
            <div className="bg-black/40 border border-pink-400/20 rounded-lg p-4">
              <div className="text-pink-200 text-sm">Auto-Schedule</div>
              <div className="text-white font-medium">
                Disabled
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Matchdays */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">All Matchdays</h3>
        <div className="space-y-4">
          {matchdays.map((matchday) => {
            const status = getMatchdayStatus(matchday);
            const matchdayMatches = matches.filter(m => m.matchday === matchday.matchdayNumber);
            const scheduledMatches = matchdayMatches.filter(m => m.matchState === 'scheduled');
            const pendingMatches = matchdayMatches.filter(m => m.matchState === 'pending_scheduling');
            
            return (
              <div 
                key={matchday.id}
                className="bg-black/40 border border-pink-400/20 rounded-lg p-4 hover:border-pink-400/40 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                    <h4 className="text-white font-medium">
                      Matchday {matchday.matchdayNumber}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color} text-white`}>
                      {status.text}
                    </span>
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    {formatDateRange(matchday.startDate, matchday.endDate)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Total Matches</div>
                    <div className="text-white font-medium">{matchdayMatches.length}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Scheduled</div>
                    <div className="text-green-400 font-medium">{scheduledMatches.length}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Pending</div>
                    <div className="text-yellow-400 font-medium">{pendingMatches.length}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Progress</div>
                    <div className="text-white font-medium">
                      {matchdayMatches.length > 0 
                        ? Math.round((scheduledMatches.length / matchdayMatches.length) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
                
                {matchday.matchdayNumber === currentMatchday?.matchdayNumber && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="text-blue-400 text-sm">
                      ⭐ Current Matchday - Teams can schedule matches
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mx-6 mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="mx-6 mb-6 bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="text-green-400">{success}</div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-6 bg-gray-700 border-t border-gray-600">
        <div className="text-gray-300 text-sm">
          <div className="font-medium mb-2">Matchday Management:</div>
          <ul className="space-y-1 text-xs">
            <li>• Each matchday has a 7-day window for teams to schedule matches</li>
            <li>• Teams can send scheduling proposals to opponents</li>
            <li>• Auto-schedule pending matches when deadline approaches</li>
            <li>• Advance to next round when current matchday is complete</li>
            <li>• Top teams advance to playoff bracket after Swiss rounds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MatchdayManagement; 