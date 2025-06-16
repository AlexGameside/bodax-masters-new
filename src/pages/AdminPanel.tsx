import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Team, Match, User } from '../types/tournament';
import { Shield, Users, Calendar, Download, Plus, Play, Trash2, AlertTriangle, Info, Search, UserCheck, UserX, Crown, TestTube, Clock, Trophy, Edit, Eye, CheckCircle, XCircle, MessageSquare, ExternalLink, MessageCircle } from 'lucide-react';
import { getAllUsers, updateUserAdminStatus, createTestScenario, clearTestData, createTestUsersWithAuth, getTestUsers, migrateAllTeams, updateAllInvitationsExpiration, sendDiscordNotificationToUser, getUsersWithDiscord } from '../services/firebaseService';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AdminPanelProps {
  teams: Team[];
  matches: Match[];
  isAdmin: boolean;
  onAddTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  onUpdateMatch: (matchId: string, result: { team1Score: number; team2Score: number }) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onDeleteAllTeams: () => Promise<void>;
  onDeleteAllMatches: () => Promise<void>;
  onGenerateRandomTeams: (count: number) => Promise<string[]>;
  onGenerateFinalBracket: () => Promise<void>;
}

const AdminPanel = ({ 
  teams, 
  matches, 
  isAdmin, 
  onAddTeam,
  onUpdateMatch,
  onDeleteTeam,
  onDeleteAllTeams,
  onDeleteAllMatches,
  onGenerateRandomTeams,
  onGenerateFinalBracket
}: AdminPanelProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tournaments' | 'teams' | 'matches' | 'disputes' | 'notifications'>('tournaments');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [testUsers, setTestUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [disputedMatches, setDisputedMatches] = useState<Match[]>([]);
  const [discordUsers, setDiscordUsers] = useState<User[]>([]);
  const [selectedDiscordUser, setSelectedDiscordUser] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Add null checks for teams and matches
  const safeTeams = teams || [];
  const safeMatches = matches || [];

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="card max-w-md mx-auto">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-300">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if data is not yet available
  if (!teams || !matches) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Load users when users tab is active
  useEffect(() => {
    if (activeTab === 'teams' && allUsers.length === 0) {
      loadUsers();
    }
  }, [activeTab]);

  // Load test users when test tab is active
  useEffect(() => {
    if (activeTab === 'matches') {
      loadTestUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    // Load disputed matches
    const loadDisputedMatches = async () => {
      try {
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, where('matchState', '==', 'disputed'));
        const querySnapshot = await getDocs(q);
        const matches: Match[] = [];
        querySnapshot.forEach((doc) => {
          matches.push({ id: doc.id, ...doc.data() } as Match);
        });
        setDisputedMatches(matches);
      } catch (error) {
        console.error('Error loading disputed matches:', error);
      }
    };

    loadDisputedMatches();
  }, []);

  // Load Discord users when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications') {
      loadDiscordUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await getAllUsers();
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadTestUsers = async () => {
    try {
      const fetchedTestUsers = await getTestUsers();
      setTestUsers(fetchedTestUsers);
    } catch (error) {
      console.error('Error loading test users:', error);
    }
  };

  const loadDiscordUsers = async () => {
    try {
      const users = await getUsersWithDiscord();
      setDiscordUsers(users);
    } catch (error) {
      console.error('Error loading Discord users:', error);
    }
  };

  const handleUpdateAdminStatus = async (userId: string, isAdmin: boolean) => {
    setUpdatingUser(userId);
    try {
      await updateUserAdminStatus(userId, isAdmin);
      // Update local state
      setAllUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isAdmin } : user
      ));
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status. Please try again.');
    } finally {
      setUpdatingUser(null);
    }
  };

  // Filter users based on search term
  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.riotId.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const exportTeamsCSV = () => {
    const headers = ['ID', 'Name', 'Captain ID', 'Members Count', 'Team Tag', 'Registered'];
    const csvContent = [
      headers.join(','),
      ...safeTeams.map(team => [
        team.id,
        team.name,
        team.captainId,
        (team.members || []).length,
        team.teamTag || '',
        team.registeredForTournament ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bodax-masters-teams.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateRandomTeams = async () => {
    if (!onGenerateRandomTeams) return;
    
    setIsGenerating(true);
    try {
      const count = parseInt(prompt('How many random teams to generate? (Max 32)') || '16');
      if (isNaN(count) || count <= 0) return;
      
      if (count > 32) {
        alert('Maximum 32 teams allowed for the qualifier tournament.');
        return;
      }
      
      await onGenerateRandomTeams(count);
      alert(`Generated ${count} random teams successfully!`);
    } catch (error) {
      console.error('Error generating teams:', error);
      alert('Error generating teams. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFinalBracket = async () => {
    if (!onGenerateFinalBracket) return;
    
    setIsGenerating(true);
    try {
      await onGenerateFinalBracket();
      alert('Final bracket generated successfully!');
    } catch (error) {
      console.error('Error generating final bracket:', error);
      alert('Error generating final bracket. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      await onDeleteTeam(teamId);
      alert('Team deleted successfully!');
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team. Please try again.');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!confirm('Are you sure you want to delete ALL teams? This action cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      await onDeleteAllTeams();
      alert('All teams deleted successfully!');
    } catch (error) {
      console.error('Error deleting all teams:', error);
      alert('Error deleting teams. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!confirm('Are you sure you want to delete ALL matches? This action cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      await onDeleteAllMatches();
      alert('All matches deleted successfully!');
    } catch (error) {
      console.error('Error deleting all matches:', error);
      alert('Error deleting matches. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateMatch = async (matchId: string, result: { team1Score: number; team2Score: number }) => {
    try {
      await onUpdateMatch(matchId, result);
      alert('Match updated successfully!');
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Error updating match. Please try again.');
    }
  };

  const handleResolveDispute = async (matchId: string, resolution: string) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        matchState: 'playing',
        dispute: null,
        adminAssigned: 'admin',
        adminResolution: resolution,
        resolvedAt: new Date()
      });

      // Update local state
      setDisputedMatches(prev => prev.filter(match => match.id !== matchId));
      
      alert('Dispute resolved successfully');
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute');
    }
  };

  const handleDismissDispute = async (matchId: string) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        matchState: 'playing',
        dispute: null,
        adminAssigned: 'admin',
        adminResolution: 'Dispute dismissed by admin',
        resolvedAt: new Date()
      });

      // Update local state
      setDisputedMatches(prev => prev.filter(match => match.id !== matchId));
      
      alert('Dispute dismissed');
    } catch (error) {
      console.error('Error dismissing dispute:', error);
      alert('Failed to dismiss dispute');
    }
  };

  const handleSendDiscordNotification = async () => {
    if (!selectedDiscordUser || !notificationMessage.trim()) {
      setNotificationResult({ success: false, message: 'Please select a user and enter a message' });
      return;
    }

    setSendingNotification(true);
    setNotificationResult(null);

    try {
      const result = await sendDiscordNotificationToUser(selectedDiscordUser, notificationMessage);
      
      if (result.success) {
        setNotificationResult({ success: true, message: 'Notification sent successfully!' });
        setNotificationMessage('');
        setSelectedDiscordUser('');
      } else {
        setNotificationResult({ success: false, message: result.error || 'Failed to send notification' });
      }
    } catch (error) {
      setNotificationResult({ success: false, message: 'Error sending notification' });
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 section-padding">
      <div className="container-modern">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-xl text-gray-300">Tournament Management Dashboard</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-700">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tournaments'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Tournaments
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'teams'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Teams
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Matches
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'disputes'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Disputes
              {disputedMatches.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {disputedMatches.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Notifications
            </button>
          </div>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="w-6 h-6 mr-3 text-primary-400" />
                Team Management ({safeTeams.length})
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportTeamsCSV}
                  className="btn-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                {safeTeams.length > 0 && (
                  <button
                    onClick={handleDeleteAllTeams}
                    disabled={isDeleting}
                    className="btn-danger"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete All Teams'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-300 font-medium">Team</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Captain</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Members</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                    <th className="text-left p-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTeams.map((team) => (
                    <tr key={team.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{team.name}</span>
                          {team.teamTag && (
                            <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                              {team.teamTag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">{team.captainId}</td>
                      <td className="p-3 text-gray-300">
                        {team.members ? team.members.length : 0} members
                      </td>
                      <td className="p-3">
                        {team.registeredForTournament ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Registered
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="btn-danger btn-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-primary-400" />
                Match Management ({safeMatches.length})
              </h2>
              {safeMatches.length > 0 && (
                <button
                  onClick={handleDeleteAllMatches}
                  disabled={isDeleting}
                  className="btn-danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete All Matches'}
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {safeMatches.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No matches found.</p>
              ) : (
                safeMatches.slice(0, 10).map((match) => {
                  const team1 = safeTeams.find(t => t.id === match.team1Id);
                  const team2 = safeTeams.find(t => t.id === match.team2Id);
                  
                  return (
                    <div key={match.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-white">
                            {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                          </p>
                          <p className="text-sm text-gray-400">
                            Round {match.round} • {match.matchState || 'pending'}
                          </p>
                        </div>
                        <div className="text-sm text-gray-300">
                          {match.isComplete ? (
                            <span className="text-green-400 font-medium">
                              {match.team1Score} - {match.team2Score}
                            </span>
                          ) : (
                            <span className="text-orange-400">TBD</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {safeMatches.length > 10 && (
                <p className="text-sm text-gray-400 text-center">... and {safeMatches.length - 10} more matches</p>
              )}
            </div>
          </div>
        )}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && (
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Trophy className="w-6 h-6 mr-3 text-primary-400" />
              Tournament Tools
            </h2>
            
            <div className="space-y-6">
              <div className="p-6 border border-gray-600 rounded-lg bg-gray-700">
                <h3 className="text-lg font-bold text-white mb-3">Generate Random Teams</h3>
                <p className="text-gray-300 mb-4">Create random teams for testing the tournament system. (Max 32 teams)</p>
                <button 
                  onClick={handleGenerateRandomTeams}
                  disabled={isGenerating || safeTeams.length >= 32}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Random Teams'}
                </button>
              </div>
              
              <div className="p-6 border border-gray-600 rounded-lg bg-gray-700">
                <h3 className="text-lg font-bold text-white mb-3">Generate Final Bracket</h3>
                <p className="text-gray-300 mb-4">Create tournament bracket for the Final Event (8 teams total).</p>
                <button 
                  onClick={handleGenerateFinalBracket}
                  disabled={isGenerating}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Final Bracket'}
                </button>
              </div>

              <div className="p-6 border border-blue-600 rounded-lg bg-blue-900/20">
                <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Invitation Management
                </h3>
                <p className="text-blue-300 mb-4">Update all existing team invitations to use the new 7-day expiration period. This will fix invitation acceptance issues.</p>
                <button 
                  onClick={async () => {
                    if (confirm('This will update all existing invitations to use 7-day expiration. Continue?')) {
                      setLoading(true);
                      try {
                        await updateAllInvitationsExpiration();
                        alert('All invitations have been updated to 7-day expiration successfully!');
                      } catch (error) {
                        console.error('Error updating invitation expirations:', error);
                        alert('Error updating invitation expirations. Please try again.');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={loading}
                  className="btn-secondary text-blue-400 border-blue-600 hover:bg-blue-900/20 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Invitation Expirations'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 text-orange-400" />
                Looking for Help
              </h2>
            </div>

            {disputedMatches.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Active Disputes</h3>
                <p className="text-gray-500">All matches are running smoothly!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {disputedMatches.map((match) => {
                  const team1 = teams.find(t => t.id === match.team1Id);
                  const team2 = teams.find(t => t.id === match.team2Id);
                  
                  return (
                    <div key={match.id} className="card border-orange-600">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {team1?.name} vs {team2?.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Match #{match.matchNumber} • Round {match.round}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-orange-900/50 text-orange-400 text-sm rounded-full">
                          Disputed
                        </span>
                      </div>

                      {match.dispute && (
                        <div className="mb-4 p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                          <p className="text-sm text-gray-300 mb-2">
                            <strong>Reason:</strong> {match.dispute.reason === 'score_mismatch' ? 'Score mismatch between teams' : match.dispute.reason}
                          </p>
                          {match.dispute.team1SubmittedScore && match.dispute.team2SubmittedScore && (
                            <div className="text-sm text-gray-400">
                              <p><strong>Team 1 submitted:</strong> {match.dispute.team1SubmittedScore.team1Score} - {match.dispute.team1SubmittedScore.team2Score}</p>
                              <p><strong>Team 2 submitted:</strong> {match.dispute.team2SubmittedScore.team1Score} - {match.dispute.team2SubmittedScore.team2Score}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigate(`/match/${match.id}`)}
                          className="flex-1 btn-secondary flex items-center justify-center"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Match
                        </button>
                        <button
                          onClick={() => {
                            const resolution = prompt('Enter resolution:');
                            if (resolution) {
                              handleResolveDispute(match.id, resolution);
                            }
                          }}
                          className="flex-1 btn-primary flex items-center justify-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </button>
                        <button
                          onClick={() => handleDismissDispute(match.id)}
                          className="flex-1 btn-secondary flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <MessageCircle className="w-6 h-6 mr-3 text-primary-400" />
                Discord Notifications ({discordUsers.length} users with Discord linked)
              </h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 border border-gray-600 rounded-lg bg-gray-700">
                <h3 className="text-lg font-bold text-white mb-3">Send Test Notification</h3>
                <p className="text-gray-300 mb-4">Send a test Discord notification to a user with Discord linked.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select User
                    </label>
                    <select
                      value={selectedDiscordUser}
                      onChange={(e) => setSelectedDiscordUser(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Choose a user...</option>
                      {discordUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.discordUsername})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Enter your test message here..."
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <button
                    onClick={handleSendDiscordNotification}
                    disabled={sendingNotification || !selectedDiscordUser || !notificationMessage.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? 'Sending...' : 'Send Notification'}
                  </button>

                  {notificationResult && (
                    <div className={`p-4 rounded-md ${
                      notificationResult.success 
                        ? 'bg-green-900/50 border border-green-700 text-green-300' 
                        : 'bg-red-900/50 border border-red-700 text-red-300'
                    }`}>
                      {notificationResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border border-gray-600 rounded-lg bg-gray-700">
                <h3 className="text-lg font-bold text-white mb-3">Users with Discord Linked</h3>
                <div className="space-y-2">
                  {discordUsers.length === 0 ? (
                    <p className="text-gray-400">No users have Discord linked yet.</p>
                  ) : (
                    discordUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                        <div>
                          <span className="text-white font-medium">{user.username}</span>
                          <span className="text-gray-400 ml-2">({user.discordUsername})</span>
                        </div>
                        <span className="text-green-400 text-sm">Discord Linked</span>
                      </div>
                    ))
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

export default AdminPanel; 