import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Edit,
  Eye,
  Video,
  Crown,
  Wrench,
  BarChart3,
  DollarSign,
  Clock,
  Shield,
  Zap,
  Grid3X3,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getTournament, updateTournament, publishTournament, closeRegistration, deleteTournament } from '../services/tournamentService';
import { getTeamsByIds, approveTeamForTournament, rejectTeamFromTournament } from '../services/firebaseService';
import { getMatches } from '../services/firebaseService';
import type { Tournament, Team, Match } from '../types/tournament';
import { Card, SectionHeader } from '../components/ui';
import SwissRoundManagement from '../components/SwissRoundManagement';
import AdminMatchdayCalendar from '../components/AdminMatchdayCalendar';
import StreamingManagement from '../components/StreamingManagement';
import ManualSeedingInterface from '../components/ManualSeedingInterface';

type ManagementTab = 'overview' | 'teams' | 'matches' | 'swiss' | 'schedule' | 'streaming' | 'settings' | 'analytics';

const OrganizerTournamentManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ManagementTab>('overview');
  const [showManualSeeding, setShowManualSeeding] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);

  useEffect(() => {
    if (id && currentUser) {
      loadTournamentData();
    }
  }, [id, currentUser]);

  const loadTournamentData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const tournamentData = await getTournament(id);
      
      if (!tournamentData) {
        toast.error('Tournament not found');
        navigate('/organizer/tournaments');
        return;
      }

      // Check permissions
      const isOrganizer = currentUser?.isVerifiedOrganizer && tournamentData.organizerId === currentUser.id;
      const isAdmin = currentUser?.isAdmin;
      
      if (!isOrganizer && !isAdmin) {
        toast.error('You do not have permission to manage this tournament');
        navigate('/organizer/tournaments');
        return;
      }

      setTournament(tournamentData);

      // Load teams
      if (tournamentData.teams && tournamentData.teams.length > 0) {
        const teamsData = await getTeamsByIds(tournamentData.teams);
        setTeams(teamsData);
      }

      // Load matches
      const allMatches = await getMatches();
      const tournamentMatches = allMatches.filter(m => m.tournamentId === id);
      setMatches(tournamentMatches);
    } catch (error: any) {
      console.error('Error loading tournament:', error);
      toast.error(error.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!tournament || !id) return;

    try {
      if (newStatus === 'published' && tournament.status === 'draft') {
        await publishTournament(id);
        toast.success('Tournament published!');
      } else if (newStatus === 'registration-closed' && tournament.status === 'registration-open') {
        await closeRegistration(id);
        toast.success('Registration closed!');
      } else {
        await updateTournament(id, { status: newStatus as any });
        toast.success('Tournament status updated!');
      }
      await loadTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tournament status');
    }
  };

  const handleFixTournamentDates = async () => {
    if (!tournament || !id) return;
    
    try {
      setFixingDates(true);
      const { fixExistingTournamentDates } = await import('../services/tournamentService');
      await fixExistingTournamentDates();
      toast.success('Tournament dates fixed!');
      await loadTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to fix dates');
    } finally {
      setFixingDates(false);
    }
  };

  const handleApproveTeam = async (teamId: string) => {
    if (!tournament || !id) return;
    try {
      await approveTeamForTournament(id, teamId);
      toast.success('Team approved!');
      await loadTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve team');
    }
  };

  const handleRejectTeam = async (teamId: string) => {
    if (!tournament || !id) return;
    try {
      await rejectTeamFromTournament(id, teamId);
      toast.success('Team rejected!');
      await loadTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject team');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
          <button
            onClick={() => navigate('/organizer/tournaments')}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const pendingTeams = teams.filter(team => !tournament.approvedTeams?.includes(team.id));
  const approvedTeams = teams.filter(team => tournament.approvedTeams?.includes(team.id));
  const rejectedTeams = tournament.rejectedTeams || [];

  const tabs: Array<{ id: ManagementTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'matches', label: 'Matches', icon: Calendar },
    ...(tournament.format?.type === 'swiss-system' ? [{ id: 'swiss', label: 'Swiss Rounds', icon: Grid3X3 }] : []),
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'streaming', label: 'Streaming', icon: Video },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/20 to-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/organizer/tournaments')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold font-bodax flex items-center space-x-3">
                  <Trophy className="w-8 h-8 text-red-500" />
                  <span>{tournament.name}</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">{tournament.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to={`/tournaments/${tournament.id}`}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Public Page</span>
              </Link>
              <Link
                to={`/admin/tournaments/${tournament.id}/edit`}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Tournament</span>
              </Link>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              tournament.status === 'registration-open' ? 'bg-green-900/30 text-green-400 border border-green-700' :
              tournament.status === 'in-progress' ? 'bg-blue-900/30 text-blue-400 border border-blue-700' :
              tournament.status === 'completed' ? 'bg-gray-800 text-gray-400 border border-gray-700' :
              'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
            }`}>
              {tournament.status?.toUpperCase().replace('-', ' ') || 'DRAFT'}
            </span>
            {tournament.paymentInfo && (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <DollarSign className="w-4 h-4" />
                <span>Entry Fee: €{tournament.paymentInfo.entryFee}</span>
                <span className="text-gray-600">•</span>
                <span>Collected: €{tournament.paymentInfo.totalCollected || 0}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors font-mono text-sm uppercase tracking-wider ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-400 bg-red-900/10'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="glass" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Total Teams</p>
                    <p className="text-3xl font-bold text-white mt-2">{teams.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400 opacity-50" />
                </div>
              </Card>
              <Card variant="glass" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Approved</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">{approvedTeams.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
                </div>
              </Card>
              <Card variant="glass" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Pending</p>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">{pendingTeams.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
                </div>
              </Card>
              <Card variant="glass" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Matches</p>
                    <p className="text-3xl font-bold text-purple-400 mt-2">{matches.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-400 opacity-50" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="glass" padding="lg">
              <SectionHeader title="QUICK ACTIONS" icon={Zap} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <button
                  onClick={() => setActiveTab('teams')}
                  className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left"
                >
                  <Users className="w-6 h-6 text-blue-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Manage Teams</h3>
                  <p className="text-sm text-gray-400">Approve, reject, and manage team registrations</p>
                </button>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left"
                >
                  <Calendar className="w-6 h-6 text-purple-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Manage Matches</h3>
                  <p className="text-sm text-gray-400">View and manage tournament matches</p>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-left"
                >
                  <Settings className="w-6 h-6 text-yellow-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Tournament Settings</h3>
                  <p className="text-sm text-gray-400">Configure tournament options and tools</p>
                </button>
              </div>
            </Card>

            {/* Status Management */}
            <Card variant="glass" padding="lg">
              <SectionHeader title="TOURNAMENT STATUS" icon={Shield} />
              <div className="mt-4 space-y-3">
                {tournament.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Publish Tournament</span>
                  </button>
                )}
                {tournament.status === 'registration-open' && (
                  <button
                    onClick={() => handleStatusChange('registration-closed')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Close Registration</span>
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="TEAM REGISTRATIONS" icon={Users} />
              
              {/* Pending Teams */}
              {pendingTeams.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Pending Approval ({pendingTeams.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {pendingTeams.map((team) => (
                      <div key={team.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{team.name}</h4>
                          <p className="text-sm text-gray-400">{team.members?.length || 0} members</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveTeam(team.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectTeam(team.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Teams */}
              {approvedTeams.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Approved Teams ({approvedTeams.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {approvedTeams.map((team) => (
                      <div key={team.id} className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                        <h4 className="font-semibold text-white">{team.name}</h4>
                        <p className="text-sm text-gray-400">{team.members?.length || 0} members</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingTeams.length === 0 && approvedTeams.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No teams registered yet</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="TOURNAMENT MATCHES" icon={Calendar} />
              {matches.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {matches.map((match) => (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      className="block bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">
                            {teams.find(t => t.id === match.team1Id)?.name || 'Team 1'} vs {teams.find(t => t.id === match.team2Id)?.name || 'Team 2'}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {match.matchState || 'Not started'}
                          </p>
                        </div>
                        <Eye className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No matches created yet</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* SWISS TAB */}
        {activeTab === 'swiss' && tournament.format?.type === 'swiss-system' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="SWISS ROUND MANAGEMENT" icon={Grid3X3} />
              <div className="mt-4">
                <SwissRoundManagement 
                  tournament={tournament}
                  onRoundGenerated={loadTournamentData}
                />
              </div>
            </Card>

            {/* Playoff Bracket Generation */}
            {(tournament.stageManagement?.swissStage?.currentRound || 0) >= (tournament.format?.swissConfig?.rounds || 5) && (
              <Card variant="glass" padding="lg" className="border-l-4 border-l-yellow-500">
                <SectionHeader title="GENERATE PLAYOFF BRACKET" icon={Crown} />
                <div className="mt-4">
                  <p className="text-gray-300 text-sm mb-4">
                    Swiss rounds are complete! Generate a BO3 single-elimination bracket for the top 8 teams.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('Generate playoff bracket for top 8 teams? This cannot be undone.')) return;
                      try {
                        const { SwissTournamentService } = await import('../services/swissTournamentService');
                        await SwissTournamentService.generatePlayoffBracket(tournament.id);
                        toast.success('Playoff bracket generated!');
                        await loadTournamentData();
                      } catch (error: any) {
                        toast.error(`Failed to generate playoff bracket: ${error.message}`);
                      }
                    }}
                    disabled={tournament.stageManagement?.playoffStage?.isActive}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Crown className="w-5 h-5" />
                    <span>GENERATE PLAYOFF BRACKET</span>
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && tournament.format?.type === 'swiss-system' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="MATCHDAY CALENDAR" icon={Calendar} />
              <div className="mt-4">
                <AdminMatchdayCalendar tournamentId={tournament.id} />
              </div>
            </Card>
          </div>
        )}

        {/* STREAMING TAB */}
        {activeTab === 'streaming' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="STREAMING MANAGEMENT" icon={Video} />
              <div className="mt-4">
                <StreamingManagement 
                  matches={matches}
                  teams={teams}
                  currentUser={currentUser}
                />
              </div>
            </Card>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="TOURNAMENT TOOLS" icon={Wrench} />
              <div className="mt-4 space-y-4">
                {/* Bracket Reveal */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm mb-1">Bracket Reveal</h4>
                      <p className="text-gray-400 text-xs">Open the bracket reveal tool for streaming / announcements</p>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/bracket-reveal/${id}`)}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium transition-colors ml-4 border border-gray-700 hover:border-gray-600"
                    >
                      Open
                    </button>
                  </div>
                </div>

                {/* Fix Tournament Dates */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm mb-1">Fix Tournament Dates</h4>
                      <p className="text-gray-400 text-xs">Update and normalize all tournament date fields</p>
                    </div>
                    <button
                      onClick={handleFixTournamentDates}
                      disabled={fixingDates}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                    >
                      {fixingDates ? 'Fixing...' : 'Fix Dates'}
                    </button>
                  </div>
                </div>

                {/* Manual Team Seeding */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm mb-1">Manual Team Seeding</h4>
                      <p className="text-gray-400 text-xs">Manually adjust team seeding order for the bracket</p>
                    </div>
                    <button
                      onClick={() => setShowManualSeeding(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors ml-4"
                    >
                      Adjust Seeding
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card variant="glass" padding="lg">
              <SectionHeader title="TOURNAMENT ANALYTICS" icon={TrendingUp} />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Registration Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {tournament.format?.teamCount ? Math.round((teams.length / tournament.format.teamCount) * 100) : 0}%
                  </p>
                </div>
                {tournament.paymentInfo && (
                  <>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-400">
                        €{tournament.paymentInfo.totalCollected || 0}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-2">Platform Fee</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        €{tournament.paymentInfo.platformFeeAmount || 0}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Manual Seeding Modal */}
      {showManualSeeding && tournament && (
        <ManualSeedingInterface
          tournament={tournament}
          teams={teams}
          onClose={() => setShowManualSeeding(false)}
          onSeedingUpdated={loadTournamentData}
        />
      )}
    </div>
  );
};

export default OrganizerTournamentManagementPage;
