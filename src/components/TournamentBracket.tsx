import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, ChevronRight, Award, Zap, Clock, CheckCircle, RefreshCw, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { getTournamentMatches, getTeamById, getTeams, adminResetMatchToPreVeto, adminMoveTeamBetweenMatches } from '../services/firebaseService';
import type { Match, Team, Tournament, User } from '../types/tournament';
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
  const [activeTab, setActiveTab] = useState<'winners' | 'losers' | 'grand-finals'>('winners');
  const [moveTeamMode, setMoveTeamMode] = useState<{ matchId: string; teamId: string; teamSlot: 'team1Id' | 'team2Id' } | null>(null);
  const [targetMatchId, setTargetMatchId] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<'team1Id' | 'team2Id'>('team1Id');
  const [resettingMatch, setResettingMatch] = useState<string | null>(null);

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
        return 'Pending';
    }
  };

  const getMatchStatusIcon = (match: Match) => {
    switch (match.matchState) {
      case 'ready_up':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'map_banning':
        return <Zap className="w-4 h-4 text-blue-400" />;
      case 'ready_up':
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
    const isDoubleElimination = matches.some(m => m.bracketType === 'winners' || m.bracketType === 'losers' || m.bracketType === 'grand_final');
    
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
    const isDoubleElimination = matches.some(m => m.bracketType === 'winners' || m.bracketType === 'losers' || m.bracketType === 'grand_final');
    
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

    return (
      <div
        key={match.id}
        className={`relative p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 cursor-pointer bg-gray-900/90 shadow-lg backdrop-blur-sm ${getMatchStatusColor(match)} ${
          isWinners ? 'border-green-500/60 hover:border-green-400' :
          isGrandFinal ? 'border-yellow-500/60 hover:border-yellow-400' :
          'border-red-500/60 hover:border-red-400'
        }`}
        onClick={() => setSelectedMatch(match)}
        style={{ minWidth: '180px', minHeight: '70px' }}
      >

        {/* Match Header */}
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-700/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-300">
              #{match.matchNumber}
            </span>
            {isAdmin && !match.isComplete && match.team1Id && match.team2Id && (
              <div className="bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
                ADMIN
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {getMatchStatusIcon(match)}
            <span className="text-xs text-gray-400">
              {getMatchStatusText(match)}
            </span>
          </div>
        </div>

        {/* Revert Actions for Completed Matches (Admin Only) */}
        {isAdmin && match.isComplete && onRevertMatchResult && (
          <div className="mt-2 pt-1 border-t border-gray-700/50 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRevertMatchResult) {
                  onRevertMatchResult(match.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs font-medium border border-red-500 transition-all duration-200"
              title="Revert Match Result"
            >
              Revert
            </button>
          </div>
        )}

        {/* Teams */}
        <div className="space-y-2">
          {/* Team 1 */}
          <div className={`flex items-center justify-between p-2 rounded-md relative transition-all duration-200 ${
            winner?.id === team1?.id ? 'bg-green-900/40 border border-green-500/60' : 'bg-gray-800/60 hover:bg-gray-700/60'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                winner?.id === team1?.id ? 'bg-green-500' : 'bg-blue-500'
              }`}>
                <span className="text-xs font-bold text-white">1</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                  {team1?.name || 'TBD'}
                </span>
                {team1?.teamTag && (
                  <span className="text-xs text-gray-400">[{team1.teamTag}]</span>
                )}
              </div>
              {winner?.id === team1?.id && match.isComplete && (
                <div className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold flex items-center ml-2">
                  <Award className="w-2 h-2 mr-1" />
                  W
                </div>
              )}
            </div>
            {match.isComplete && (
              <span className="text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded">
                {match.team1Score}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className={`flex items-center justify-between p-2 rounded-md relative transition-all duration-200 ${
            winner?.id === team2?.id ? 'bg-green-900/40 border border-green-500/60' : 'bg-gray-800/60 hover:bg-gray-700/60'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                winner?.id === team2?.id ? 'bg-green-500' : 'bg-gray-600'
              }`}>
                <span className="text-xs font-bold text-white">2</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                  {team2?.name || 'TBD'}
                </span>
                {team2?.teamTag && (
                  <span className="text-xs text-gray-400">[{team2.teamTag}]</span>
                )}
              </div>
              {winner?.id === team2?.id && match.isComplete && (
                <div className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold flex items-center ml-2">
                  <Award className="w-2 h-2 mr-1" />
                  W
                </div>
              )}
            </div>
            {match.isComplete && (
              <span className="text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded">
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
          {matches.some(m => m.bracketType === 'winners' || m.bracketType === 'losers' || m.bracketType === 'grand_final') ? (
            <div className="min-w-max">
              {/* Tournament Title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">{tournament.name}</h2>
                <p className="text-gray-400">Double Elimination Tournament</p>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex justify-center mb-8">
                <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('winners')}
                    className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                      activeTab === 'winners'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Winners Bracket
                  </button>
                  <button
                    onClick={() => setActiveTab('losers')}
                    className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                      activeTab === 'losers'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Losers Bracket
                  </button>
                  {rounds['grand-final'] && (
                    <button
                      onClick={() => setActiveTab('grand-finals')}
                      className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                        activeTab === 'grand-finals'
                          ? 'bg-yellow-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Grand Finals
                    </button>
                  )}
                </div>
              </div>
              
              {/* Winners Bracket Tab */}
              {activeTab === 'winners' && (
                <div className="flex space-x-16 min-w-max items-stretch">
                  {Object.entries(rounds)
                    .filter(([key]) => key.startsWith('winners-'))
                    .map(([roundKey, roundMatches], roundIdx) => (
                      <div key={roundKey} className="flex flex-col items-center">
                        {/* Round Header */}
                        <div className="text-center mb-8 w-full">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {getRoundName(roundKey, Object.keys(rounds).length)}
                          </h3>
                          <div className="w-full h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                        </div>

                        {/* Matches */}
                        <div className="space-y-8 relative">
                          {roundMatches.map((bracketMatch, matchIdx) => (
                            <div key={bracketMatch.match.id} className="relative">
                              {renderMatch(bracketMatch, matchIdx, roundIdx, true, false)}
                              
                              {/* Connection lines to next round */}
                              {roundIdx < Object.entries(rounds).filter(([key]) => key.startsWith('winners-')).length - 1 && (
                                <div className="absolute top-1/2 -right-8 w-16 h-0.5 bg-green-500 transform -translate-y-1/2 z-10"></div>
                              )}
                              
                              {/* Vertical connection lines for pairs */}
                              {roundMatches.length > 1 && matchIdx % 2 === 0 && matchIdx + 1 < roundMatches.length && (
                                <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-green-500 transform -translate-x-1/2 translate-y-4 z-10"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Losers Bracket Tab */}
              {activeTab === 'losers' && (
                <div className="flex space-x-16 min-w-max items-stretch">
                  {Object.entries(rounds)
                    .filter(([key]) => key.startsWith('losers-'))
                    .map(([roundKey, roundMatches], roundIdx) => (
                      <div key={roundKey} className="flex flex-col items-center">
                        {/* Round Header */}
                        <div className="text-center mb-8 w-full">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {getRoundName(roundKey, Object.keys(rounds).length)}
                          </h3>
                          <div className="w-full h-2 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                        </div>

                        {/* Matches */}
                        <div className="space-y-8 relative">
                          {roundMatches.map((bracketMatch, matchIdx) => (
                            <div key={bracketMatch.match.id} className="relative">
                              {renderMatch(bracketMatch, matchIdx, roundIdx, false, false)}
                              
                              {/* Connection lines to next round */}
                              {roundIdx < Object.entries(rounds).filter(([key]) => key.startsWith('losers-')).length - 1 && (
                                <div className="absolute top-1/2 -right-8 w-16 h-0.5 bg-red-500 transform -translate-y-1/2 z-10"></div>
                              )}
                              
                              {/* Vertical connection lines for pairs */}
                              {roundMatches.length > 1 && matchIdx % 2 === 0 && matchIdx + 1 < roundMatches.length && (
                                <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-red-500 transform -translate-x-1/2 translate-y-4 z-10"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Grand Finals Tab */}
              {activeTab === 'grand-finals' && rounds['grand-final'] && (
                <div className="flex justify-center">
                  <div className="flex flex-col items-center">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">Grand Finals</h3>
                      <div className="w-full h-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {rounds['grand-final'].map((bracketMatch, matchIdx) => (
                        <div key={bracketMatch.match.id} className="relative">
                          {renderMatch(bracketMatch, matchIdx, 0, false, true)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Single Elimination Layout - Keep existing code */
            <div className="flex space-x-16 min-w-max items-stretch">
              {Object.entries(rounds).map(([roundKey, roundMatches], roundIdx) => (
                <div key={roundKey} className="flex flex-col items-center min-w-[220px] px-2 relative">
                  {/* Round Header */}
                  <div className="text-center mb-8 w-full">
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
                    {roundMatches.map((bracketMatch, matchIdx) => (
                      <div key={bracketMatch.match.id} className="relative">
                        {renderMatch(bracketMatch, matchIdx, roundIdx, false, false)}
                        
                        {/* Connection lines to next round */}
                        {roundIdx < Object.entries(rounds).length - 1 && (
                          <div className="absolute top-1/2 -right-8 w-16 h-0.5 bg-primary-500 transform -translate-y-1/2 z-10"></div>
                        )}
                        
                        {/* Vertical connection lines for pairs */}
                        {roundMatches.length > 1 && matchIdx % 2 === 0 && matchIdx + 1 < roundMatches.length && (
                          <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-primary-500 transform -translate-x-1/2 translate-y-4 z-10"></div>
                        )}
                      </div>
                    ))}
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

                {/* Admin Reset to Pre-Veto and Move Team Controls */}
                {isAdmin && currentUser && (selectedMatch.team1Id || selectedMatch.team2Id) && (
                  <div className="bg-orange-900/20 border border-orange-500 rounded-lg p-4 space-y-3">
                    <div className="text-orange-400 font-bold text-sm mb-3">ADMIN: MATCH MANAGEMENT</div>
                    
                    {/* Reset to Pre-Veto */}
                    {selectedMatch.matchState !== 'ready_up' && (
                      <button
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to reset this match to pre-veto state? This will clear all map bans, side selections, and scores, but keep the teams.')) {
                            return;
                          }
                          setResettingMatch(selectedMatch.id);
                          try {
                            await adminResetMatchToPreVeto(selectedMatch.id, currentUser.id);
                            toast.success('Match reset to pre-veto state successfully!');
                            setSelectedMatch(null);
                            if (onRefresh) onRefresh();
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to reset match');
                          } finally {
                            setResettingMatch(null);
                          }
                        }}
                        disabled={resettingMatch === selectedMatch.id}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{resettingMatch === selectedMatch.id ? 'Resetting...' : 'Reset to Pre-Veto'}</span>
                      </button>
                    )}

                    {/* Move Team Controls */}
                    {!selectedMatch.isComplete && (selectedMatch.team1Id || selectedMatch.team2Id) && (
                      <div className="space-y-2">
                        {moveTeamMode?.matchId === selectedMatch.id ? (
                          <div className="p-3 bg-gray-800 rounded-lg space-y-3">
                            <div className="text-sm text-gray-300">
                              Moving: <span className="font-semibold">{getTeamById(moveTeamMode.teamId)?.name}</span>
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
                                {matches
                                  .filter(m => m.id !== selectedMatch.id && !m.isComplete && m.tournamentId === tournament.id)
                                  .map(m => (
                                    <option key={m.id} value={m.id}>
                                      Match {m.matchNumber} - Round {m.round} ({getTeamById(m.team1Id)?.name || 'TBD'} vs {getTeamById(m.team2Id)?.name || 'TBD'})
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
                                onClick={async () => {
                                  if (!targetMatchId) {
                                    toast.error('Please select a target match');
                                    return;
                                  }
                                  if (!window.confirm(`Are you sure you want to move ${getTeamById(moveTeamMode.teamId)?.name} to the target match? This will reset both matches.`)) {
                                    return;
                                  }
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
                                    setSelectedMatch(null);
                                    if (onRefresh) onRefresh();
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to move team');
                                  }
                                }}
                                disabled={!targetMatchId}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                <span>Move Team</span>
                              </button>
                              <button
                                onClick={() => {
                                  setMoveTeamMode(null);
                                  setTargetMatchId('');
                                  setTargetSlot('team1Id');
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            {selectedMatch.team1Id && (
                              <button
                                onClick={() => setMoveTeamMode({ matchId: selectedMatch.id, teamId: selectedMatch.team1Id!, teamSlot: 'team1Id' })}
                                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span className="truncate">Move {getTeamById(selectedMatch.team1Id)?.name?.substring(0, 15)}</span>
                              </button>
                            )}
                            {selectedMatch.team2Id && (
                              <button
                                onClick={() => setMoveTeamMode({ matchId: selectedMatch.id, teamId: selectedMatch.team2Id!, teamSlot: 'team2Id' })}
                                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span className="truncate">Move {getTeamById(selectedMatch.team2Id)?.name?.substring(0, 15)}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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