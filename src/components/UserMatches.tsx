import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Users, Play, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Match, Team } from '../types/tournament';
import { Link } from 'react-router-dom';

interface UserMatchesProps {
  userId: string;
  teams: Team[];
  matches: Match[];
}

const UserMatches: React.FC<UserMatchesProps> = ({ userId, teams, matches }) => {
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [userMatches, setUserMatches] = useState<Match[]>([]);

  // Debug logging
  console.log('[UserMatches] Props received:', {
    userId,
    teamsCount: teams.length,
    teams: teams.map(t => ({ id: t.id, name: t.name })),
    matchesCount: matches.length
  });

  useEffect(() => {
    // Find teams the user is a member of
    const userTeamIds = teams.filter(team => 
      team.members.some(member => member.userId === userId)
    );
    setUserTeams(userTeamIds);

    // Find matches involving the user's teams
    const userMatchesList = matches.filter(match => 
      userTeamIds.some(team => 
        match.team1Id === team.id || match.team2Id === team.id
      )
    );
    setUserMatches(userMatchesList);
  }, [userId, teams, matches]);

  const getMatchStatus = (match: Match, userTeamId: string) => {
    const isTeam1 = match.team1Id === userTeamId;
    const userTeamReady = isTeam1 ? match.team1Ready : match.team2Ready;
    const opponentTeamReady = isTeam1 ? match.team2Ready : match.team1Ready;

    if (match.matchState === 'completed') {
      return { status: 'completed', label: 'Completed', color: 'text-gray-400' };
    } else if (match.matchState === 'playing') {
      return { status: 'playing', label: 'In Progress', color: 'text-blue-400' };
    } else if (match.matchState === 'map_banning') {
      return { status: 'preparing', label: 'Preparing', color: 'text-purple-400' };
    } else if (match.matchState === 'ready_up') {
      if (userTeamReady && opponentTeamReady) {
        return { status: 'ready', label: 'Ready to Start', color: 'text-green-400' };
      } else if (userTeamReady) {
        return { status: 'waiting', label: 'Waiting for Opponent', color: 'text-yellow-400' };
      } else {
        return { status: 'need-ready', label: 'Ready Up Required', color: 'text-red-400' };
      }
    } else if (match.matchState === 'scheduled') {
      return { status: 'scheduled', label: 'Scheduled', color: 'text-cyan-400' };
    } else if (match.matchState === 'pending_scheduling') {
      return { status: 'pending', label: 'Needs Scheduling', color: 'text-orange-400' };
    } else {
      return { status: 'unknown', label: 'Unknown', color: 'text-gray-400' };
    }
  };

  const getMatchTime = (match: Match) => {
    if (!match.scheduledTime) return 'TBD';
    
    const scheduledTime = match.scheduledTime instanceof Date 
      ? match.scheduledTime 
      : new Date((match.scheduledTime as any).seconds * 1000);
    
    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Now';
    } else if (timeDiff <= 15 * 60 * 1000) { // 15 minutes
      return 'Starting Soon';
    } else if (timeDiff <= 60 * 60 * 1000) { // 1 hour
      const minutes = Math.floor(timeDiff / (60 * 1000));
      return `In ${minutes} min`;
    } else if (timeDiff <= 24 * 60 * 60 * 1000) { // 1 day
      const hours = Math.floor(timeDiff / (60 * 60 * 1000));
      return `In ${hours} hours`;
    } else {
      const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
      return `In ${days} days`;
    }
  };

  const getMatchTeamNames = (match: Match) => {
    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);
    
    console.log('[UserMatches] getMatchTeamNames for match:', match.id, {
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      team1: team1 ? { id: team1.id, name: team1.name } : null,
      team2: team2 ? { id: team2.id, name: team2.name } : null,
      availableTeams: teams.map(t => ({ id: t.id, name: t.name }))
    });
    
    if (!team1 && !team2) {
      return 'Loading teams...';
    }
    
    if (!team1) {
      return `Loading... vs ${team2?.name || 'Unknown Team'}`;
    }
    
    if (!team2) {
      return `${team1.name} vs Loading...`;
    }
    
    return `${team1.name} vs ${team2.name}`;
  };

  const getMatchAction = (match: Match, userTeamId: string) => {
    const matchStatus = getMatchStatus(match, userTeamId);
    
    if (matchStatus.status === 'need-ready') {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Ready Up Now
        </Link>
      );
    } else if (matchStatus.status === 'ready') {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Match
        </Link>
      );
    } else if (matchStatus.status === 'scheduled') {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <Clock className="w-4 h-4 mr-2" />
          View Match
        </Link>
      );
    } else if (matchStatus.status === 'pending') {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Match
        </Link>
      );
    } else if (matchStatus.status === 'playing' || matchStatus.status === 'preparing') {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Join Match
        </Link>
      );
    } else {
      return (
        <Link
          to={`/match/${match.id}`}
          className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          View Details
        </Link>
      );
    }
  };

  // Show loading state if teams are still being fetched
  if (teams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 backdrop-blur-sm rounded-2xl p-8 border border-gray-400/30 shadow-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-2xl font-bold text-white mb-2">Loading Teams...</h3>
          <p className="text-gray-200">Please wait while we fetch team information.</p>
        </div>
      </div>
    );
  }

  if (userTeams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 backdrop-blur-sm rounded-2xl p-8 border border-gray-400/30 shadow-2xl">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-2xl font-bold text-white mb-2">No Teams Found</h3>
          <p className="text-gray-200">You are not a member of any teams yet.</p>
        </div>
      </div>
    );
  }

  // Note: Empty matches are now handled by the parent MyMatches component
  // This component only renders when there are actual matches to show

  // Sort matches by scheduled time (closest first)
  const sortedMatches = [...userMatches].sort((a, b) => {
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    
    const timeA = a.scheduledTime instanceof Date ? a.scheduledTime : new Date((a.scheduledTime as any).seconds * 1000);
    const timeB = b.scheduledTime instanceof Date ? b.scheduledTime : new Date((b.scheduledTime as any).seconds * 1000);
    
    return timeA.getTime() - timeB.getTime();
  });

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-indigo-600/10 to-purple-700/10 backdrop-blur-sm rounded-2xl p-8 border border-blue-400/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600/20 p-3 rounded-full">
          <Calendar className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Your Matches</h3>
          <p className="text-blue-200">Manage and join your upcoming matches</p>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {sortedMatches.map((match) => {
          const userTeamId = userTeams.find(team => 
            match.team1Id === team.id || match.team2Id === team.id
          )?.id || '';
          
          const matchStatus = getMatchStatus(match, userTeamId);
          const matchTime = getMatchTime(match);
          const teamNames = getMatchTeamNames(match);
          const matchAction = getMatchAction(match, userTeamId);

          return (
            <div
              key={match.id}
              className="bg-black/60 border border-blue-700/30 rounded-xl p-6 shadow-lg backdrop-blur-sm hover:border-blue-500/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2 rounded-lg">
                    <span className="text-blue-300 text-sm font-medium">#{match.matchNumber}</span>
                  </div>
                  <div className="text-white font-bold text-lg">{teamNames}</div>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${matchStatus.color} bg-opacity-20 border border-current border-opacity-30`}>
                  {matchStatus.label}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300 text-sm">Time:</span>
                  <span className="text-white font-medium">{matchTime}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300 text-sm">Round:</span>
                  <span className="text-white font-medium">R{match.swissRound} • MD{match.matchday}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300 text-sm">Status:</span>
                  <span className="text-white font-medium">{match.matchState}</span>
                </div>
              </div>

              <div className="flex justify-end">
                {matchAction}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserMatches; 