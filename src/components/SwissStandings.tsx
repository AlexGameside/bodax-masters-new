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
    // First by points
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    
    // Then by match wins
    if (a.matchWins !== b.matchWins) {
      return b.matchWins - a.matchWins;
    }
    
    // Then by game wins
    if (a.gameWins !== b.gameWins) {
      return b.gameWins - a.gameWins;
    }
    
    // Then by rounds differential
    const aRoundsDiff = (a.roundsWon || 0) - (a.roundsLost || 0);
    const bRoundsDiff = (b.roundsWon || 0) - (b.roundsLost || 0);
    if (aRoundsDiff !== bRoundsDiff) {
      return bRoundsDiff - aRoundsDiff;
    }
    
    // Then by Buchholz score
    if (a.buchholzScore !== undefined && b.buchholzScore !== undefined) {
      return b.buchholzScore - a.buchholzScore;
    }
    
    return 0;
  });

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

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cyan-900/20">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                W
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                L
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Games W
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Games L
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Rounds W
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Rounds L
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Buchholz
              </th>
            </tr>
          </thead>
          <tbody className="bg-black/40 divide-y divide-cyan-400/20">
            {sortedStandings.map((standing, index) => (
              <tr 
                key={standing.teamId}
                className={`hover:bg-cyan-900/20 transition-colors ${getPlayoffStatus(index)}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-lg font-bold text-cyan-400 mr-3">
                      #{index + 1}
                    </div>
                    {getPositionBadge(index)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-white font-medium">
                    {getTeamName(standing.teamId)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {standing.points}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-white font-medium">
                    {standing.matchWins}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-white font-medium">
                    {standing.matchLosses}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-green-400 font-medium">
                    {standing.gameWins}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-white font-medium">
                    {standing.gameLosses}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-green-400 font-medium">
                    {standing.roundsWon || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-red-400 font-medium">
                    {standing.roundsLost || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-cyan-300 font-medium">
                    {standing.buchholzScore?.toFixed(2) || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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