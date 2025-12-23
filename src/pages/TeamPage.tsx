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
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
             style={{
               backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }} />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white font-mono uppercase tracking-widest">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
             style={{
               backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }} />
        <div className="relative z-10 text-center">
          <p className="text-white text-xl mb-4 font-bodax uppercase tracking-wide">{error || 'Team not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#0a0a0a] border border-gray-800 hover:border-red-500 text-white px-4 py-2 rounded-lg transition-colors font-mono uppercase tracking-widest"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getMatchStatus = (match: Match) => {
    if (match.isComplete) return { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700' };
    if (match.scheduledTime) return { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-700' };
    if (match.matchState === 'pending_scheduling') return { label: 'Pending Schedule', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700' };
    if (match.matchState === 'ready_up') return { label: 'Ready Up', color: 'text-red-500', bg: 'bg-red-900/30 border-red-700' };
    if (match.matchState === 'playing') return { label: 'In Progress', color: 'text-red-500', bg: 'bg-red-900/30 border-red-700' };
    return { label: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-900/30 border-gray-800' };
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
      case 'captain': return <Crown className="w-4 h-4 text-red-500" />;
      case 'member': return <Shield className="w-4 h-4 text-red-500" />;
      case 'coach': return <Target className="w-4 h-4 text-red-500" />;
      case 'assistant_coach': return <Target className="w-4 h-4 text-red-500" />;
      case 'manager': return <UserIcon className="w-4 h-4 text-red-500" />;
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
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />
      
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white font-bodax tracking-wide uppercase leading-none">{team.name}</h1>
              <p className="text-gray-400 font-mono uppercase tracking-widest text-sm mt-1">Team Profile</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Team Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Team Overview */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center font-bodax uppercase tracking-wide">
                  <Trophy className="w-6 h-6 mr-2 text-red-500" />
                  Team Overview
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Team Tag:</span>
                    <span className="text-white ml-2 font-medium font-bodax">{team.teamTag}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Members:</span>
                    <span className="text-white ml-2 font-medium font-bodax">{team.members?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Created:</span>
                    <span className="text-white ml-2 font-medium font-mono">
                      {team.createdAt?.toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Owner:</span>
                    <span className="text-white ml-2 font-medium font-mono">
                      {team.members?.find(m => m.userId === team.ownerId)?.userId || 'Unknown'}
                    </span>
                  </div>
                </div>
                {team.description && (
                  <div className="mt-4">
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Description:</span>
                    <p className="text-white mt-1 font-mono">{team.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center font-bodax uppercase tracking-wide">
                  <Users className="w-6 h-6 mr-2 text-red-500" />
                  Team Members
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.members?.map((member, index) => (
                    <div key={index} className="bg-black/30 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className="text-white font-medium font-bodax uppercase tracking-wide">
                            {getRoleLabel(member.role)}
                          </span>
                        </div>
                        {member.userId === team.ownerId && (
                          <span className="text-xs bg-red-900/50 border border-red-700 text-red-400 px-2 py-1 rounded font-mono uppercase tracking-widest">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-white/80 text-sm">
                        <div className="text-white font-medium font-bodax">{userData[member.userId]?.username || 'Unknown User'}</div>
                        <div className="text-gray-400 text-xs font-mono">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Matches */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center font-bodax uppercase tracking-wide">
                  <Calendar className="w-6 h-6 mr-2 text-red-500" />
                  Recent Matches
                </h2>
                <div className="space-y-3">
                  {teamMatches.slice(0, 5).map((match) => {
                    const status = getMatchStatus(match);
                    const result = getMatchResult(match);
                    const isTeam1 = match.team1Id === team.id;
                    const opponentId = isTeam1 ? match.team2Id : match.team1Id;
                    
                    return (
                      <div key={match.id} className="bg-black/30 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-medium font-bodax uppercase tracking-wide">
                            vs {opponentId ? `Team ${opponentId.slice(-4)}` : 'TBD'}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded border ${status.bg} ${status.color} font-mono uppercase tracking-widest`}>
                            {status.label}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-gray-400 font-mono">
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
                            <div className={`font-bold ${result.color} font-mono`}>
                              {result.result} ({result.score})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {teamMatches.length === 0 && (
                    <div className="text-gray-400 text-center py-4 font-mono uppercase tracking-widest">
                      No matches found for this team
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Team Stats */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h3 className="text-lg font-bold text-white mb-4 font-bodax uppercase tracking-wide">Team Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Total Matches:</span>
                    <span className="text-white font-medium font-bodax">{teamMatches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Completed:</span>
                    <span className="text-white font-medium font-bodax">
                      {teamMatches.filter(m => m.isComplete).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Scheduled:</span>
                    <span className="text-white font-medium font-bodax">
                      {teamMatches.filter(m => m.scheduledTime).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono uppercase tracking-widest text-xs">Pending Schedule:</span>
                    <span className="text-white font-medium font-bodax">
                      {teamMatches.filter(m => m.matchState === 'pending_scheduling').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {currentUser && (currentUser.id === team.ownerId || currentUser.isAdmin) && (
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
                {/* Grid Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                     style={{
                       backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                       backgroundSize: '40px 40px'
                     }} />
                <div className="relative">
                  <h3 className="text-lg font-bold text-white mb-4 font-bodax uppercase tracking-wide">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full bg-[#0a0a0a] border border-gray-800 hover:border-red-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-mono uppercase tracking-widest">
                      Edit Team
                    </button>
                    <button className="w-full bg-[#0a0a0a] border border-gray-800 hover:border-red-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-mono uppercase tracking-widest">
                      Manage Members
                    </button>
                    {currentUser.isAdmin && (
                      <button className="w-full bg-[#0a0a0a] border border-red-700 hover:border-red-500 text-red-500 px-4 py-2 rounded-lg transition-colors text-sm font-mono uppercase tracking-widest">
                        Admin Actions
                      </button>
                    )}
                  </div>
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