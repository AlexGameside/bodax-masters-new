import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import type { Match, Team, User } from '../types/tournament';
import ReadyUpForm from './ReadyUpForm';

interface MatchReadyUpInterfaceProps {
  match: Match;
  currentTeamId: string;
  teams: Team[];
  teamPlayers: User[];
  onReadyUp: (teamId: string, roster: {
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }) => Promise<void>;
  onStartMatch: () => Promise<void>;
}

const MatchReadyUpInterface: React.FC<MatchReadyUpInterfaceProps> = ({
  match,
  currentTeamId,
  teams,
  teamPlayers,
  onReadyUp,
  onStartMatch
}) => {
  const [timeUntilMatch, setTimeUntilMatch] = useState<number>(0);
  const [timeUntilForfeit, setTimeUntilForfeit] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showReadyUpForm, setShowReadyUpForm] = useState<boolean>(false);

  const currentTeam = teams.find(t => t.id === currentTeamId);
  const opponentTeam = teams.find(t => t.id !== currentTeamId);
  const isTeam1 = match.team1Id === currentTeamId;
  const currentTeamReady = isTeam1 ? match.team1Ready : match.team2Ready;
  const opponentTeamReady = isTeam1 ? match.team2Ready : match.team1Ready;

  console.log('[MatchReadyUpInterface] Props:', {
    currentTeamId,
    currentTeam: currentTeam ? { id: currentTeam.id, name: currentTeam.name } : null,
    teamPlayers: teamPlayers.map(p => ({ id: p.id, username: p.username })),
    currentTeamReady,
    opponentTeamReady,
    matchState: match.matchState
  });

  useEffect(() => {
    const updateTimers = () => {
      const now = new Date();
      
      if (match.scheduledTime) {
        const scheduledTime = match.scheduledTime instanceof Date 
          ? match.scheduledTime 
          : new Date((match.scheduledTime as any).seconds * 1000);
        
        const timeDiff = scheduledTime.getTime() - now.getTime();
        setTimeUntilMatch(Math.max(0, Math.floor(timeDiff / 1000)));
        
        // Forfeit timer starts when match time arrives
        const forfeitTime = new Date(scheduledTime.getTime() + (15 * 60 * 1000)); // 15 minutes after match time
        const forfeitDiff = forfeitTime.getTime() - now.getTime();
        setTimeUntilForfeit(Math.max(0, Math.floor(forfeitDiff / 1000)));
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [match.scheduledTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReadyUp = async (roster: {
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }) => {
    if (isSubmitting) return;
    
    console.log('[READY-UP] Starting ready-up process for team:', currentTeamId);
    console.log('[READY-UP] Roster:', roster);
    console.log('[READY-UP] Can ready up:', canReadyUp);
    console.log('[READY-UP] Current time:', new Date().toISOString());
    console.log('[READY-UP] Ready-up available time:', readyUpAvailableTime.toISOString());
    
    if (!canReadyUp) {
      console.error('[READY-UP] Ready-up not available yet');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onReadyUp(currentTeamId, roster);
      console.log('[READY-UP] Ready-up successful');
      setIsReady(true);
      setShowReadyUpForm(false);
    } catch (error) {
      console.error('Error readying up:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartMatch = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onStartMatch();
    } catch (error) {
      console.error('Error starting match:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStartMatch = currentTeamReady && opponentTeamReady;
  const isReadyUpPhase = timeUntilMatch <= 0; // Ready-up phase starts when match time arrives
  const isForfeitTime = timeUntilForfeit <= 0; // Forfeit time is 15 minutes after match time
  
  // Ready-up becomes available 15 minutes before match time
  const scheduledTime = match.scheduledTime instanceof Date 
    ? match.scheduledTime 
    : new Date((match.scheduledTime as any).seconds * 1000);
  
  const readyUpAvailableTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
  
  const now = new Date();
  const canReadyUp = now >= readyUpAvailableTime;
  const timeUntilReadyUp = Math.max(0, readyUpAvailableTime.getTime() - now.getTime());
  
  console.log('[MatchReadyUpInterface] Time calculations:', {
    scheduledTime: scheduledTime.toISOString(),
    readyUpAvailableTime: readyUpAvailableTime.toISOString(),
    now: now.toISOString(),
    canReadyUp,
    timeUntilReadyUp: Math.floor(timeUntilReadyUp / 1000)
  });

  if (!match.scheduledTime) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/30 shadow-2xl">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h3 className="text-2xl font-bold text-white mb-2">Match Not Scheduled</h3>
          <p className="text-yellow-200">This match has not been scheduled yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-indigo-600/10 to-purple-700/10 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600/20 p-3 rounded-full">
          <Clock className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Match Ready-Up</h3>
          <p className="text-blue-200">Get ready for your upcoming match!</p>
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-black/60 border border-blue-700/30 rounded-xl p-6 mb-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-blue-300 text-sm font-medium">Match #{match.matchNumber}</div>
          <div className="bg-purple-600/20 px-3 py-1 rounded-full text-purple-300 text-xs">
            R{match.swissRound} • MD{match.matchday}
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-bold text-lg">{currentTeam?.name}</div>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-1 rounded-full text-white font-bold text-sm">vs</div>
          <div className="text-white font-bold text-lg">{opponentTeam?.name}</div>
        </div>
        
        {/* Match Time */}
        <div className="text-center">
          <div className="text-blue-300 text-sm mb-2">Match Time</div>
          <div className="text-white text-xl font-bold">
            {match.scheduledTime instanceof Date 
              ? match.scheduledTime.toLocaleString('de-DE', { 
                  timeZone: 'Europe/Berlin',
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date((match.scheduledTime as any).seconds * 1000).toLocaleString('de-DE', {
                  timeZone: 'Europe/Berlin',
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
            }
          </div>
        </div>
      </div>

      {/* Countdown Timers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Time until ready-up */}
        <div className="bg-black/60 border border-green-700/30 rounded-xl p-4 text-center">
          <div className="text-green-300 text-sm mb-2">
            {canReadyUp ? 'Ready-Up Available' : 'Can Ready Up In'}
          </div>
          <div className="text-white text-2xl font-bold font-mono">
            {canReadyUp ? '✅ Now' : formatTime(Math.floor(timeUntilReadyUp / 1000))}
          </div>
        </div>

        {/* Time until match */}
        <div className="bg-black/60 border border-blue-700/30 rounded-xl p-4 text-center">
          <div className="text-blue-300 text-sm mb-2">Match Starts In</div>
          <div className="text-white text-2xl font-bold font-mono">
            {formatTime(timeUntilMatch)}
          </div>
        </div>

        {/* Time until forfeit */}
        <div className="bg-black/60 border border-red-700/30 rounded-xl p-4 text-center">
          <div className="text-red-300 text-sm mb-2">Forfeit In</div>
          <div className="text-white text-2xl font-bold font-mono">
            {timeUntilForfeit > 0 ? formatTime(timeUntilForfeit) : 'Time Up'}
          </div>
        </div>
      </div>

      {/* Ready-Up Status */}
      <div className="bg-black/60 border border-green-700/30 rounded-xl p-6 mb-6 shadow-lg backdrop-blur-sm">
        <div className="text-center mb-4">
          <h4 className="text-lg font-bold text-white mb-2">Ready-Up Status</h4>
          <p className="text-green-200 text-sm">Both teams must be ready to start the match</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Current Team Status */}
          <div className="text-center">
            <div className="text-sm text-gray-300 mb-2">{currentTeam?.name}</div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              currentTeamReady 
                ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
            }`}>
              {currentTeamReady ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Not Ready
                </>
              )}
            </div>
          </div>

          {/* Opponent Team Status */}
          <div className="text-center">
            <div className="text-sm text-gray-300 mb-2">{opponentTeam?.name}</div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              opponentTeamReady 
                ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
            }`}>
              {opponentTeamReady ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Not Ready
                </>
              )}
            </div>
          </div>
        </div>

        {/* Roster Information Display */}
        {(currentTeamReady || opponentTeamReady) && (
          <div className="bg-black/60 border border-blue-700/30 rounded-xl p-4 mb-4">
            <div className="text-center mb-3">
              <h5 className="text-blue-300 font-bold text-sm">Team Rosters</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Team Roster */}
              {currentTeamReady && (
                <div className="text-center">
                  <div className="text-xs text-gray-300 mb-1">{currentTeam?.name}</div>
                  <div className="text-xs text-green-200">
                    {match.team1Roster && match.team1Id === currentTeamId ? (
                      <>
                        {match.team1Roster.mainPlayers.length} main, {match.team1Roster.substitutes.length} subs
                        {match.team1Roster.coach && ', 1 coach'}
                        {match.team1Roster.manager && ', 1 manager'}
                      </>
                    ) : match.team2Roster && match.team2Id === currentTeamId ? (
                      <>
                        {match.team2Roster.mainPlayers.length} main, {match.team2Roster.substitutes.length} subs
                        {match.team2Roster.coach && ', 1 coach'}
                        {match.team2Roster.manager && ', 1 manager'}
                      </>
                    ) : 'Roster loaded'}
                  </div>
                </div>
              )}
              
              {/* Opponent Team Roster */}
              {opponentTeamReady && (
                <div className="text-center">
                  <div className="text-xs text-gray-300 mb-1">{opponentTeam?.name}</div>
                  <div className="text-xs text-green-200">
                    {match.team1Roster && match.team1Id !== currentTeamId ? (
                      <>
                        {match.team1Roster.mainPlayers.length} main, {match.team1Roster.substitutes.length} subs
                        {match.team1Roster.coach && ', 1 coach'}
                        {match.team1Roster.manager && ', 1 manager'}
                      </>
                    ) : match.team2Roster && match.team2Id !== currentTeamId ? (
                      <>
                        {match.team2Roster.mainPlayers.length} main, {match.team2Roster.substitutes.length} subs
                        {match.team2Roster.coach && ', 1 coach'}
                        {match.team2Roster.manager && ', 1 manager'}
                      </>
                    ) : 'Roster loaded'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ready-Up Button */}
        {!currentTeamReady && (
          <div className="text-center">

            {!canReadyUp ? (
              <div className="bg-gray-600/20 border border-gray-500/30 rounded-lg p-4 text-center">
                <div className="text-gray-400 font-bold text-sm mb-2">Ready-Up Not Available Yet</div>
                <div className="text-gray-300 text-xs">
                  You can ready up in {formatTime(Math.floor(timeUntilReadyUp / 1000))}
                </div>

              </div>
            ) : (
              <button
                onClick={() => setShowReadyUpForm(true)}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Readying Up...' : 'Ready Up'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ready-Up Phase Warning */}
      {!canReadyUp && (
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-blue-400 font-bold text-sm">Ready-Up Not Available Yet</div>
              <div className="text-blue-200 text-xs">
                You can ready up starting 15 minutes before the match begins.
              </div>
            </div>
          </div>
        </div>
      )}

      {isReadyUpPhase && !canStartMatch && canReadyUp && (
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-yellow-400 font-bold text-sm">Ready-Up Phase Active</div>
              <div className="text-yellow-200 text-xs">
                Both teams must ready up within 15 minutes or they will forfeit the match.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Match Button */}
      {canStartMatch && (
        <div className="text-center">
          <button
            onClick={handleStartMatch}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center mx-auto"
          >
            <Play className="w-5 h-5 mr-2" />
            {isSubmitting ? 'Starting Match...' : 'Start Match'}
          </button>
        </div>
      )}

      {/* Forfeit Warning */}
      {isForfeitTime && !canStartMatch && (
        <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-lg p-4 text-center">
          <div className="text-red-400 font-bold text-sm mb-2">Forfeit Time Reached</div>
          <div className="text-red-200 text-xs">
            The 15-minute ready-up window has expired. Teams that didn't ready up will forfeit.
          </div>
        </div>
      )}

      {/* Ready-Up Form Modal */}
      {showReadyUpForm && currentTeam && (
        <ReadyUpForm
          team={currentTeam}
          teamPlayers={teamPlayers}
          onSubmit={handleReadyUp}
          onCancel={() => setShowReadyUpForm(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default MatchReadyUpInterface; 