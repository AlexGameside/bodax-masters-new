import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, ChevronRight, Award, Zap, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { getTournamentMatches, getTeamById, getTeams } from '../services/firebaseService';
import type { Match, Team, Tournament } from '../types/tournament';
import { toast } from 'react-hot-toast';

interface TournamentBracketProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  currentUser?: any;
  onRefresh?: () => void;
  isAdmin?: boolean;
  onCompleteMatch?: (matchId: string, winnerId: string, team1Score: number, team2Score: number) => Promise<void>;
  onRevertMatchResult?: (matchId: string) => Promise<void>;
  onRevertTeamAdvancement?: (matchId: string, teamId: string) => Promise<void>;
  onRevertRound?: (round: number) => Promise<void>;
}

interface BracketMatch {
  match: Match;
  team1?: Team;
  team2?: Team;
  round: number;
  matchNumber: number;
  isWinner?: boolean;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ tournament, matches, teams, currentUser, onRefresh, isAdmin, onCompleteMatch, onRevertMatchResult, onRevertTeamAdvancement, onRevertRound }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Auto-refresh every 5 seconds to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && tournament.status !== 'completed') {
        if (onRefresh) {
          onRefresh();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, tournament.status, tournament.id, onRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  const getTeamById = (teamId: string | null): Team | undefined => {
    if (!teamId) return undefined;
    return teams.find(team => team.id === teamId);
  };

  const getMatchStatusColor = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'map_banning':
        return 'border-blue-500 bg-blue-900/20';
      case 'side_selection':
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
      case 'side_selection':
        return 'Side Selection';
      case 'playing':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  const getMatchStatusIcon = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'map_banning':
        return <Zap className="w-4 h-4 text-blue-400" />;
      case 'side_selection':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'playing':
        return <Zap className="w-4 h-4 text-green-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRounds = () => {
    const maxRound = Math.max(...matches.map(m => m.round));
    const rounds: { [key: string]: BracketMatch[] } = {};
    
    // Check if this is a double elimination tournament
    const isDoubleElimination = matches.some(m => m.tournamentType === 'double-elim');
    
    if (isDoubleElimination) {
      // Get all matches by type
      const winnersMatches = matches.filter(m => m.bracketType === 'winners');
      const losersMatches = matches.filter(m => m.bracketType === 'losers');
      const grandFinals = matches.filter(m => m.bracketType === 'grand_final');
      
      // Process winners bracket
      const maxWinnersRound = Math.max(...winnersMatches.map(m => m.round));
      for (let round = 1; round <= maxWinnersRound; round++) {
        const roundMatches = winnersMatches
          .filter(match => match.round === round)
          .map(match => ({
            match,
            team1: getTeamById(match.team1Id),
            team2: getTeamById(match.team2Id),
            round,
            matchNumber: match.matchNumber,
            isWinner: match.isComplete && !!match.winnerId
          }))
          .sort((a, b) => a.matchNumber - b.matchNumber);

        if (roundMatches.length > 0) {
          rounds[`winners-${round}`] = roundMatches;
        }
      }
      
      // Process losers bracket
      // For N teams in winners bracket first round:
      // LB Round 1: N/4 matches (losers from WB R1)
      // LB Round 2: N/4 matches (winners from LB R1 + losers from WB R2)
      // LB Round 3: N/8 matches (winners from LB R2)
      // And so on...
      const maxLosersRound = Math.max(...losersMatches.map(m => m.round));
      for (let round = 1; round <= maxLosersRound; round++) {
        const roundMatches = losersMatches
          .filter(match => match.round === round)
          .map(match => ({
            match,
            team1: getTeamById(match.team1Id),
            team2: getTeamById(match.team2Id),
            round,
            matchNumber: match.matchNumber,
            isWinner: match.isComplete && !!match.winnerId
          }))
          .sort((a, b) => a.matchNumber - b.matchNumber);

        if (roundMatches.length > 0) {
          rounds[`losers-${round}`] = roundMatches;
        }
      }
      
      // Process grand finals
      if (grandFinals.length > 0) {
        rounds['grand-final'] = grandFinals.map(match => ({
          match,
          team1: getTeamById(match.team1Id),
          team2: getTeamById(match.team2Id),
          round: maxWinnersRound + 1,
          matchNumber: match.matchNumber,
          isWinner: match.isComplete && !!match.winnerId
        }));
      }
    } else {
      // Single elimination or other tournament types
      for (let round = 1; round <= maxRound; round++) {
        rounds[round.toString()] = matches
          .filter(match => match.round === round)
          .map(match => ({
            match,
            team1: getTeamById(match.team1Id),
            team2: getTeamById(match.team2Id),
            round,
            matchNumber: match.matchNumber,
            isWinner: match.isComplete && !!match.winnerId
          }))
          .sort((a, b) => a.matchNumber - b.matchNumber);
      }
    }
    
    return rounds;
  };

  const getRoundName = (roundKey: string, maxRound: number) => {
    // Check if this is a double elimination tournament
    const isDoubleElimination = matches.some(m => m.tournamentType === 'double-elim');
    
    if (isDoubleElimination) {
      if (roundKey.startsWith('winners-')) {
        const round = parseInt(roundKey.split('-')[1]);
        if (round === 1) return 'Winners Round 1';
        if (round === 2) return 'Winners Round 2';
        if (round === 3) return 'Winners Semi-Finals';
        if (round === 4) return 'Winners Finals';
        return `Winners Round ${round}`;
      } else if (roundKey.startsWith('losers-')) {
        const round = parseInt(roundKey.split('-')[1]);
        if (round === 1) return 'Losers Round 1';
        if (round === 2) return 'Losers Round 2';
        if (round === 3) return 'Losers Round 3';
        if (round === 4) return 'Losers Semi-Finals';
        if (round === 5) return 'Losers Finals';
        return `Losers Round ${round}`;
      } else if (roundKey === 'grand-final') {
        return 'Grand Finals';
      }
    } else {
      // Single elimination naming
      const round = parseInt(roundKey);
      if (maxRound <= 1) return 'Finals';
      if (round === maxRound) return 'Finals';
      if (maxRound >= 4 && round === maxRound - 1) return 'Semi Finals';
      if (maxRound >= 4 && round === maxRound - 2) return 'Quarter Finals';
      return `Round ${round}`;
    }
    
    return roundKey;
  };

  const getWinner = (match: Match) => {
    if (!match.isComplete || !match.winnerId) return null;
    return getTeamById(match.winnerId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading tournament bracket...</p>
        </div>
      </div>
    );
  }

  const rounds = getRounds();
  const maxRound = Math.max(...matches.map(m => m.round));

  const renderMatch = (bracketMatch: BracketMatch, matchIdx: number, roundIdx: number, isWinners: boolean, isGrandFinal: boolean) => {
    const { match, team1, team2 } = bracketMatch;
    const winner = getWinner(match);
    const totalRounds = Object.keys(rounds).length;

    return (
      <div
        key={match.id}
        className={`relative p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 cursor-pointer bg-gray-900/80 shadow bracket-match ${getMatchStatusColor(match)} ${
          isWinners ? 'border-green-500/50' :
          isGrandFinal ? 'border-yellow-500/50' :
          'border-red-500/50'
        }`}
        onClick={() => setSelectedMatch(match)}
        style={{ minHeight: '80px' }}
      >
        {/* Vertical connector line below match (except last match) */}
        {roundIdx < totalRounds - 1 && matchIdx % 2 === 0 && (
          <div className="absolute left-1/2 bottom-0 w-0.5 h-8 bg-gray-700 z-0" style={{ transform: 'translateX(-50%)' }}></div>
        )}
        {/* Vertical connector line above match (except first match) */}
        {roundIdx < totalRounds - 1 && matchIdx % 2 === 1 && (
          <div className="absolute left-1/2 top-0 w-0.5 h-8 bg-gray-700 z-0" style={{ transform: 'translateX(-50%)' }}></div>
        )}
        {/* Horizontal connector to next round */}
        {roundIdx < totalRounds - 1 && (
          <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-700 z-0" style={{ transform: 'translateY(-50%)' }}></div>
        )}

        {/* Match Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">
            Match #{match.matchNumber}
          </span>
          <div className="flex items-center space-x-2">
            {isAdmin && !match.isComplete && match.team1Id && match.team2Id && (
              <div className="bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
                ADMIN
              </div>
            )}
            {getMatchStatusIcon(match)}
            <span className="text-xs text-gray-300">
              {getMatchStatusText(match)}
            </span>
          </div>
        </div>

        {/* Revert Actions for Completed Matches (Admin Only) */}
        {isAdmin && match.isComplete && onRevertMatchResult && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRevertMatchResult) {
                  onRevertMatchResult(match.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs border border-red-500 transition-all duration-200"
              title="Revert Match Result"
            >
              Revert Result
            </button>
          </div>
        )}

        {/* Teams */}
        <div className="space-y-2">
          {/* Team 1 */}
          <div className={`flex items-center justify-between p-1 rounded relative ${
            winner?.id === team1?.id ? 'bg-green-900/30 border border-green-500' : 'bg-gray-800/50'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">1</span>
              </div>
              <span className="text-xs font-medium text-white">
                {team1?.name || 'TBD'}
              </span>
              {team1?.teamTag && (
                <span className="text-xs text-gray-400">[{team1.teamTag}]</span>
              )}
              {winner?.id === team1?.id && match.isComplete && (
                <div className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center ml-2">
                  <Award className="w-3 h-3 mr-1" />
                  Winner
                </div>
              )}
            </div>
            {match.isComplete && (
              <span className="text-xs font-bold text-white">
                {match.team1Score}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className={`flex items-center justify-between p-1 rounded relative ${
            winner?.id === team2?.id ? 'bg-green-900/30 border border-green-500' : 'bg-gray-800/50'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">2</span>
              </div>
              <span className="text-xs font-medium text-white">
                {team2?.name || 'TBD'}
              </span>
              {team2?.teamTag && (
                <span className="text-xs text-gray-400">[{team2.teamTag}]</span>
              )}
              {winner?.id === team2?.id && match.isComplete && (
                <div className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center ml-2">
                  <Award className="w-3 h-3 mr-1" />
                  Winner
                </div>
              )}
            </div>
            {match.isComplete && (
              <span className="text-xs font-bold text-white">
                {match.team2Score}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
          <p className="text-gray-300 mb-4">{tournament.description}</p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center">
              <Trophy className="w-4 h-4 mr-2" />
                  <span>{tournament.format?.type?.replace('-', ' ')?.toUpperCase() || 'UNKNOWN'}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>{tournament.teams?.length || 0} Teams</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{tournament.status}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 border border-gray-600 hover:border-gray-500"
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bracket Container */}
        <div className="overflow-x-auto py-4">
          {/* Double Elimination Layout */}
          {matches.some(m => m.tournamentType === 'double-elim') ? (
            <div className="flex flex-col space-y-12">
              {/* Winners Bracket */}
              <div className="flex space-x-8 min-w-max items-stretch">
                {Object.entries(rounds)
                  .filter(([key]) => key.startsWith('winners-'))
                  .map(([roundKey, roundMatches], roundIdx) => (
                    <div key={roundKey} className="flex flex-col items-center min-w-[220px] px-2 relative">
                      {/* Winners Bracket Header */}
                      <div className="text-center mb-4 w-full">
                        <div className="bg-green-900/30 border border-green-500 rounded-lg px-3 py-1 mb-2">
                          <span className="text-green-400 font-bold text-sm">WINNERS BRACKET</span>
                        </div>
                      </div>
                      
                      {/* Round Header */}
                      <div className="text-center mb-2 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1"></div>
                          <h3 className="text-base font-semibold text-white tracking-wide">
                            {getRoundName(roundKey, Object.keys(rounds).length)}
                          </h3>
                          <div className="flex-1 flex justify-end">
                            {isAdmin && onRevertRound && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const roundNumber = parseInt(roundKey.split('-')[1]);
                                  if (!isNaN(roundNumber) && onRevertRound) {
                                    onRevertRound(roundNumber);
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs border border-red-500 transition-all duration-200"
                                title={`Revert Round ${roundKey}`}
                              >
                                Revert Round
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                      </div>

                      {/* Matches */}
                      <div className="space-y-8 relative">
                        {roundMatches.map((bracketMatch, matchIdx) => renderMatch(bracketMatch, matchIdx, roundIdx, true, false))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Losers Bracket */}
              <div className="flex space-x-8 min-w-max items-stretch">
                {Object.entries(rounds)
                  .filter(([key]) => key.startsWith('losers-'))
                  .map(([roundKey, roundMatches], roundIdx) => (
                    <div key={roundKey} className="flex flex-col items-center min-w-[220px] px-2 relative">
                      {/* Losers Bracket Header */}
                      <div className="text-center mb-4 w-full">
                        <div className="bg-red-900/30 border border-red-500 rounded-lg px-3 py-1 mb-2">
                          <span className="text-red-400 font-bold text-sm">LOSERS BRACKET</span>
                        </div>
                      </div>
                      
                      {/* Round Header */}
                      <div className="text-center mb-2 w-full">
                        <h3 className="text-base font-semibold text-white mb-1 tracking-wide">
                          {getRoundName(roundKey, Object.keys(rounds).length)}
                        </h3>
                        <div className="w-full h-1 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                      </div>

                      {/* Matches */}
                      <div className="space-y-8 relative">
                        {roundMatches.map((bracketMatch, matchIdx) => renderMatch(bracketMatch, matchIdx, roundIdx, false, false))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Grand Finals */}
              {rounds['grand-final'] && (
                <div className="flex justify-center">
                  <div className="flex flex-col items-center min-w-[220px] px-2 relative">
                    {/* Grand Finals Header */}
                    <div className="text-center mb-4 w-full">
                      <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg px-3 py-1 mb-2">
                        <span className="text-yellow-400 font-bold text-sm">GRAND FINALS</span>
                      </div>
                    </div>
                    
                    {/* Round Header */}
                    <div className="text-center mb-2 w-full">
                      <h3 className="text-base font-semibold text-white mb-1 tracking-wide">
                        Grand Finals
                      </h3>
                      <div className="w-full h-1 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
                    </div>

                    {/* Matches */}
                    <div className="space-y-8 relative">
                      {rounds['grand-final'].map((bracketMatch, matchIdx) => renderMatch(bracketMatch, matchIdx, 0, false, true))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Single Elimination Layout - Keep existing code */
            <div className="flex space-x-8 min-w-max items-stretch">
              {Object.entries(rounds).map(([roundKey, roundMatches], roundIdx) => (
                <div key={roundKey} className="flex flex-col items-center min-w-[220px] px-2 relative">
                  {/* Round Header */}
                  <div className="text-center mb-2 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1"></div>
                      <h3 className="text-base font-semibold text-white tracking-wide">
                        {getRoundName(roundKey, Object.keys(rounds).length)}
                      </h3>
                      <div className="flex-1 flex justify-end">
                        {isAdmin && onRevertRound && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const roundNumber = parseInt(roundKey);
                              if (!isNaN(roundNumber) && onRevertRound) {
                                onRevertRound(roundNumber);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs border border-red-500 transition-all duration-200"
                            title={`Revert Round ${roundKey}`}
                          >
                            Revert Round
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600"></div>
                  </div>

                  {/* Matches */}
                  <div className="space-y-8 relative">
                    {roundMatches.map((bracketMatch, matchIdx) => renderMatch(bracketMatch, matchIdx, roundIdx, false, false))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Match Details Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Match Details</h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-white mb-2">
                    {getTeamById(selectedMatch.team1Id)?.name || 'TBD'} vs {getTeamById(selectedMatch.team2Id)?.name || 'TBD'}
                  </h4>
                  <p className="text-gray-300">Match #{selectedMatch.matchNumber}</p>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Status:</span>
                    <div className="flex items-center space-x-2">
                      {getMatchStatusIcon(selectedMatch)}
                      <span className="text-white">{getMatchStatusText(selectedMatch)}</span>
                    </div>
                  </div>
                  
                  {selectedMatch.isComplete && (
                    <div className="text-center mt-4">
                      <p className="text-gray-300 mb-2">Final Score</p>
                      <div className="text-2xl font-bold text-white">
                        {selectedMatch.team1Score} - {selectedMatch.team2Score}
                      </div>
                      {selectedMatch.winnerId && (
                        <p className="text-green-400 mt-2">
                          Winner: {getTeamById(selectedMatch.winnerId)?.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin Match Completion Controls */}
                {isAdmin && !selectedMatch.isComplete && selectedMatch.team1Id && selectedMatch.team2Id && (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                    <div className="text-red-400 font-bold text-sm mb-3">ADMIN: COMPLETE MATCH</div>
                    
                    {/* Debug Info */}
                    <div className="bg-black/40 rounded-lg p-2 mb-3">
                      <div className="text-gray-300 text-xs space-y-1">
                        <div>Match ID: {selectedMatch.id}</div>
                        <div>Team 1: {getTeamById(selectedMatch.team1Id)?.name} ({selectedMatch.team1Id})</div>
                        <div>Team 2: {getTeamById(selectedMatch.team2Id)?.name} ({selectedMatch.team2Id})</div>
                        <div>Round: {selectedMatch.round}</div>
                        <div>Match Number: {selectedMatch.matchNumber}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            {getTeamById(selectedMatch.team1Id)?.name} Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            defaultValue="13"
                            id="team1Score"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-gray-300 text-xs block mb-1">
                            {getTeamById(selectedMatch.team2Id)?.name} Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            defaultValue="7"
                            id="team2Score"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-gray-300 text-xs block mb-1">Winner</label>
                        <select
                          id="winnerSelect"
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          defaultValue=""
                        >
                          <option value="">Select winner...</option>
                          <option value={selectedMatch.team1Id}>
                            {getTeamById(selectedMatch.team1Id)?.name} (Team 1)
                          </option>
                          <option value={selectedMatch.team2Id}>
                            {getTeamById(selectedMatch.team2Id)?.name} (Team 2)
                          </option>
                        </select>
                      </div>
                      
                      <button
                        onClick={async () => {
                          const team1Score = parseInt((document.getElementById('team1Score') as HTMLInputElement).value);
                          const team2Score = parseInt((document.getElementById('team2Score') as HTMLInputElement).value);
                          const winnerId = (document.getElementById('winnerSelect') as HTMLSelectElement).value;
                          
                          console.log('🔍 DEBUG: Completing match manually:', {
                            matchId: selectedMatch.id,
                            team1Score,
                            team2Score,
                            winnerId
                          });
                          
                          if (!winnerId) {
                            alert('Please select a winner');
                            return;
                          }
                          
                          if (isNaN(team1Score) || isNaN(team2Score)) {
                            alert('Please enter valid scores');
                            return;
                          }
                          
                          if (onCompleteMatch) {
                            try {
                              await onCompleteMatch(selectedMatch.id, winnerId, team1Score, team2Score);
                              setSelectedMatch(null);
                            } catch (error) {
                              console.error('❌ DEBUG: Error completing match:', error);
                              alert('Failed to complete match');
                            }
                          }
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                      >
                        Complete Match
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => {
                        // Navigate to match page
                        window.location.href = `/match/${selectedMatch.id}`;
                      }}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      View Match
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentBracket; 