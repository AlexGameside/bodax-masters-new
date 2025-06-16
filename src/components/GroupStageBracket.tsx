import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, ChevronRight, Award, Zap, Clock, CheckCircle, TrendingUp, Eye } from 'lucide-react';
import { getTournamentMatches, getTeamById, getTeams } from '../services/firebaseService';
import type { Match, Team, Tournament } from '../types/tournament';

interface GroupStageBracketProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  currentUser?: any;
}

interface GroupStanding {
  teamId: string;
  team?: Team;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface Group {
  id: string;
  name: string;
  teams: string[];
  standings: GroupStanding[];
  matches: Match[];
}

const GroupStageBracket: React.FC<GroupStageBracketProps> = ({ tournament, matches, teams, currentUser }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standings' | 'matches'>('standings');

  useEffect(() => {
    // Generate groups based on tournament format
    const generatedGroups = generateGroups(tournament, teams, matches);
    setGroups(generatedGroups);
    
    if (generatedGroups.length > 0) {
      setSelectedGroup(generatedGroups[0].id);
    }
  }, [tournament.id, teams, matches]);

  const generateGroups = (tournament: Tournament, allTeams: Team[], allMatches: Match[]): Group[] => {
    const groupCount = tournament.format?.groupStage?.groupCount || 4;
    const teamsPerGroup = tournament.format?.groupStage?.teamsPerGroup || 4;
    const tournamentTeams = allTeams.filter(team => tournament.teams?.includes(team.id));
    
    const groups: Group[] = [];
    
    for (let i = 0; i < groupCount; i++) {
      const groupTeams = tournamentTeams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
      const groupMatches = allMatches.filter(match => 
        match.round === 1 && // Group stage matches are typically round 1
        groupTeams.some(team => team.id === match.team1Id || team.id === match.team2Id)
      );
      
      const standings = calculateGroupStandings(groupTeams, groupMatches);
      
      groups.push({
        id: `group-${i + 1}`,
        name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, D...
        teams: groupTeams.map(team => team.id),
        standings,
        matches: groupMatches
      });
    }
    
    return groups;
  };

  const calculateGroupStandings = (groupTeams: Team[], groupMatches: Match[]): GroupStanding[] => {
    const standings: { [teamId: string]: GroupStanding } = {};
    
    // Initialize standings
    groupTeams.forEach(team => {
      standings[team.id] = {
        teamId: team.id,
        team,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      };
    });
    
    // Calculate standings from matches
    groupMatches.forEach(match => {
      if (match.isComplete && match.team1Id && match.team2Id) {
        const team1Standing = standings[match.team1Id];
        const team2Standing = standings[match.team2Id];
        
        if (team1Standing && team2Standing) {
          team1Standing.played++;
          team2Standing.played++;
          
          team1Standing.goalsFor += match.team1Score;
          team1Standing.goalsAgainst += match.team2Score;
          team2Standing.goalsFor += match.team2Score;
          team2Standing.goalsAgainst += match.team1Score;
          
          if (match.team1Score > match.team2Score) {
            team1Standing.won++;
            team1Standing.points += 3;
            team2Standing.lost++;
          } else if (match.team2Score > match.team1Score) {
            team2Standing.won++;
            team2Standing.points += 3;
            team1Standing.lost++;
          } else {
            team1Standing.drawn++;
            team1Standing.points += 1;
            team2Standing.drawn++;
            team2Standing.points += 1;
          }
        }
      }
    });
    
    // Calculate goal differences
    Object.values(standings).forEach(standing => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    // Sort standings
    return Object.values(standings).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team?.name.localeCompare(b.team?.name || '') || 0;
    });
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

  const getTeamById = (teamId: string | null): Team | undefined => {
    if (!teamId) return undefined;
    return teams.find(team => team.id === teamId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading group stage...</p>
        </div>
      </div>
    );
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
          <p className="text-gray-300 mb-4">Group Stage</p>
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

        {/* Group Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                selectedGroup === group.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('standings')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                viewMode === 'standings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Standings
            </button>
            <button
              onClick={() => setViewMode('matches')}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                viewMode === 'matches'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Matches
            </button>
          </div>
        </div>

        {selectedGroupData && (
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedGroupData.name}</h2>
              <div className="text-gray-400">
                {selectedGroupData.teams.length} teams
              </div>
            </div>

            {viewMode === 'standings' ? (
              /* Standings Table */
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
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroupData.standings.map((standing, index) => (
                      <tr key={standing.teamId} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-4 text-white font-bold">
                          {index + 1}
                          {index < (tournament.format?.groupStage?.teamsAdvancePerGroup || 2) && (
                            <span className="ml-2 text-green-400">●</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {standing.team?.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{standing.team?.name}</div>
                              <div className="text-gray-400 text-sm">[{standing.team?.teamTag}]</div>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Matches Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedGroupData.matches.map((match) => {
                  const team1 = getTeamById(match.team1Id);
                  const team2 = getTeamById(match.team2Id);
                  
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
                          {getMatchStatusText(match)}
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

                      {match.isComplete && match.winnerId && (
                        <div className="mt-3 text-center">
                          <span className="text-green-400 text-sm">
                            Winner: {getTeamById(match.winnerId)?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Knockout Stage Preview */}
        {tournament.format?.knockoutStage && (
          <div className="mt-8 bg-gray-800/50 rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Knockout Stage</h2>
            </div>
            
            <div className="text-center text-gray-300">
              <p>Top {tournament.format.knockoutStage.teamsAdvance} teams from each group will advance to the {tournament.format.knockoutStage.type} stage.</p>
              <p className="mt-2 text-sm text-gray-400">
                {tournament.format.knockoutStage.type === 'single-elimination' ? 'Single Elimination' : 'Double Elimination'} format
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupStageBracket; 