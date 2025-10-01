import React from 'react';
import type { SwissStanding, Team } from '../types/tournament';

interface SwissStandingsProps {
  standings: SwissStanding[];
  teams: Team[];
  currentRound: number;
  totalRounds: number;
  teamsAdvancingToPlayoffs: number;
}

const SwissStandings: React.FC<SwissStandingsProps> = ({
  standings,
  teams,
  currentRound,
  totalRounds,
  teamsAdvancingToPlayoffs
}) => {
  const sortedStandings = [...standings].sort((a, b) => {
    console.log(`🔍 Comparing teams:`, {
      teamA: a.teamId,
      teamB: b.teamId,
      aStats: {
        points: a.points,
        matchWins: a.matchWins,
        matchLosses: a.matchLosses,
        gameWins: a.gameWins,
        roundsWon: a.roundsWon,
        roundsLost: a.roundsLost,
        buchholzScore: a.buchholzScore
      },
      bStats: {
        points: b.points,
        matchWins: b.matchWins,
        matchLosses: b.matchLosses,
        gameWins: b.gameWins,
        roundsWon: b.roundsWon,
        roundsLost: b.roundsLost,
        buchholzScore: b.buchholzScore
      }
    });

    // First by points
    if (a.points !== b.points) {
      console.log(`📊 Points differ: ${a.points} vs ${b.points}, returning ${b.points - a.points}`);
      return b.points - a.points;
    }
    
    // Then by match wins
    if (a.matchWins !== b.matchWins) {
      console.log(`🏆 Match wins differ: ${a.matchWins} vs ${b.matchWins}, returning ${b.matchWins - a.matchWins}`);
      return b.matchWins - a.matchWins;
    }
    
    // Then by game wins
    if (a.gameWins !== b.gameWins) {
      console.log(`🎮 Game wins differ: ${a.gameWins} vs ${b.gameWins}, returning ${b.gameWins - a.gameWins}`);
      return b.gameWins - a.gameWins;
    }
    
    // Then by game losses (fewer losses = better rank)
    if (a.gameLosses !== b.gameLosses) {
      console.log(`❌ Game losses differ: ${a.gameLosses} vs ${b.gameLosses}, returning ${a.gameLosses - b.gameLosses}`);
      return a.gameLosses - b.gameLosses;
    }
    
    // Then by match losses (fewer losses = better rank)
    if (a.matchLosses !== b.matchLosses) {
      console.log(`❌ Match losses differ: ${a.matchLosses} vs ${b.matchLosses}, returning ${a.matchLosses - b.matchLosses}`);
      return a.matchLosses - b.matchLosses;
    }
    
    // Then by rounds differential
    const aRoundsDiff = (a.roundsWon ?? 0) - (a.roundsLost ?? 0);
    const bRoundsDiff = (b.roundsWon ?? 0) - (b.roundsLost ?? 0);
    
    // Special case: teams with 0 losses should always rank higher than teams with losses
    const aHasLosses = (a.roundsLost ?? 0) > 0;
    const bHasLosses = (b.roundsLost ?? 0) > 0;
    
    if (aHasLosses !== bHasLosses) {
      console.log(`🔥 Loss status differs: A has losses: ${aHasLosses}, B has losses: ${bHasLosses}, returning ${aHasLosses ? 1 : -1}`);
      // If one team has losses and the other doesn't, the one without losses ranks higher
      return aHasLosses ? 1 : -1;
    }
    
    // If both teams have the same loss status, use rounds differential
    if (aRoundsDiff !== bRoundsDiff) {
      console.log(`📈 Rounds diff differs: ${aRoundsDiff} vs ${bRoundsDiff}, returning ${bRoundsDiff - aRoundsDiff}`);
      return bRoundsDiff - aRoundsDiff;
    }
    
    // Then by Buchholz score
    if (a.buchholzScore !== undefined && b.buchholzScore !== undefined) {
      console.log(`🧮 Buchholz differs: ${a.buchholzScore} vs ${b.buchholzScore}, returning ${b.buchholzScore - a.buchholzScore}`);
      return b.buchholzScore - a.buchholzScore;
    }
    
    console.log(`🤝 All stats identical, returning 0 (preserve order)`);
    return 0;
  });

  // Debug: Log final sorted order
  console.log(`🏁 Final sorted standings:`, sortedStandings.map((standing, index) => ({
    rank: index + 1,
    teamId: standing.teamId,
    teamName: teams.find(t => t.id === standing.teamId)?.name || 'Unknown',
    stats: {
      points: standing.points,
      matchWins: standing.matchWins,
      matchLosses: standing.matchLosses,
      gameWins: standing.gameWins,
      roundsWon: standing.roundsWon,
      roundsLost: standing.roundsLost,
      buchholzScore: standing.buchholzScore
    }
  })));

  // Debug: Focus on ranks 18-21
  console.log(`🔍 Focus on ranks 18-21:`, sortedStandings.slice(17, 21).map((standing, index) => ({
    rank: index + 18,
    teamId: standing.teamId,
    teamName: teams.find(t => t.id === standing.teamId)?.name || 'Unknown',
    stats: {
      points: standing.points,
      matchWins: standing.matchWins,
      matchLosses: standing.matchLosses,
      gameWins: standing.gameWins,
      roundsWon: standing.roundsWon,
      roundsLost: standing.roundsLost,
      buchholzScore: standing.buchholzScore
    }
  })));

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getPlayoffStatus = (index: number) => {
    if (index < teamsAdvancingToPlayoffs) {
      return 'bg-green-900/20 border-green-700';
    }
    return '';
  };

  const getPositionBadge = (index: number) => {
    if (index < teamsAdvancingToPlayoffs) {
      return (
        <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
          Playoff
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-black/60 rounded-xl border border-cyan-400/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 border-b border-cyan-400/30">
        <h2 className="text-2xl font-bold text-white mb-2">Swiss System Standings</h2>
        <div className="text-cyan-200">
          Round {currentRound} of {totalRounds} • Top {teamsAdvancingToPlayoffs} teams advance to playoffs
        </div>
      </div>

      {/* Standings - Responsive Design (Cards on Mobile, Table on Desktop) */}
      <div className="p-4">
        {/* Mobile View - Cards */}
        <div className="block lg:hidden space-y-3">
          {sortedStandings.map((standing, index) => (
            <div 
              key={standing.teamId}
              className={`bg-gray-900/50 border rounded-lg p-4 ${getPlayoffStatus(index)} transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold text-cyan-400">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{getTeamName(standing.teamId)}</div>
                    {getPositionBadge(index)}
                  </div>
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {standing.points}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <div className="text-gray-400 text-xs mb-1">Record</div>
                  <div className="text-white font-bold">
                    {standing.matchWins}-{standing.matchLosses}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Games</div>
                  <div className="text-green-400 font-bold">
                    {standing.gameWins}-{standing.gameLosses}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Rounds</div>
                  <div className="text-cyan-400 font-bold">
                    {standing.roundsWon || 0}-{standing.roundsLost || 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View - Compact Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cyan-900/20 border-b border-cyan-400/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-cyan-300 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-cyan-300 uppercase">Team</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-cyan-300 uppercase">Pts</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-cyan-300 uppercase">W-L</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-cyan-300 uppercase">Games</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-cyan-300 uppercase">Rounds</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-cyan-300 uppercase">Buch.</th>
              </tr>
            </thead>
            <tbody className="bg-black/20 divide-y divide-gray-700/50">
              {sortedStandings.map((standing, index) => (
                <tr 
                  key={standing.teamId}
                  className={`hover:bg-cyan-900/10 transition-colors ${getPlayoffStatus(index)}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-lg font-bold text-cyan-400 w-8">
                        #{index + 1}
                      </div>
                      {getPositionBadge(index)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold">
                      {getTeamName(standing.teamId)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-xl font-bold text-cyan-400">
                      {standing.points}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-white font-medium">
                      {standing.matchWins}-{standing.matchLosses}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-sm">
                      <span className="text-green-400 font-medium">{standing.gameWins}</span>
                      <span className="text-gray-500 mx-1">-</span>
                      <span className="text-gray-400 font-medium">{standing.gameLosses}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-sm">
                      <span className="text-green-400 font-medium">{standing.roundsWon || 0}</span>
                      <span className="text-gray-500 mx-1">-</span>
                      <span className="text-red-400 font-medium">{standing.roundsLost || 0}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="text-cyan-300 font-medium text-sm">
                      {standing.buchholzScore?.toFixed(1) || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 bg-cyan-900/20 border-t border-cyan-400/30">
        <div className="text-cyan-200 text-sm">
          <div className="font-medium mb-2">Tiebreaker Order:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Total Points</li>
            <li>Match Wins</li>
            <li>Game Wins</li>
            <li>Rounds Differential (rounds won - rounds lost)</li>
            <li>Buchholz Score (sum of opponents' points)</li>
            <li>Sonneborn-Berger Score (if implemented)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SwissStandings; 