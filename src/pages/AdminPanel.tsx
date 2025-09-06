import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Team, Match, User, Tournament } from '../types/tournament';
import { Shield, Users, Calendar, Download, Plus, Play, Trash2, AlertTriangle, Info, Search, UserCheck, UserX, Crown, TestTube, Clock, Trophy, Edit, Eye, CheckCircle, XCircle, MessageSquare, ExternalLink, MessageCircle, FileText, Activity, RefreshCw, User as UserIcon, BarChart3, Link } from 'lucide-react';
import { getAllUsers, updateUserAdminStatus, createTestScenario, clearTestData, createTestUsersWithAuth, getTestUsers, migrateAllTeams, updateAllInvitationsExpiration, sendDiscordNotificationToUser, getUsersWithDiscord, getSignupLogs, getGeneralLogs, logAdminAction, type AdminLog } from '../services/firebaseService';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import AdminStats from './AdminStats';
import { exportTeamsWithTournamentStatus, getTournamentTeamsData } from '../scripts/enhancedTeamExport';

interface AdminPanelProps {
  teams: Team[];
  matches: Match[];
  isAdmin: boolean;
  onAddTeam: (team: Omit<Team, 'id'>) => Promise<any>;
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
  const [activeTab, setActiveTab] = useState<'tournaments' | 'teams' | 'matches' | 'disputes' | 'notifications' | 'signup-logs' | 'general-logs' | 'users' | 'stats' | 'stream-overlays'>('tournaments');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disputedMatches, setDisputedMatches] = useState<Match[]>([]);
  const [discordUsers, setDiscordUsers] = useState<User[]>([]);
  const [selectedDiscordUser, setSelectedDiscordUser] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [signupLogs, setSignupLogs] = useState<AdminLog[]>([]);
  const [generalLogs, setGeneralLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userMatches, setUserMatches] = useState<Record<string, { active: Match[], history: Match[] }>>({});
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedTeamRoster, setExpandedTeamRoster] = useState<string | null>(null);

  // Add null checks for teams and matches
  const safeTeams = teams || [];
  const safeMatches = matches || [];

  // Helper function to get user details for team members
  const getUserDetails = (userId: string): User | undefined => {
    return allUsers.find(user => user.id === userId);
  };

  // Load tournaments on component mount
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const { getTournaments } = await import('../services/firebaseService');
      const tournamentsData = await getTournaments(undefined, true); // Admins can see all tournaments
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoadingTournaments(false);
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/20 shadow-2xl max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mb-6">
              <img 
                src="/logos/bodax-pfp.png" 
                alt="Bodax Masters Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg"
              />
            </div>
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4 font-mono tracking-tight">ACCESS DENIED</h1>
            <p className="text-white/80 font-mono tracking-tight">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if data is not yet available
  if (!teams || !matches) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/20 shadow-2xl max-w-md mx-auto">
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/logos/bodax-pfp.png" 
                alt="Bodax Masters Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg"
              />
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">LOADING ADMIN PANEL</h2>
            <p className="text-white/80 font-mono tracking-tight">Please wait while we prepare your dashboard...</p>
          </div>
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

  // Load users when users tab is active
  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0) {
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

  // Load signup logs when signup-logs tab is active
  useEffect(() => {
    if (activeTab === 'signup-logs') {
      loadSignupLogs();
    }
  }, [activeTab]);

  // Load general logs when general-logs tab is active
  useEffect(() => {
    if (activeTab === 'general-logs') {
      loadGeneralLogs();
    }
  }, [activeTab]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
      // setTestUsers(fetchedTestUsers); // Removed since setTestUsers is not defined
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

  const loadSignupLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getSignupLogs(50);
      setSignupLogs(logs);
    } catch (error) {
      console.error('Error loading signup logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadGeneralLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getGeneralLogs(50);
      setGeneralLogs(logs);
    } catch (error) {
      console.error('Error loading general logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const createTestLogs = async () => {
    try {
      // Create some test signup logs
      await logAdminAction(
        'test_signup',
        'Test user registration',
        undefined,
        'TestUser',
        { test: true, timestamp: new Date().toISOString() },
        'signup'
      );

      // Create some test general logs
      await logAdminAction(
        'test_general',
        'Test general admin action',
        undefined,
        'TestAdmin',
        { test: true, action: 'test_general', timestamp: new Date().toISOString() },
        'general'
      );

      // Create a signup log using the createAdminLog function directly
      const { createAdminLog } = await import('../services/firebaseService');
      await createAdminLog({
        type: 'signup',
        action: 'test_user_registered',
        details: 'Test user registration via createAdminLog',
        username: 'TestUser',
        metadata: { test: true, method: 'direct_createAdminLog' }
      });

      // Create a general log using the createAdminLog function directly
      await createAdminLog({
        type: 'general',
        action: 'test_admin_action',
        details: 'Test admin action via createAdminLog',
        adminUsername: 'TestAdmin',
        metadata: { test: true, method: 'direct_createAdminLog' }
      });

      toast.success('Test logs created successfully!');
      
      // Reload logs after creating test data
      setTimeout(() => {
        loadSignupLogs();
        loadGeneralLogs();
      }, 1000);
    } catch (error) {
      console.error('Error creating test logs:', error);
      toast.error('Failed to create test logs');
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
      
      // Log the action
      await logAdminAction(
        'update_user_admin_status',
        `Updated admin status for user ${userId} to ${isAdmin}`,
        undefined,
        undefined,
        { userId, isAdmin }
      );
      
      toast.success(`Admin status updated successfully`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleUpdateUser = async (userId: string, updates: {
    username?: string;
    email?: string;
    riotId?: string;
    discordUsername?: string;
    discordId?: string;
    discordAvatar?: string;
    discordLinked?: boolean;
    inDiscordServer?: boolean;
    isAdmin?: boolean;
    teamIds?: string[];
  }) => {
    setUpdatingUser(userId);
    try {
      const { updateUser } = await import('../services/firebaseService');
      await updateUser(userId, updates);
      
      // Update local state
      setAllUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
      
      // Log the action
      await logAdminAction(
        'update_user',
        `Updated user ${userId} profile information`,
        undefined,
        undefined,
        { 
          userId, 
          updates: Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
          )
        }
      );
      
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleSaveUser = async (updatedUser: User) => {
    try {
      const { username, email, riotId, discordUsername, discordId, discordAvatar, discordLinked, inDiscordServer, isAdmin, teamIds } = updatedUser;
      
      // Prepare updates object, converting empty strings to undefined for optional fields
      const updates: any = {
        username,
        email,
        riotId,
        discordUsername,
        discordLinked,
        inDiscordServer,
        isAdmin,
        teamIds
      };
      
      // Only include optional fields if they have values
      if (discordId && discordId.trim() !== '') {
        updates.discordId = discordId;
      }
      
      if (discordAvatar && discordAvatar.trim() !== '') {
        updates.discordAvatar = discordAvatar;
      }
      
      await handleUpdateUser(updatedUser.id, updates);
      
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user changes');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  // Search users function - only loads users when actually searching
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { getAllUsers } = await import('../services/firebaseService');
      const users = await getAllUsers();
      
      // Filter users based on search term with null safety
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (user.username?.toLowerCase() || '').includes(searchLower) ||
          (user.email?.toLowerCase() || '').includes(searchLower) ||
          (user.riotId?.toLowerCase() || '').includes(searchLower) ||
          (user.discordUsername?.toLowerCase() || '').includes(searchLower)
        );
      });
      
      setFilteredUsers(filtered);
      
      // Load match data for found users
      await loadUserMatches(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Load match data for users
  const loadUserMatches = async (users: User[]) => {
    try {
      const { getUserMatches } = await import('../services/firebaseService');
      const matchesData: Record<string, { active: Match[], history: Match[] }> = {};
      
      // Load matches for each user (limit to first 10 users to avoid performance issues)
      const usersToLoad = users.slice(0, 10);
      
      for (const user of usersToLoad) {
        const userMatches = await getUserMatches(user.id);
        const active = userMatches.filter(match => 
          ['ready_up', 'map_banning', 'side_selection_map1', 'side_selection_map2', 'side_selection_decider', 'playing', 'waiting_results', 'disputed'].includes(match.matchState)
        );
        const history = userMatches.filter(match => match.isComplete);
        
        matchesData[user.id] = { active, history };
      }
      
      setUserMatches(matchesData);
    } catch (error) {
      console.error('Error loading user matches:', error);
    }
  };

  const exportTeamsCSV = () => {
    const headers = [
      'Team Name',
      'Team Tag', 
      'Captain',
      'Captain Email',
      'Total Members',
      'Registered for Tournament',
      'Members List',
      'Member Roles'
    ];
    
    const csvContent = [
      headers.join(','),
      ...safeTeams.map(team => {
        const captain = getUserDetails(team.captainId);
        const memberList = team.members?.map(member => {
          const user = getUserDetails(member.userId);
          return user?.username || 'Unknown User';
        }).join('; ') || 'No members';
        
        const memberRoles = team.members?.map(member => {
          const user = getUserDetails(member.userId);
          return `${user?.username || 'Unknown'}: ${member.role}`;
        }).join('; ') || 'No roles';
        
        return [
          `"${team.name}"`,
          `"${team.teamTag || 'N/A'}"`,
          `"${captain?.username || 'Unknown Captain'}"`,
          `"${captain?.email || 'N/A'}"`,
          team.members ? team.members.length : 0,
          team.registeredForTournament ? 'Yes' : 'No',
          `"${memberList}"`,
          `"${memberRoles}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bodax-masters-teams-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Teams exported successfully!');
  };

  const exportTeamsWithTournamentStatusCSV = async () => {
    try {
      toast.loading('Generating enhanced team export...');
      const result = await exportTeamsWithTournamentStatus();
      
      if (result.success) {
        toast.success('Enhanced team export completed!');
        
        // Show tournament summary
        if (result.tournamentData && result.tournamentData.tournament) {
          const { tournament, teams } = result.tournamentData;
          toast.success(
            `Tournament: ${tournament.name} - ${tournament.registeredCount}/${tournament.maxTeams} teams registered`,
            { duration: 4000 }
          );
        }
      } else {
        toast.error(result.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export teams with tournament status');
    }
  };

  const checkTournamentRegistration = async () => {
    try {
      toast.loading('Checking tournament registration...');
      const result = await getTournamentTeamsData();
      
      if (result.success && result.tournament && result.teams && result.summary) {
        const { tournament, teams, summary } = result;
        
        // Create a detailed message
        let message = `Tournament: ${tournament.name}\n`;
        message += `Status: ${tournament.status}\n`;
        message += `Teams: ${summary.registered}/${summary.capacity}\n`;
        message += `Waitlist: ${summary.waitlisted}\n`;
        message += `Rejected: ${summary.rejected}\n`;
        
        if (teams.registered.length > 0) {
          message += '\nRegistered Teams:\n';
          teams.registered.forEach((team, index) => {
            message += `${index + 1}. ${team.name} [${team.teamTag}] - ${team.activeMemberCount} active members\n`;
          });
        }
        
        // Show in console for detailed view
        console.log('Tournament Registration Status:', result);
        
        toast.success('Tournament registration check completed!', { duration: 5000 });
        
        // Also show alert with details
        alert(message);
      } else {
        toast.error(result.message || 'Failed to check tournament registration');
      }
    } catch (error) {
      console.error('Tournament check error:', error);
      toast.error('Failed to check tournament registration');
    }
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
    try {
      await onDeleteTeam(teamId);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Error deleting team. Please try again.');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!window.confirm('Are you sure you want to delete ALL teams? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDeleteAllTeams();
      
      // Log the action
      await logAdminAction(
        'delete_all_teams',
        'All teams deleted from the system',
        undefined, // adminId would be passed from props
        undefined, // adminUsername would be passed from props
        { teamCount: safeTeams.length }
      );
      
      alert('All teams deleted successfully!');
    } catch (error) {
      console.error('Error deleting all teams:', error);
      alert('Error deleting teams. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!window.confirm('Are you sure you want to delete ALL matches? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDeleteAllMatches();
      
      // Log the action
      await logAdminAction(
        'delete_all_matches',
        'All matches deleted from the system',
        undefined, // adminId would be passed from props
        undefined, // adminUsername would be passed from props
        { matchCount: safeMatches.length }
      );
      
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
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-magenta-600 to-purple-700">
      {/* Unity League Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 font-mono tracking-tight">ADMIN PANEL</h1>
            <p className="text-xl text-white/80 font-mono tracking-tight">TOURNAMENT MANAGEMENT DASHBOARD</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-black/40 rounded-xl p-1 shadow-lg mb-8 border border-white/20 backdrop-blur-sm overflow-x-auto">
          {[
            { id: 'tournaments', label: 'TOURNAMENTS', icon: Trophy },
            { id: 'teams', label: 'TEAMS', icon: Users },
            { id: 'matches', label: 'MATCHES', icon: Calendar },
            { id: 'disputes', label: 'DISPUTES', icon: AlertTriangle },
            { id: 'notifications', label: 'NOTIFICATIONS', icon: MessageSquare },
            { id: 'signup-logs', label: 'SIGNUP LOGS', icon: FileText },
            { id: 'general-logs', label: 'GENERAL LOGS', icon: Activity },
            { id: 'users', label: 'USERS', icon: Users },
            { id: 'stats', label: 'STATISTICS', icon: BarChart3 },
            { id: 'stream-overlays', label: 'STREAM OVERLAYS', icon: Link }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 font-mono tracking-tight whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
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
                <button
                  onClick={exportTeamsWithTournamentStatusCSV}
                  className="btn-secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export with Tournament Status
                </button>
                <button
                  onClick={checkTournamentRegistration}
                  className="btn-secondary"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Check Tournament Registration
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
                    <React.Fragment key={team.id}>
                      <tr className="border-b border-gray-700 hover:bg-gray-700/50">
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
                        <td className="p-3 text-gray-300">
                          {getUserDetails(team.captainId)?.username || team.captainId}
                        </td>
                        <td className="p-3 text-gray-300">
                          <div className="flex items-center space-x-2">
                            <span>{team.members ? team.members.length : 0} members</span>
                            <button
                              onClick={() => setExpandedTeamRoster(expandedTeamRoster === team.id ? null : team.id)}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                              {expandedTeamRoster === team.id ? 'Hide' : 'View'} Roster
                            </button>
                          </div>
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
                      {/* Roster Dropdown */}
                      {expandedTeamRoster === team.id && (
                        <tr className="bg-gray-800/50">
                          <td colSpan={5} className="p-4">
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-white mb-3">Team Roster</h4>
                              {team.members && team.members.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {team.members.map((member) => {
                                    const user = getUserDetails(member.userId);
                                    return (
                                      <div key={member.userId} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-white font-medium">
                                              {user?.username || 'Unknown User'}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                              {user?.email || 'No email'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Riot ID: {user?.riotId || 'N/A'}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                              member.role === 'owner' ? 'bg-purple-900/50 text-purple-300 border border-purple-700' :
                                              member.role === 'captain' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                                              member.role === 'coach' ? 'bg-orange-900/50 text-orange-300 border border-orange-700' :
                                              member.role === 'assistant_coach' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                                              member.role === 'manager' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                              'bg-gray-700 text-gray-300 border border-gray-600'
                                            }`}>
                                              {member.role.replace('_', ' ')}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Joined: {member.joinedAt instanceof Date ? member.joinedAt.toLocaleDateString() : 'N/A'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-center py-4">No members found.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-primary-400" />
                Live Tournament Management
              </h3>
              
              {loadingTournaments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading tournaments...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Tournaments</h3>
                      <button
                        onClick={() => navigate('/admin/tournaments/create')}
                        className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                      >
                        Create Tournament
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournaments.map((tournament) => (
                        <div key={tournament.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white">{tournament.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tournament.status === 'in-progress' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                              tournament.status === 'registration-open' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                              tournament.status === 'completed' ? 'bg-gray-900/50 text-gray-300 border border-gray-700' :
                              'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                            }`}>
                              {tournament.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{tournament.description}</p>
                          <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                            <span>{tournament.teams?.length || 0} / {tournament.format?.teamCount || 8} teams</span>
                            <span>{tournament.format?.type || 'single-elimination'}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/tournaments/${tournament.id}`)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm"
                            >
                              <Eye className="w-4 h-4 inline mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => navigate(`/admin/tournaments/manage`)}
                              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 text-sm"
                            >
                              <Edit className="w-4 h-4 inline mr-1" />
                              Manage
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
        )}

        {/* Signup Logs Tab */}
        {activeTab === 'signup-logs' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FileText className="w-6 h-6 mr-3 text-primary-400" />
                Signup Logs ({signupLogs.length})
              </h2>
              <div className="flex space-x-2">

                <button
                  onClick={loadSignupLogs}
                  disabled={loadingLogs}
                  className="btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {loadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading signup logs...</p>
                </div>
              ) : signupLogs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Signup Logs</h3>
                  <p className="text-gray-500">No user registration activity has been logged yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {signupLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-800 rounded-md border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action === 'user_registered' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                            log.action === 'user_registration_failed' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                            'bg-blue-900/50 text-blue-300 border border-blue-700'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {log.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-white text-sm mb-2">{log.details}</p>
                      {log.username && (
                        <p className="text-gray-400 text-sm">User: {log.username}</p>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* General Logs Tab */}
        {activeTab === 'general-logs' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Activity className="w-6 h-6 mr-3 text-primary-400" />
                General Logs ({generalLogs.length})
              </h2>
              <div className="flex space-x-2">

                <button
                  onClick={loadGeneralLogs}
                  disabled={loadingLogs}
                  className="btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {loadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading general logs...</p>
                </div>
              ) : generalLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No General Logs</h3>
                  <p className="text-gray-500">No general admin activity has been logged yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generalLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-800 rounded-md border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.action.includes('created') ? 'bg-green-900/50 text-green-300 border border-green-700' :
                            log.action.includes('failed') ? 'bg-red-900/50 text-red-300 border border-red-700' :
                            log.action.includes('deleted') ? 'bg-orange-900/50 text-orange-300 border border-orange-700' :
                            'bg-blue-900/50 text-blue-300 border border-blue-700'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {log.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-white text-sm mb-2">{log.details}</p>
                      {log.username && (
                        <p className="text-gray-400 text-sm">User: {log.username}</p>
                      )}
                      {log.adminUsername && (
                        <p className="text-gray-400 text-sm">Admin: {log.adminUsername}</p>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="w-6 h-6 mr-3 text-primary-400" />
                User Management ({filteredUsers.length} users)
              </h2>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="btn-secondary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by username, email, Riot ID, or Discord username..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUserSearchTerm(value);
                    
                    // Clear previous timeout
                    if (searchTimeout) {
                      clearTimeout(searchTimeout);
                    }
                    
                    // Set new timeout for debounced search
                    const timeoutId = setTimeout(() => {
                      searchUsers(value);
                    }, 300); // Reduced from 500ms to 300ms for better responsiveness
                    
                    setSearchTimeout(timeoutId);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searchingUsers && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>

              {/* Match Information Summary */}
              {filteredUsers.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                    Match Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-900/20 border border-blue-700/30 rounded">
                      <div className="text-2xl font-bold text-blue-400">
                        {filteredUsers.length}
                      </div>
                      <div className="text-sm text-gray-300">Users Found</div>
                    </div>
                    <div className="text-center p-3 bg-green-900/20 border border-green-700/30 rounded">
                      <div className="text-2xl font-bold text-green-400">
                        {Object.values(userMatches).reduce((total, matches) => total + matches.active.length, 0)}
                      </div>
                      <div className="text-sm text-gray-300">Active Matches</div>
                    </div>
                    <div className="text-center p-3 bg-purple-900/20 border border-purple-700/30 rounded">
                      <div className="text-2xl font-bold text-purple-400">
                        {Object.values(userMatches).reduce((total, matches) => total + matches.history.length, 0)}
                      </div>
                      <div className="text-sm text-gray-300">Match History</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Search for Users</h3>
                  <p className="text-gray-500">
                    {userSearchTerm ? 'No users match your search criteria.' : 'Enter a search term to find users. Search by username, email, Riot ID, or Discord username.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:bg-gray-750 transition-colors">
                      {/* User Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          {user.discordAvatar ? (
                            <img
                              src={user.discordAvatar}
                              alt={user.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{user.username}</div>
                          <div className="text-gray-400 text-sm truncate">{user.email}</div>
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Riot ID:</span>
                          <span className="text-white text-sm font-medium">{user.riotId}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Discord:</span>
                          <div className="flex items-center space-x-1">
                            {user.discordLinked ? (
                              <>
                                <span className="text-green-400 text-sm truncate max-w-20">{user.discordUsername}</span>
                                {user.inDiscordServer && (
                                  <span className="px-1 py-0.5 bg-green-900/50 text-green-300 text-xs rounded">
                                    ✓
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500 text-sm">Not linked</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Teams:</span>
                          <span className="text-white text-sm">{user.teamIds?.length || 0}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Status:</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.isAdmin 
                              ? 'bg-red-900/50 text-red-300' 
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </div>

                        {/* Match Information */}
                        {userMatches[user.id] && (
                          <>
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm font-medium">Active Matches:</span>
                                <span className="text-green-400 text-sm font-bold">
                                  {userMatches[user.id].active.length}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm font-medium">Match History:</span>
                                <span className="text-purple-400 text-sm font-bold">
                                  {userMatches[user.id].history.length}
                                </span>
                              </div>

                              {/* Show active match details if any */}
                              {userMatches[user.id].active.length > 0 && (
                                <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs">
                                  <div className="text-blue-300 font-medium mb-2 flex items-center">
                                    <Play className="w-3 h-3 mr-1" />
                                    Active Matches:
                                  </div>
                                  {userMatches[user.id].active.slice(0, 2).map((match, index) => {
                                    const team1 = teams.find(t => t.id === match.team1Id);
                                    const team2 = teams.find(t => t.id === match.team2Id);
                                    return (
                                      <div key={match.id} className="text-gray-300 mb-1">
                                        <span className="font-medium">{team1?.name || 'TBD'}</span>
                                        <span className="text-gray-500 mx-1">vs</span>
                                        <span className="font-medium">{team2?.name || 'TBD'}</span>
                                        <span className="text-blue-400 ml-1">({match.matchState})</span>
                                      </div>
                                    );
                                  })}
                                  {userMatches[user.id].active.length > 2 && (
                                    <div className="text-gray-400 text-xs">+{userMatches[user.id].active.length - 2} more matches</div>
                                  )}
                                </div>
                              )}

                              {/* Show recent match history if any */}
                              {userMatches[user.id].history.length > 0 && (
                                <div className="mt-2 p-2 bg-purple-900/20 border border-purple-700/30 rounded text-xs">
                                  <div className="text-purple-300 font-medium mb-2 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Recent History:
                                  </div>
                                  <div className="text-gray-300 text-xs">
                                    {userMatches[user.id].history.length} completed matches
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-md transition-colors text-sm"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        
                        <button
                          onClick={() => handleUpdateAdminStatus(user.id, !user.isAdmin)}
                          disabled={updatingUser === user.id}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                            user.isAdmin
                              ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-900/20'
                              : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                          }`}
                        >
                          {updatingUser === user.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          ) : user.isAdmin ? (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Remove Admin</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Make Admin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Edit User: {editingUser.username}</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Riot ID
                    </label>
                    <input
                      type="text"
                      value={editingUser.riotId}
                      onChange={(e) => setEditingUser({ ...editingUser, riotId: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord Username
                    </label>
                    <input
                      type="text"
                      value={editingUser.discordUsername}
                      onChange={(e) => setEditingUser({ ...editingUser, discordUsername: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord ID
                    </label>
                    <input
                      type="text"
                      value={editingUser.discordId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, discordId: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord Avatar URL
                    </label>
                    <input
                      type="text"
                      value={editingUser.discordAvatar || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, discordAvatar: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="discordLinked"
                      checked={editingUser.discordLinked || false}
                      onChange={(e) => setEditingUser({ ...editingUser, discordLinked: e.target.checked })}
                      className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="discordLinked" className="text-sm font-medium text-gray-300">
                      Discord Linked
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="inDiscordServer"
                      checked={editingUser.inDiscordServer || false}
                      onChange={(e) => setEditingUser({ ...editingUser, inDiscordServer: e.target.checked })}
                      className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="inDiscordServer" className="text-sm font-medium text-gray-300">
                      In Discord Server
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={editingUser.isAdmin || false}
                      onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                      className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isAdmin" className="text-sm font-medium text-gray-300">
                      Admin Status
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveUser(editingUser)}
                    disabled={updatingUser === editingUser.id}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingUser === editingUser.id ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stream Overlays Tab */}
        {activeTab === 'stream-overlays' && (
          <div className="card">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-center">
                <Link className="w-6 h-6 mr-3 text-blue-400" />
                Stream Overlay Manager
              </h2>
              <p className="text-white/80 mb-6">
                Generate and manage stream overlay URLs for casters and streamers
              </p>
              <button
                onClick={() => navigate('/admin/stream-overlays')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Stream Overlay Manager</span>
              </button>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="card">
            <AdminStats />
          </div>
        )}
      </div>
      
      {/* Unity League Footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-pink-300 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; ADMIN PANEL</span>
          <span className="text-cyan-400">// Unity League 2025</span>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 