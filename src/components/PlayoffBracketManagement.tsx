import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  CheckCircle,
  FastForward,
  AlertCircle,
  Award,
  RotateCcw,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SwissTournamentService } from '../services/swissTournamentService';
import { adminResetMatchToPreVeto, adminMoveTeamBetweenMatches } from '../services/firebaseService';
import type { Match, Team, User } from '../types/tournament';

interface PlayoffBracketManagementProps {
  matches: Match[];
  teams: Team[];
  onUpdate: () => void;
  currentUser?: User | null;
}

const PlayoffBracketManagement: React.FC<PlayoffBracketManagementProps> = ({
  matches,
  teams,
  onUpdate,
  currentUser
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [moveTeamMode, setMoveTeamMode] = useState<{ matchId: string; teamId: string; teamSlot: 'team1Id' | 'team2Id' } | null>(null);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<'team1Id' | 'team2Id'>('team1Id');
  const [resettingMatch, setResettingMatch] = useState<string | null>(null);

  const playoffMatches = matches.filter(m => m.tournamentType === 'playoff');
  
  // Group matches by round
  const matchesByRound = playoffMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'TBD';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getRoundName = (round: number) => {
    if (round === 1) return 'Quarter Finals';
    if (round === 2) return 'Semi Finals';
    if (round === 3) return 'Grand Final';
    return `Round ${round}`;
  };

  const handleSetMatchTime = async (match: Match) => {
    if (!scheduledTime) {
      toast.error('Please select a time for the match');
      return;
    }

    setSaving(true);
    try {
      const matchTime = new Date(scheduledTime);
      await SwissTournamentService.setPlayoffMatchTime(match.id, matchTime);
      toast.success('Match time set successfully!');
      setSelectedMatch(null);
      setScheduledTime('');
      onUpdate();
    } catch (error: any) {
      console.error('Error setting match time:', error);
      toast.error(error.message || 'Failed to set match time');
    } finally {
      setSaving(false);
    }
  };

  const handleManualAdvance = async (match: Match) => {
    if (!selectedWinner) {
      toast.error('Please select a winning team');
      return;
    }

    setSaving(true);
    try {
      await SwissTournamentService.manuallyAdvanceTeamInPlayoffs(match.id, selectedWinner);
      toast.success('Team advanced successfully!');
      setSelectedMatch(null);
      setSelectedWinner('');
      onUpdate();
    } catch (error: any) {
      console.error('Error advancing team:', error);
      toast.error(error.message || 'Failed to advance team');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToPreVeto = async (matchId: string) => {
    if (!currentUser?.isAdmin) {
      toast.error('Admin access required');
      return;
    }

    if (!window.confirm('Are you sure you want to reset this match to pre-veto state? This will clear all map bans, side selections, and scores, but keep the teams.')) {
      return;
    }

    setResettingMatch(matchId);
    try {
      await adminResetMatchToPreVeto(matchId, currentUser.id);
      toast.success('Match reset to pre-veto state successfully!');
      onUpdate();
    } catch (error: any) {
      console.error('Error resetting match:', error);
      toast.error(error.message || 'Failed to reset match');
    } finally {
      setResettingMatch(null);
    }
  };

  const handleMoveTeam = async () => {
    if (!currentUser?.isAdmin) {
      toast.error('Admin access required');
      return;
    }

    if (!moveTeamMode || !targetMatchId) {
      toast.error('Please select a target match');
      return;
    }

    if (!window.confirm(`Are you sure you want to move ${getTeamName(moveTeamMode.teamId)} to the target match? This will reset both matches.`)) {
      return;
    }

    setSaving(true);
    try {
      await adminMoveTeamBetweenMatches(
        moveTeamMode.matchId,
        targetMatchId,
        moveTeamMode.teamId,
        targetSlot,
        currentUser.id
      );
      toast.success('Team moved successfully!');
      setMoveTeamMode(null);
      setTargetMatchId('');
      setTargetSlot('team1Id');
      onUpdate();
    } catch (error: any) {
      console.error('Error moving team:', error);
      toast.error(error.message || 'Failed to move team');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'Not set';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchStateColor = (match: Match) => {
    if (match.isComplete) return 'bg-green-900/30 border-green-700';
    if (match.matchState === 'scheduled') return 'bg-blue-900/30 border-blue-700';
    if (!match.team1Id || !match.team2Id) return 'bg-gray-900/30 border-gray-700';
    return 'bg-yellow-900/30 border-yellow-700';
  };

  const getMatchStateText = (match: Match) => {
    if (match.isComplete) return 'Completed';
    if (match.matchState === 'scheduled') return 'Scheduled';
    if (!match.team1Id || !match.team2Id) return 'Awaiting Teams';
    return 'Needs Scheduling';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-white">Playoff Bracket Management</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Set match times and manually advance teams through the bracket
        </p>

        {/* Matches by Round */}
        <div className="space-y-6">
          {Object.entries(matchesByRound)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([round, roundMatches]) => (
              <div key={round} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-blue-400" />
                  <h4 className="text-md font-semibold text-white">{getRoundName(Number(round))}</h4>
                  <span className="text-xs text-gray-400">
                    ({roundMatches.filter(m => m.isComplete).length}/{roundMatches.length} completed)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {roundMatches
                    .sort((a, b) => a.matchNumber - b.matchNumber)
                    .map((match) => (
                      <div
                        key={match.id}
                        className={`p-4 rounded-lg border ${getMatchStateColor(match)}`}
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-gray-400">
                              Match {match.matchNumber}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              match.isComplete
                                ? 'bg-green-600 text-green-100'
                                : match.matchState === 'scheduled'
                                ? 'bg-blue-600 text-blue-100'
                                : 'bg-gray-600 text-gray-100'
                            }`}>
                              {getMatchStateText(match)}
                            </span>
                            {match.matchFormat && (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-600 text-purple-100">
                                {match.matchFormat}
                              </span>
                            )}
                          </div>
                          {match.scheduledTime && (
                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDateTime(match.scheduledTime)}</span>
                            </div>
                          )}
                        </div>

                        {/* Teams */}
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex-1 p-2 rounded ${
                            match.winnerId === match.team1Id ? 'bg-green-900/50 border border-green-700' : 'bg-gray-800'
                          }`}>
                            <div className="text-white font-medium">
                              {getTeamName(match.team1Id)}
                            </div>
                            {match.team1Score !== undefined && (
                              <div className="text-xs text-gray-400">Score: {match.team1Score}</div>
                            )}
                          </div>

                          <div className="px-3 text-gray-400 font-bold">VS</div>

                          <div className={`flex-1 p-2 rounded ${
                            match.winnerId === match.team2Id ? 'bg-green-900/50 border border-green-700' : 'bg-gray-800'
                          }`}>
                            <div className="text-white font-medium">
                              {getTeamName(match.team2Id)}
                            </div>
                            {match.team2Score !== undefined && (
                              <div className="text-xs text-gray-400">Score: {match.team2Score}</div>
                            )}
                          </div>
                        </div>

                        {/* Winner Display */}
                        {match.isComplete && match.winnerId && (
                          <div className="mb-3 p-2 bg-green-900/30 border border-green-700 rounded flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-300">
                              Winner: <span className="font-semibold">{getTeamName(match.winnerId)}</span>
                            </span>
                          </div>
                        )}

                        {/* Admin Controls */}
                        {currentUser?.isAdmin && (
                          <div className="space-y-3 mt-3 pt-3 border-t border-gray-700">
                            {/* Reset to Pre-Veto Button */}
                            {(match.team1Id || match.team2Id) && match.matchState !== 'ready_up' && (
                              <button
                                onClick={() => handleResetToPreVeto(match.id)}
                                disabled={resettingMatch === match.id}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>{resettingMatch === match.id ? 'Resetting...' : 'Reset to Pre-Veto'}</span>
                              </button>
                            )}

                            {/* Move Team Controls */}
                            {!match.isComplete && (match.team1Id || match.team2Id) && (
                              <div className="space-y-2">
                                {moveTeamMode?.matchId === match.id ? (
                                  <div className="p-3 bg-gray-800 rounded-lg space-y-3">
                                    <div className="text-sm text-gray-300">
                                      Moving: <span className="font-semibold">{getTeamName(moveTeamMode.teamId)}</span>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Target Match
                                      </label>
                                      <select
                                        value={targetMatchId}
                                        onChange={(e) => setTargetMatchId(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                      >
                                        <option value="">Select target match...</option>
                                        {playoffMatches
                                          .filter(m => m.id !== match.id && !m.isComplete)
                                          .map(m => (
                                            <option key={m.id} value={m.id}>
                                              Match {m.matchNumber} - Round {m.round} ({getTeamName(m.team1Id)} vs {getTeamName(m.team2Id)})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Target Slot
                                      </label>
                                      <select
                                        value={targetSlot}
                                        onChange={(e) => setTargetSlot(e.target.value as 'team1Id' | 'team2Id')}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                      >
                                        <option value="team1Id">Team 1 Slot</option>
                                        <option value="team2Id">Team 2 Slot</option>
                                      </select>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={handleMoveTeam}
                                        disabled={saving || !targetMatchId}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                                      >
                                        <ArrowRightLeft className="w-4 h-4" />
                                        <span>{saving ? 'Moving...' : 'Move Team'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setMoveTeamMode(null);
                                          setTargetMatchId('');
                                          setTargetSlot('team1Id');
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex space-x-2">
                                    {match.team1Id && (
                                      <button
                                        onClick={() => setMoveTeamMode({ matchId: match.id, teamId: match.team1Id!, teamSlot: 'team1Id' })}
                                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-xs"
                                        title={`Move ${getTeamName(match.team1Id)}`}
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span className="truncate">Move {getTeamName(match.team1Id).substring(0, 10)}</span>
                                      </button>
                                    )}
                                    {match.team2Id && (
                                      <button
                                        onClick={() => setMoveTeamMode({ matchId: match.id, teamId: match.team2Id!, teamSlot: 'team2Id' })}
                                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-xs"
                                        title={`Move ${getTeamName(match.team2Id)}`}
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span className="truncate">Move {getTeamName(match.team2Id).substring(0, 10)}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Standard Match Management */}
                            {!match.isComplete && match.team1Id && match.team2Id && (
                              <div className="space-y-3">
                                {/* Set Match Time */}
                                {selectedMatch?.id === match.id && !match.isComplete ? (
                                  <div className="p-3 bg-gray-800 rounded-lg space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Set Match Time
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Or Manually Advance Team
                                      </label>
                                      <select
                                        value={selectedWinner}
                                        onChange={(e) => setSelectedWinner(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">Select Winner</option>
                                        {match.team1Id && (
                                          <option value={match.team1Id}>{getTeamName(match.team1Id)}</option>
                                        )}
                                        {match.team2Id && (
                                          <option value={match.team2Id}>{getTeamName(match.team2Id)}</option>
                                        )}
                                      </select>
                                    </div>

                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleSetMatchTime(match)}
                                        disabled={saving || !scheduledTime}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                                      >
                                        <Calendar className="w-4 h-4" />
                                        <span>{saving ? 'Saving...' : 'Set Time'}</span>
                                      </button>

                                      <button
                                        onClick={() => handleManualAdvance(match)}
                                        disabled={saving || !selectedWinner}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                                      >
                                        <FastForward className="w-4 h-4" />
                                        <span>{saving ? 'Saving...' : 'Advance Winner'}</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setSelectedMatch(null);
                                          setScheduledTime('');
                                          setSelectedWinner('');
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setSelectedMatch(match)}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                                  >
                                    <Calendar className="w-4 h-4" />
                                    <span>Manage Match</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Awaiting Teams Message */}
                        {(!match.team1Id || !match.team2Id) && !match.isComplete && (
                          <div className="p-2 bg-gray-800 border border-gray-600 rounded flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              Waiting for previous round to complete
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Set match times for scheduled matches</li>
            <li>• Manually advance winners to automatically populate the next round</li>
            <li>• All playoff matches use BO3 format</li>
            <li>• Teams advance automatically when you select a winner</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlayoffBracketManagement;








