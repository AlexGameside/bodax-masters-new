import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  Users2, 
  Activity, 
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Zap
} from 'lucide-react';
import { getAllUsers, getTeams, getMatches, getTournaments } from '../services/firebaseService';
import type { User, Team, Match, Tournament } from '../types/tournament';

interface StatsData {
  totalUsers: number;
  totalTeams: number;
  totalMatches: number;
  totalTournaments: number;
  liveMatches: number;
  completedMatches: number;
  activeUsers: number;
  registeredTeams: number;
  matchStates: { state: string; count: number; color: string }[];
  userGrowth: { date: string; count: number }[];
  matchActivity: { date: string; count: number }[];
  teamStats: { name: string; memberCount: number }[];
  tournamentStats: { name: string; teamCount: number; status: string }[];
  recentActivity: { type: string; description: string; timestamp: Date }[];
}

function normalizeDate(date: any): Date {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if (typeof date.toDate === 'function') return date.toDate();
  return new Date(date);
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading admin stats...');
      
      // Fetch all data
      const [users, teams, matches, tournaments] = await Promise.all([
        getAllUsers(),
        getTeams(),
        getMatches(),
        getTournaments()
      ]);

      console.log('📊 Data fetched:', {
        users: users.length,
        teams: teams.length,
        matches: matches.length,
        tournaments: tournaments.length
      });

      // Calculate live matches (all active states)
      const liveMatches = matches.filter(match => 
        ['ready_up', 'map_banning', 'side_selection', 'playing', 'waiting_results', 'disputed'].includes(match.matchState || '')
      );

      // Calculate completed matches
      const completedMatches = matches.filter(match => match.isComplete);

      // Calculate active users (users with teams)
      const activeUsers = users.filter(user => user.teamIds && user.teamIds.length > 0);

      // Calculate registered teams
      const registeredTeams = teams.filter(team => team.registeredForTournament);

      // Generate match states breakdown
      const matchStates = [
        { state: 'Ready Up', count: matches.filter(m => m.matchState === 'ready_up').length, color: 'bg-yellow-500' },
        { state: 'Map Banning', count: matches.filter(m => m.matchState === 'map_banning').length, color: 'bg-blue-500' },
        { state: 'Side Selection', count: matches.filter(m => m.matchState === 'side_selection').length, color: 'bg-purple-500' },
        { state: 'Playing', count: matches.filter(m => m.matchState === 'playing').length, color: 'bg-green-500' },
        { state: 'Waiting Results', count: matches.filter(m => m.matchState === 'waiting_results').length, color: 'bg-orange-500' },
        { state: 'Disputed', count: matches.filter(m => m.matchState === 'disputed').length, color: 'bg-red-500' },
        { state: 'Completed', count: completedMatches.length, color: 'bg-emerald-500' },
        { state: 'Scheduled', count: matches.filter(m => m.matchState === 'scheduled').length, color: 'bg-gray-500' }
      ].filter(state => state.count > 0);

      // Generate user growth data
      const userGrowth = generateUserGrowthData(users, timeRange);

      // Generate match activity data
      const matchActivity = generateMatchActivityData(matches, timeRange);

      // Generate team stats (top 10 by member count)
      const teamStats = teams
        .map(team => ({
          name: team.name,
          memberCount: team.members?.length || 0
        }))
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 10);

      // Generate tournament stats
      const tournamentStats = tournaments.map(tournament => ({
        name: tournament.name,
        teamCount: tournament.teams?.length || 0,
        status: tournament.status
      }));

      // Generate recent activity
      const recentActivity = generateRecentActivity(users, teams, matches, tournaments);

      const statsData: StatsData = {
        totalUsers: users.length,
        totalTeams: teams.length,
        totalMatches: matches.length,
        totalTournaments: tournaments.length,
        liveMatches: liveMatches.length,
        completedMatches: completedMatches.length,
        activeUsers: activeUsers.length,
        registeredTeams: registeredTeams.length,
        matchStates,
        userGrowth,
        matchActivity,
        teamStats,
        tournamentStats,
        recentActivity
      };

      console.log('✅ Stats calculated:', statsData);
      setStats(statsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUserGrowthData = (users: User[], range: string): { date: string; count: number }[] => {
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = users.filter(user => {
        const userDate = normalizeDate(user.createdAt);
        return userDate.toISOString().split('T')[0] <= dateStr;
      }).length;
      
      data.push({ date: dateStr, count });
    }
    
    return data;
  };

  const generateMatchActivityData = (matches: Match[], range: string): { date: string; count: number }[] => {
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = matches.filter(match => {
        const matchDate = normalizeDate(match.createdAt);
        return matchDate.toISOString().split('T')[0] === dateStr;
      }).length;
      
      data.push({ date: dateStr, count });
    }
    
    return data;
  };

  const generateRecentActivity = (users: User[], teams: Team[], matches: Match[], tournaments: Tournament[]) => {
    const activity: { type: string; description: string; timestamp: Date }[] = [];
    
    // Add recent user registrations
    const recentUsers = users
      .sort((a, b) => normalizeDate(b.createdAt).getTime() - normalizeDate(a.createdAt).getTime())
      .slice(0, 5);
    
    recentUsers.forEach(user => {
      activity.push({
        type: 'user',
        description: `New user registered: ${user.username}`,
        timestamp: normalizeDate(user.createdAt)
      });
    });

    // Add recent team creations
    const recentTeams = teams
      .sort((a, b) => normalizeDate(b.createdAt).getTime() - normalizeDate(a.createdAt).getTime())
      .slice(0, 5);
    
    recentTeams.forEach(team => {
      activity.push({
        type: 'team',
        description: `New team created: ${team.name}`,
        timestamp: normalizeDate(team.createdAt)
      });
    });

    // Add recent match completions
    const recentMatches = matches
      .filter(m => m.isComplete)
      .sort((a, b) => (normalizeDate(b.resolvedAt).getTime() || 0) - (normalizeDate(a.resolvedAt).getTime() || 0))
      .slice(0, 5);
    
    recentMatches.forEach(match => {
      activity.push({
        type: 'match',
        description: `Match completed: ${match.team1Id} vs ${match.team2Id}`,
        timestamp: normalizeDate(match.resolvedAt) || normalizeDate(match.createdAt)
      });
    });

    // Sort all activity by timestamp
    return activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  };

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; subtitle?: string }> = ({ 
    title, value, icon, color, subtitle 
  }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );

  const SimpleBarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 truncate">{item.label}</span>
                <span className="text-gray-400">{item.value}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const LineChart: React.FC<{ data: { date: string; count: number }[]; color: string; title: string }> = ({ 
    data, color, title 
  }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">No data available for {title}</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.count));
    const minValue = Math.min(...data.map(d => d.count));
    const range = maxValue - minValue;
    
    return (
      <div className="space-y-4">
        <div className="relative h-48">
          <svg className="w-full h-full" viewBox={`0 0 ${data.length * 40} 200`}>
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((point, index) => {
                const x = index * 40 + 20;
                const y = 180 - ((point.count - minValue) / range) * 160;
                return `${x},${y}`;
              }).join(' ')}
            />
            {data.map((point, index) => {
              const x = index * 40 + 20;
              const y = 180 - ((point.count - minValue) / range) * 160;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                />
              );
            })}
          </svg>
        </div>
        <div className="text-xs text-gray-400 text-center">
          {data.length > 0 && (
            <p>Range: {minValue} - {maxValue} | Total: {data.reduce((sum, d) => sum + d.count, 0)}</p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black text-white font-mono p-8">
        <div className="text-center">
          <p className="text-red-500">Failed to load statistics</p>
          <button 
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Statistics</h1>
            <p className="text-gray-400">Comprehensive overview of platform metrics</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Last updated</p>
            <p className="text-sm text-white">{lastUpdated.toLocaleTimeString()}</p>
            <button 
              onClick={loadStats}
              className="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-blue-600"
          subtitle={`${stats.activeUsers} active`}
        />
        <StatCard
          title="Total Teams"
          value={stats.totalTeams}
          icon={<Users2 className="w-6 h-6 text-white" />}
          color="bg-green-600"
          subtitle={`${stats.registeredTeams} registered`}
        />
        <StatCard
          title="Total Matches"
          value={stats.totalMatches}
          icon={<Gamepad2 className="w-6 h-6 text-white" />}
          color="bg-purple-600"
          subtitle={`${stats.completedMatches} completed`}
        />
        <StatCard
          title="Live Matches"
          value={stats.liveMatches}
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-red-600"
          subtitle="Currently active"
        />
      </div>

      {/* Match States Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Match States Breakdown">
          <SimpleBarChart data={stats.matchStates.map(state => ({
            label: state.state,
            value: state.count,
            color: state.color
          }))} />
        </ChartCard>

        <ChartCard title="Tournament Overview">
          <div className="space-y-4">
            {stats.tournamentStats.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No tournaments found</p>
            ) : (
              stats.tournamentStats.map((tournament, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{tournament.name}</p>
                    <p className="text-sm text-gray-400">{tournament.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{tournament.teamCount}</p>
                    <p className="text-xs text-gray-400">teams</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="User Growth">
          <LineChart data={stats.userGrowth} color="#3B82F6" title="User Growth" />
        </ChartCard>

        <ChartCard title="Match Activity">
          <LineChart data={stats.matchActivity} color="#8B5CF6" title="Match Activity" />
        </ChartCard>
      </div>

      {/* Team Stats and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Top Teams by Member Count">
          {stats.teamStats.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No teams found</p>
          ) : (
            <SimpleBarChart
              data={stats.teamStats.map(team => ({
                label: team.name,
                value: team.memberCount,
                color: 'bg-green-500'
              }))}
            />
          )}
        </ChartCard>

        <ChartCard title="Recent Activity">
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'user' ? 'bg-blue-600' :
                    activity.type === 'team' ? 'bg-green-600' :
                    'bg-purple-600'
                  }`}>
                    {activity.type === 'user' ? <Users className="w-4 h-4 text-white" /> :
                     activity.type === 'team' ? <Users2 className="w-4 h-4 text-white" /> :
                     <Gamepad2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <p className="text-gray-400 text-xs">{activity.timestamp.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Match Completion Rate</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {stats.totalMatches > 0 
                ? Math.round((stats.completedMatches / stats.totalMatches) * 100)
                : 0}%
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {stats.completedMatches} of {stats.totalMatches} matches completed
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">User Engagement</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {stats.totalUsers > 0 
                ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                : 0}%
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {stats.activeUsers} of {stats.totalUsers} users are active
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Team Registration Rate</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {stats.totalTeams > 0 
                ? Math.round((stats.registeredTeams / stats.totalTeams) * 100)
                : 0}%
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {stats.registeredTeams} of {stats.totalTeams} teams registered
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats; 