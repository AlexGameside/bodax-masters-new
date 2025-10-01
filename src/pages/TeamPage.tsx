import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeamById, getMatches, getPublicUserData } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import type { Team, Match, User } from '../types/tournament';
import { ArrowLeft, Users, Trophy, Calendar, Clock, CheckCircle, XCircle, User as UserIcon, Crown, Shield, Target } from 'lucide-react';

const TeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<{[key: string]: {username: string, riotId: string}}>({});

  useEffect(() => {
    if (!teamId) return;

    const loadTeamData = async () => {
      try {
        setLoading(true);
        
        // Load team data
        const teamData = await getTeamById(teamId);
        if (!teamData) {
          setError('Team not found');
          return;
        }
        setTeam(teamData);

        // Load team matches
        const allMatches = await getMatches();
        const teamMatches = allMatches.filter(match => 
          match.team1Id === teamId || match.team2Id === teamId
        );
        setTeamMatches(teamMatches);

        // Load user data for team members - show usernames for all, but protect emails
        if (teamData.members) {
          const realUserData: {[key: string]: {username: string, riotId: string}} = {};
          
          for (const member of teamData.members) {
            try {
              const userData = await getPublicUserData(member.userId);
              if (userData) {
                realUserData[member.userId] = {
                  username: userData.username,
                  riotId: userData.riotId
                };
              } else {
                // If no public data available, show generic info
                realUserData[member.userId] = {
                  username: 'Player',
                  riotId: 'No Riot ID'
                };
              }
            } catch (error) {

              realUserData[member.userId] = {
                username: 'Player',
                riotId: 'No Riot ID'
              };
            }
          }
          
          setUserData(realUserData);
        }

      } catch (error) {

        setError('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Team not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getMatchStatus = (match: Match) => {
    if (match.isComplete) return { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20' };
    if (match.scheduledTime) return { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/20' };
    if (match.matchState === 'pending_scheduling') return { label: 'Pending Schedule', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    if (match.matchState === 'ready_up') return { label: 'Ready Up', color: 'text-orange-400', bg: 'bg-orange-900/20' };
    if (match.matchState === 'playing') return { label: 'In Progress', color: 'text-purple-400', bg: 'bg-purple-900/20' };
    return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-900/20' };
  };

  const getMatchResult = (match: Match) => {
    if (!match.isComplete) return null;
    
    const isTeam1 = match.team1Id === team.id;
    const teamScore = isTeam1 ? match.team1Score : match.team2Score;
    const opponentScore = isTeam1 ? match.team2Score : match.team1Score;
    
    if (match.winnerId === team.id) {
      return { result: 'W', score: `${teamScore}-${opponentScore}`, color: 'text-green-400' };
    } else if (match.winnerId) {
      return { result: 'L', score: `${teamScore}-${opponentScore}`, color: 'text-red-400' };
    } else {
      return { result: 'D', score: `${teamScore}-${opponentScore}`, color: 'text-gray-400' };
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'captain': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'member': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'coach': return <Target className="w-4 h-4 text-purple-400" />;
      case 'assistant_coach': return <Target className="w-4 h-4 text-purple-400" />;
      case 'manager': return <UserIcon className="w-4 h-4 text-green-400" />;
      default: return <UserIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'captain': return 'Captain';
      case 'member': return 'Player';
      case 'coach': return 'Coach';
      case 'assistant_coach': return 'Assistant Coach';
      case 'manager': return 'Manager';
      default: return 'Member';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              <p className="text-white/80">Team Profile</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Team Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Team Overview */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                Team Overview
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Team Tag:</span>
                  <span className="text-white ml-2 font-medium">{team.teamTag}</span>
                </div>
                <div>
                  <span className="text-white/60">Members:</span>
                  <span className="text-white ml-2 font-medium">{team.members?.length || 0}</span>
                </div>
                <div>
                  <span className="text-white/60">Created:</span>
                  <span className="text-white ml-2 font-medium">
                    {team.createdAt?.toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Owner:</span>
                  <span className="text-white ml-2 font-medium">
                    {team.members?.find(m => m.userId === team.ownerId)?.userId || 'Unknown'}
                  </span>
                </div>
              </div>
              {team.description && (
                <div className="mt-4">
                  <span className="text-white/60">Description:</span>
                  <p className="text-white mt-1">{team.description}</p>
                </div>
              )}
            </div>

            {/* Team Members */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2 text-blue-400" />
                Team Members
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.members?.map((member, index) => (
                  <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(member.role)}
                        <span className="text-white font-medium">
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                      {member.userId === team.ownerId && (
                        <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-white/80 text-sm">
                      <div className="text-white font-medium">{userData[member.userId]?.username || 'Unknown User'}</div>
                      <div className="text-gray-400 text-xs">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Matches */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-green-400" />
                Recent Matches
              </h2>
              <div className="space-y-3">
                {teamMatches.slice(0, 5).map((match) => {
                  const status = getMatchStatus(match);
                  const result = getMatchResult(match);
                  const isTeam1 = match.team1Id === team.id;
                  const opponentId = isTeam1 ? match.team2Id : match.team1Id;
                  
                  return (
                    <div key={match.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">
                          vs {opponentId ? `Team ${opponentId.slice(-4)}` : 'TBD'}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color}`}>
                          {status.label}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-white/60">
                          {match.scheduledTime ? 
                            (() => {
                              try {
                                const date = new Date(match.scheduledTime);
                                if (isNaN(date.getTime())) {
                                  return 'Invalid date';
                                }
                                return date.toLocaleDateString();
                              } catch (error) {
                                return 'Error displaying date';
                              }
                            })() : 
                            'Not scheduled'
                          }
                        </div>
                        {result && (
                          <div className={`font-bold ${result.color}`}>
                            {result.result} ({result.score})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {teamMatches.length === 0 && (
                  <div className="text-white/60 text-center py-4">
                    No matches found for this team
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Team Stats */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Team Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Matches:</span>
                  <span className="text-white font-medium">{teamMatches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Completed:</span>
                  <span className="text-white font-medium">
                    {teamMatches.filter(m => m.isComplete).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Scheduled:</span>
                  <span className="text-white font-medium">
                    {teamMatches.filter(m => m.scheduledTime).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Pending Schedule:</span>
                  <span className="text-white font-medium">
                    {teamMatches.filter(m => m.matchState === 'pending_scheduling').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {currentUser && (currentUser.id === team.ownerId || currentUser.isAdmin) && (
              <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                    Edit Team
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                    Manage Members
                  </button>
                  {currentUser.isAdmin && (
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                      Admin Actions
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPage; 