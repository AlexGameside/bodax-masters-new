import React, { useState, useEffect } from 'react';
import { Trophy, Users, Award, TrendingUp, Target, Crown } from 'lucide-react';
import type { Team, Match } from '../types/tournament';

interface TournamentLeaderboardProps {
  teams: Team[];
  matches: Match[];
  tournamentId: string;
}

interface TeamStanding {
  team: Team;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winPercentage: number;
}

const TournamentLeaderboard: React.FC<TournamentLeaderboardProps> = ({ teams, matches, tournamentId }) => {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStandings();
  }, [teams, matches]);

  const calculateStandings = () => {
    const teamStats: { [teamId: string]: TeamStanding } = {};

    // Initialize stats for all teams
    teams.forEach(team => {
      teamStats[team.id] = {
        team,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        winPercentage: 0
      };
    });

    // Calculate stats from matches
    matches.forEach(match => {
      if (match.isComplete && match.team1Id && match.team2Id) {
        const team1Stats = teamStats[match.team1Id];
        const team2Stats = teamStats[match.team2Id];

        if (team1Stats && team2Stats) {
          team1Stats.played++;
          team2Stats.played++;

          team1Stats.goalsFor += match.team1Score;
          team1Stats.goalsAgainst += match.team2Score;
          team2Stats.goalsFor += match.team2Score;
          team2Stats.goalsAgainst += match.team1Score;

          if (match.team1Score > match.team2Score) {
            team1Stats.won++;
            team1Stats.points += 3;
            team2Stats.lost++;
          } else if (match.team2Score > match.team1Score) {
            team2Stats.won++;
            team2Stats.points += 3;
            team1Stats.lost++;
          } else {
            team1Stats.drawn++;
            team1Stats.points += 1;
            team2Stats.drawn++;
            team2Stats.points += 1;
          }
        }
      }
    });

    // Calculate goal differences and win percentages
    Object.values(teamStats).forEach(stats => {
      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
      stats.winPercentage = stats.played > 0 ? (stats.won / stats.played) * 100 : 0;
    });

    // Sort standings
    const sortedStandings = Object.values(teamStats).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.winPercentage !== b.winPercentage) return b.winPercentage - a.winPercentage;
      return a.team.name.localeCompare(b.team.name);
    });

    setStandings(sortedStandings);
    setLoading(false);
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-2 rounded-lg">
            <Crown className="w-4 h-4 text-gray-900" />
          </div>
        );
      case 2:
        return (
          <div className="bg-gradient-to-r from-gray-300 to-gray-400 p-2 rounded-lg">
            <Award className="w-4 h-4 text-gray-900" />
          </div>
        );
      case 3:
        return (
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-2 rounded-lg">
            <Trophy className="w-4 h-4 text-gray-900" />
          </div>
        );
      default:
        return (
          <div className="bg-gray-700 p-2 rounded-lg">
            <span className="text-white font-bold text-sm">#{position}</span>
          </div>
        );
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'border-yellow-500/50 bg-yellow-900/10';
      case 2:
        return 'border-gray-400/50 bg-gray-800/20';
      case 3:
        return 'border-orange-500/50 bg-orange-900/10';
      default:
        return 'border-gray-600/30 bg-gray-700/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Calculating standings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Total Teams</div>
              <div className="text-white font-semibold text-2xl">{teams.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Matches Played</div>
              <div className="text-white font-semibold text-2xl">{matches.filter(m => m.isComplete).length}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Total Goals</div>
              <div className="text-white font-semibold text-2xl">
                {matches.reduce((total, match) => total + (match.team1Score || 0) + (match.team2Score || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Leader</div>
              <div className="text-white font-semibold text-lg">
                {standings[0]?.team.name || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Final Standings</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="pb-3 text-gray-300 font-semibold">Pos</th>
                <th className="pb-3 text-gray-300 font-semibold">Team</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">P</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">W</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">D</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">L</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">GF</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">GA</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">GD</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">Pts</th>
                <th className="pb-3 text-gray-300 font-semibold text-center">Win %</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr 
                  key={standing.team.id} 
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${getPositionColor(index + 1)}`}
                >
                  <td className="py-4">
                    <div className="flex items-center space-x-3">
                      {getPositionBadge(index + 1)}
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {standing.team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{standing.team.name}</div>
                        <div className="text-gray-400 text-sm">[{standing.team.teamTag}]</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-white text-center">{standing.played}</td>
                  <td className="py-4 text-green-400 text-center">{standing.won}</td>
                  <td className="py-4 text-yellow-400 text-center">{standing.drawn}</td>
                  <td className="py-4 text-red-400 text-center">{standing.lost}</td>
                  <td className="py-4 text-white text-center">{standing.goalsFor}</td>
                  <td className="py-4 text-white text-center">{standing.goalsAgainst}</td>
                  <td className="py-4 text-white text-center">{standing.goalDifference}</td>
                  <td className="py-4 text-white font-bold text-center">{standing.points}</td>
                  <td className="py-4 text-white text-center">{standing.winPercentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prize Distribution */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-xl">
            <Trophy className="w-6 h-6 text-gray-900" />
          </div>
          <h2 className="text-2xl font-bold text-white">Tournament Results</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {standings.slice(0, 3).map((standing, index) => (
            <div key={standing.team.id} className="text-center">
              <div className="mb-4">
                {getPositionBadge(index + 1)}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{standing.team.name}</h3>
              <div className="text-gray-400 text-sm mb-3">[{standing.team.teamTag}]</div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-300">
                  <span className="text-gray-400">Record:</span> {standing.won}W - {standing.lost}L - {standing.drawn}D
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Points:</span> {standing.points}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Goal Diff:</span> {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentLeaderboard; 