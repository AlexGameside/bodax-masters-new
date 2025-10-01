import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Team, Match, User, Tournament } from '../types/tournament';
import { Shield, Users, Calendar, Download, Plus, Play, Trash2, AlertTriangle, Info, Search, UserCheck, UserX, Crown, TestTube, Clock, Trophy, Edit, Eye, CheckCircle, XCircle, MessageSquare, ExternalLink, MessageCircle, FileText, Activity, RefreshCw, User as UserIcon, BarChart3, Link, Database, Globe, Lock, Save, Tv, Bug, Video, UserPlus } from 'lucide-react';
import { getAllUsers, updateUserAdminStatus, createTestScenario, clearTestData, createTestUsersWithAuth, getTestUsers, migrateAllTeams, updateAllInvitationsExpiration, sendDiscordNotificationToUser, getUsersWithDiscord, getSignupLogs, getGeneralLogs, logAdminAction, migrateExistingUsersToPublic, getIPAnalysis, updateUserRiotId, adminEditMatchScores, adminResetMatch, adminForceCompleteMatch, adminForceScheduleMatch, adminChangeMatchTeams, adminAddTeamMember, getTeams, signupTeamForTournament, resetAllRosterChanges, adminRevertSwissToRound1, adminRevertSwissToRound2, adminFixRound2MatchdayDates, type AdminLog } from '../services/firebaseService';
import { notifyCustomMessage, getTeamDiscordIds } from '../services/discordService';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import AdminStats from './AdminStats';
import AdminMatchManagement from '../components/AdminMatchManagement';
import AllMatchesManagement from '../components/AllMatchesManagement';
import StreamerManagement from '../components/StreamerManagement';
import StreamingManagement from '../components/StreamingManagement';
import Map3IssuesTab from '../components/Map3IssuesTab';
import StreamerStatisticsTab from '../components/StreamerStatisticsTab';
import { exportTeamsWithTournamentStatus, getTournamentTeamsData } from '../scripts/enhancedTeamExport';

interface AdminPanelProps {
  teams: Team[];
  matches: Match[];
  isAdmin: boolean;
  currentUser: User | null;
  onAddTeam: (team: Omit<Team, 'id'>) => Promise<any>;
  onUpdateMatch: (matchId: string, result: { team1Score: number; team2Score: number }) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onDeleteAllTeams: () => Promise<void>;
  onDeleteAllMatches: () => Promise<void>;
  onGenerateRandomTeams: (count: number) => Promise<string[]>;
  onGenerateFinalBracket: () => Promise<void>;
  forceTab?: string;
}

const AdminPanel = ({ 
  teams, 
  matches, 
  isAdmin, 
  currentUser,
  onAddTeam,
  onUpdateMatch,
  onDeleteTeam,
  onDeleteAllTeams,
  onDeleteAllMatches,
  onGenerateRandomTeams,
  onGenerateFinalBracket,
  forceTab
}: AdminPanelProps) => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const activeTab = (forceTab || tab || 'tournaments') as 'tournaments' | 'teams' | 'matches' | 'all-matches' | 'disputes' | 'notifications' | 'signup-logs' | 'general-logs' | 'users' | 'stats' | 'stream-overlays' | 'streaming' | 'streamer-management' | 'migration' | 'map3-issues' | 'streamer-stats' | 'swiss-analysis';
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [swissAnalysis, setSwissAnalysis] = useState<any>(null);
  const [analyzingSwiss, setAnalyzingSwiss] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disputedMatches, setDisputedMatches] = useState<Match[]>([]);
  const [discordUsers, setDiscordUsers] = useState<User[]>([]);
  const [selectedDiscordUser, setSelectedDiscordUser] = useState<string>('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [signupLogs, setSignupLogs] = useState<AdminLog[]>([]);
  const [generalLogs, setGeneralLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{created: number, skipped: number} | null>(null);
  const [ipAnalysis, setIpAnalysis] = useState<any[]>([]);
  const [loadingIpAnalysis, setLoadingIpAnalysis] = useState(false);
  const [revertingTournament, setRevertingTournament] = useState<string | null>(null);
  const [editingRiotId, setEditingRiotId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newRiotId, setNewRiotId] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [expandedTeamRoster, setExpandedTeamRoster] = useState<string | null>(null);
  const [showManualPlayerAddition, setShowManualPlayerAddition] = useState(false);
  const [selectedTeamForPlayerAddition, setSelectedTeamForPlayerAddition] = useState<string>('');
  const [selectedUserForPlayerAddition, setSelectedUserForPlayerAddition] = useState<string>('');
  const [selectedRoleForPlayerAddition, setSelectedRoleForPlayerAddition] = useState<'member' | 'captain' | 'owner'>('member');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [userSearchTermForAddition, setUserSearchTermForAddition] = useState('');
  const [filteredTeamsForAddition, setFilteredTeamsForAddition] = useState<Team[]>([]);
  const [filteredUsersForAddition, setFilteredUsersForAddition] = useState<User[]>([]);
  const [searchingTeams, setSearchingTeams] = useState(false);
  const [searchingUsersForAddition, setSearchingUsersForAddition] = useState(false);
  const [teamSearchTimeout, setTeamSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userSearchTimeout, setUserSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userMatches, setUserMatches] = useState<Record<string, { active: Match[], history: Match[] }>>({});
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userIPAnalysis, setUserIPAnalysis] = useState<any[]>([]);
  const [loadingUserIP, setLoadingUserIP] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Discord Test State
  const [discordTestMessage, setDiscordTestMessage] = useState('🎮 Discord Bot Test - This is a test message from Unity League!');
  const [discordTestType, setDiscordTestType] = useState<'dm' | 'channel'>('dm');
  const [discordTestTarget, setDiscordTestTarget] = useState<string>('');
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Manual Team Registration State
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTournamentForRegistration, setSelectedTournamentForRegistration] = useState<string>('');
  const [selectedTeamForRegistration, setSelectedTeamForRegistration] = useState<string>('');
  const [teamSearchTermForRegistration, setTeamSearchTermForRegistration] = useState('');
  const [filteredTeamsForRegistration, setFilteredTeamsForRegistration] = useState<Team[]>([]);
  const [registeringTeam, setRegisteringTeam] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reset Roster Changes State
  const [resettingRosterChanges, setResettingRosterChanges] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Load Teams Function
  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const teams = await getTeams(currentUser?.id, true); // Admin access
      setAllTeams(teams);
      setFilteredTeamsForRegistration(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  // Filter Teams Function
  const filterTeamsForRegistration = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredTeamsForRegistration(allTeams);
      return;
    }

    const filtered = allTeams.filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.teamTag.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeamsForRegistration(filtered);
  };

  // Manual Team Registration Function
  const registerTeamManually = async () => {
    if (!selectedTournamentForRegistration || !selectedTeamForRegistration) {
      toast.error('Please select both tournament and team');
      return;
    }

    setRegisteringTeam(true);
    setRegistrationResult(null);

    try {
      await signupTeamForTournament(selectedTournamentForRegistration, selectedTeamForRegistration);
      
      setRegistrationResult({
        success: true,
        message: `Team successfully registered for tournament!`
      });

      toast.success('Team registered successfully!');
      
      // Refresh tournaments to show updated team count
      await loadTournaments();
      
      // Clear selections
      setSelectedTeamForRegistration('');
      setTeamSearchTermForRegistration('');
      setFilteredTeamsForRegistration(allTeams);
      
    } catch (error: any) {
      console.error('Error registering team:', error);
      setRegistrationResult({
        success: false,
        message: `Error: ${error.message}`
      });
      toast.error(`Failed to register team: ${error.message}`);
    } finally {
      setRegisteringTeam(false);
    }
  };

  // Reset All Roster Changes Function
  const handleResetAllRosterChanges = async () => {
    setResettingRosterChanges(true);
    setResetResult(null);

    try {
      const result = await resetAllRosterChanges();
      
      setResetResult(result);
      
      if (result.errors.length === 0) {
        toast.success(`Successfully reset roster changes for ${result.success} teams!`);
      } else {
        toast.success(`Reset ${result.success} teams successfully, ${result.errors.length} errors occurred`);
      }
      
      // Refresh teams to show updated roster change counts
      await loadTeams();
      
    } catch (error: any) {
      console.error('Error resetting roster changes:', error);
      toast.error(`Failed to reset roster changes: ${error.message}`);
    } finally {
      setResettingRosterChanges(false);
      setShowResetConfirmation(false);
    }
  };

  // Discord Test Function
  const testDiscordNotification = async () => {
    if (!discordTestMessage.trim()) {
      toast.error('Please enter a test message');
      return;
    }

    setTestingDiscord(true);
    setDiscordTestResult(null);

    try {
      const embed = {
        title: '🧪 Discord Bot Test',
        description: discordTestMessage,
        color: 0x00ff00, // Green
        fields: [
          {
            name: 'Test Type',
            value: discordTestType === 'dm' ? 'Direct Message' : 'Channel Message',
            inline: true
          },
          {
            name: 'Timestamp',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: 'Unity League Discord Bot Test'
        },
        timestamp: new Date().toISOString()
      };

      if (discordTestType === 'dm') {
        // Test DM to specific user
        if (!discordTestTarget.trim()) {
          toast.error('Please enter a Discord user ID for DM test');
          return;
        }

        const result = await notifyCustomMessage(
          '', // No channel for DM
          discordTestMessage,
          embed,
          [discordTestTarget.trim()]
        );

        setDiscordTestResult({
          success: result,
          message: result ? 'DM sent successfully!' : 'Failed to send DM',
          details: { type: 'dm', target: discordTestTarget.trim() }
        });

        if (result) {
          toast.success('Discord DM test sent successfully!');
        } else {
          toast.error('Failed to send Discord DM test');
        }
      } else {
        // Test channel message
        const channelId = import.meta.env.VITE_DISCORD_ADMIN_CHANNEL_ID;
        if (!channelId) {
          toast.error('Admin channel ID not configured');
          return;
        }

        const result = await notifyCustomMessage(
          channelId,
          discordTestMessage,
          embed
        );

        setDiscordTestResult({
          success: result,
          message: result ? 'Channel message sent successfully!' : 'Failed to send channel message',
          details: { type: 'channel', channelId }
        });

        if (result) {
          toast.success('Discord channel test sent successfully!');
        } else {
          toast.error('Failed to send Discord channel test');
        }
      }
    } catch (error: any) {
      console.error('Discord test error:', error);
      setDiscordTestResult({
        success: false,
        message: `Error: ${error.message}`,
        details: error
      });
      toast.error(`Discord test failed: ${error.message}`);
    } finally {
      setTestingDiscord(false);
    }
  };

  // Add null checks for teams and matches
  const safeTeams = teams || [];
  const safeMatches = matches || [];

  // Helper function to get user details for team members
  const getUserDetails = (userId: string): User | undefined => {
    return allUsers.find(user => user.id === userId);
  };

  // Load tournaments and teams on component mount
  useEffect(() => {
    loadTournaments();
    loadTeams();
  }, []);

  const loadTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const { getTournaments } = await import('../services/firebaseService');
      const tournamentsData = await getTournaments(undefined, true); // Admins can see all tournaments
      setTournaments(tournamentsData);
    } catch (error) {

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

  // Load tournaments when all-matches tab is active
  useEffect(() => {
    if (activeTab === 'all-matches' && tournaments.length === 0) {
      loadTournaments();
    }
  }, [activeTab, tournaments.length]);

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

    } finally {
      setLoadingUsers(false);
    }
  };

  const loadTestUsers = async () => {
    try {
      const fetchedTestUsers = await getTestUsers();
      // setTestUsers(fetchedTestUsers); // Removed since setTestUsers is not defined
    } catch (error) {

    }
  };

  const loadDiscordUsers = async () => {
    try {
      const users = await getUsersWithDiscord();
      setDiscordUsers(users);
    } catch (error) {

    }
  };

  const loadSignupLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getSignupLogs(50);
      setSignupLogs(logs);
    } catch (error) {

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

    } finally {
      setLoadingLogs(false);
    }
  };

  const runMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateExistingUsersToPublic();
      setMigrationResult(result);
      toast.success(`Migration complete! Created: ${result.created}, Skipped: ${result.skipped}`);
    } catch (error) {

      toast.error('Migration failed. Check console for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  const loadIPAnalysis = async () => {
    setLoadingIpAnalysis(true);
    try {
      const analysis = await getIPAnalysis();
      setIpAnalysis(analysis);
    } catch (error) {

      toast.error('Failed to load IP analysis');
    } finally {
      setLoadingIpAnalysis(false);
    }
  };

  const loadUserIPAnalysis = async (userId: string) => {
    setLoadingUserIP(true);
    try {
      const analysis = await getIPAnalysis();
      // Filter analysis to show only IPs used by this specific user
      const userAnalysis = analysis.filter(ipData => 
        ipData.users.some((user: any) => user.userId === userId)
      );
      setUserIPAnalysis(userAnalysis);
    } catch (error) {

      toast.error('Failed to load IP analysis');
    } finally {
      setLoadingUserIP(false);
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

      toast.error('Failed to create test logs');
    }
  };

  const handleSaveRiotId = async () => {
    if (!editingRiotId) return;
    
    try {
      await updateUserRiotId(editingRiotId, newRiotId);
      toast.success('Riot ID updated successfully!');
      
      // Update the user in the filtered users list
      setFilteredUsers(prev => prev.map(u => 
        u.id === editingRiotId ? { ...u, riotId: newRiotId } : u
      ));
      
      setEditingRiotId(null);
      setNewRiotId('');
    } catch (error) {
      toast.error('Failed to update Riot ID');
    }
  };

  // Scroll to top when riot ID modal opens
  useEffect(() => {
    if (editingRiotId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingRiotId]);

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

      toast.error('Failed to update user');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    // Load IP analysis for this user
    loadUserIPAnalysis(user.id);
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
      
      // Load match data and IP analysis for found users
      await loadUserMatches(filtered);
      
      // Load IP analysis if not already loaded
      if (ipAnalysis.length === 0) {
        try {
          const analysis = await getIPAnalysis();
          setIpAnalysis(analysis);
        } catch (error) {
          console.error('Failed to load IP analysis:', error);
        }
      }
    } catch (error) {
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
      
      // Load matches for each user (show all users)
      const usersToLoad = users;
      
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

        
        toast.success('Tournament registration check completed!', { duration: 5000 });
        
        // Also show alert with details
        alert(message);
      } else {
        toast.error(result.message || 'Failed to check tournament registration');
      }
    } catch (error) {

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

      alert('Error generating final bracket. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await onDeleteTeam(teamId);
    } catch (error) {

      toast.error('Error deleting team. Please try again.');
    }
  };

  const handleStartRosterChanges = async (teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        rosterChangesUsed: 0,
        rosterLocked: false,
        rosterChangeDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
      toast.success('Roster changes tracking started for this team');
    } catch (error) {

      toast.error('Error starting roster changes. Please try again.');
    }
  };

  const handleLockRoster = async (teamId: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        rosterLocked: true,
        rosterLockDate: new Date(),
        rosterChangeDeadline: new Date(0) // Set to epoch to effectively remove deadline
      });
      toast.success('Roster locked for this team');
    } catch (error) {

      toast.error('Error locking roster. Please try again.');
    }
  };

  const handleStartAllTeams = async () => {
    if (!window.confirm('Are you sure you want to START roster changes for ALL teams? This will reset all roster change counters and set new deadlines.')) {
      return;
    }

    try {
      const promises = safeTeams.map(team => {
        const teamRef = doc(db, 'teams', team.id);
        return updateDoc(teamRef, {
          rosterChangesUsed: 0,
          rosterLocked: false,
          rosterChangeDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
      });

      await Promise.all(promises);
      toast.success(`Roster changes started for ${safeTeams.length} teams`);
    } catch (error) {

      toast.error('Error starting roster changes for all teams. Please try again.');
    }
  };

  const handleLockAllTeams = async () => {
    if (!window.confirm('Are you sure you want to LOCK roster for ALL teams? This will permanently lock all rosters and remove deadlines.')) {
      return;
    }

    try {
      const promises = safeTeams.map(team => {
        const teamRef = doc(db, 'teams', team.id);
        return updateDoc(teamRef, {
          rosterLocked: true,
          rosterLockDate: new Date(),
          rosterChangeDeadline: new Date(0) // Set to epoch to effectively remove deadline
        });
      });

      await Promise.all(promises);
      toast.success(`Roster locked for ${safeTeams.length} teams`);
    } catch (error) {

      toast.error('Error locking roster for all teams. Please try again.');
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

      alert('Error deleting teams. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManualPlayerAddition = async () => {
    if (!selectedTeamForPlayerAddition || !selectedUserForPlayerAddition) {
      toast.error('Please select both a team and a user');
      return;
    }

    if (!currentUser) {
      toast.error('Admin user not found');
      return;
    }

    setAddingPlayer(true);
    try {
      await adminAddTeamMember(
        selectedTeamForPlayerAddition,
        selectedUserForPlayerAddition,
        selectedRoleForPlayerAddition,
        currentUser.id,
        currentUser.username || 'Unknown Admin'
      );
      
      toast.success(`Successfully added user to team as ${selectedRoleForPlayerAddition}`);
      
      // Reset form
      setSelectedTeamForPlayerAddition('');
      setSelectedUserForPlayerAddition('');
      setSelectedRoleForPlayerAddition('member');
      setShowManualPlayerAddition(false);
      setTeamSearchTerm('');
      setUserSearchTermForAddition('');
      setFilteredTeamsForAddition([]);
      setFilteredUsersForAddition([]);
      
      // Refresh teams data
      window.location.reload();
    } catch (error) {
      toast.error(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAddingPlayer(false);
    }
  };

  // Search teams function
  const searchTeams = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredTeamsForAddition([]);
      return;
    }

    setSearchingTeams(true);
    try {
      const searchLower = searchTerm.toLowerCase();
      const filtered = safeTeams.filter(team => 
        team.name.toLowerCase().includes(searchLower) ||
        (team.teamTag && team.teamTag.toLowerCase().includes(searchLower)) ||
        (team.captainId && getUserDetails(team.captainId)?.username?.toLowerCase().includes(searchLower))
      );
      
      setFilteredTeamsForAddition(filtered);
    } catch (error) {
      toast.error('Failed to search teams');
    } finally {
      setSearchingTeams(false);
    }
  };

  // Search users function for player addition
  const searchUsersForAddition = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredUsersForAddition([]);
      return;
    }

    setSearchingUsersForAddition(true);
    try {
      const searchLower = searchTerm.toLowerCase();
      const filtered = allUsers.filter(user => 
        (user.username?.toLowerCase() || '').includes(searchLower) ||
        (user.email?.toLowerCase() || '').includes(searchLower) ||
        (user.riotId?.toLowerCase() || '').includes(searchLower) ||
        (user.discordUsername?.toLowerCase() || '').includes(searchLower)
      );
      
      setFilteredUsersForAddition(filtered);
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setSearchingUsersForAddition(false);
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

  const handleRevertSwissToRound1 = async (tournamentId: string) => {
    console.log('🔄 Revert button clicked for tournament:', tournamentId);
    console.log('👤 Current user:', currentUser);
    console.log('🔐 Is admin:', currentUser?.isAdmin);
    console.log('🆔 User ID:', currentUser?.id);
    
    if (!currentUser?.isAdmin || !currentUser?.id) {
      console.log('❌ User not authorized for revert operation');
      return;
    }
    
    const confirmed = window.confirm(
      '🛡️ BULLETPROOF REVERT TO ROUND 1\n\n' +
      'This will safely delete ALL Round 2+ matches and reset the tournament to Round 1.\n\n' +
      '✅ WHAT WILL BE PRESERVED:\n' +
      '• All Round 1 matches and their results\n' +
      '• All Round 1 standings data\n' +
      '• All Round 1 map scores and statistics\n' +
      '• All Round 1 chat messages\n' +
      '• All Round 1 scheduling data\n\n' +
      '🗑️ WHAT WILL BE DELETED:\n' +
      '• All Round 2+ matches and their results\n' +
      '• All Round 2+ standings data\n' +
      '• All Round 2+ chat messages\n' +
      '• All Round 2+ scheduling proposals\n' +
      '• All Round 2+ disputes\n' +
      '• All Round 2+ matchdays\n\n' +
      '⚠️ This action cannot be undone!\n\n' +
      'Are you sure you want to proceed with the BULLETPROOF revert?'
    );
    
    if (!confirmed) return;
    
    try {
      setRevertingTournament(tournamentId);
      toast.loading('Starting BULLETPROOF revert...', { duration: 2000 });
      
      await adminRevertSwissToRound1(tournamentId, currentUser.id);
      
      toast.success('✅ BULLETPROOF revert completed successfully!', { duration: 5000 });
      
      // Refresh tournaments list
      await loadTournaments();
    } catch (error) {
      console.error('Error reverting tournament:', error);
      toast.error('❌ Failed to revert tournament: ' + (error as Error).message);
    } finally {
      setRevertingTournament(null);
    }
  };

  const handleRevertSwissToRound2 = async (tournamentId: string) => {
    console.log('🔄 Revert to Round 2 button clicked for tournament:', tournamentId);
    console.log('👤 Current user:', currentUser);
    console.log('🔐 Is admin:', currentUser?.isAdmin);
    console.log('🆔 User ID:', currentUser?.id);
    
    if (!currentUser?.isAdmin || !currentUser?.id) {
      console.log('❌ User not authorized for revert operation');
      return;
    }
    
    const confirmed = window.confirm(
      '🛡️ BULLETPROOF REVERT TO ROUND 2\n\n' +
      'This will safely delete ALL Round 3+ matches and reset the tournament to Round 2.\n\n' +
      '✅ WHAT WILL BE PRESERVED:\n' +
      '• All Round 1-2 matches and their results\n' +
      '• All Round 1-2 standings data\n' +
      '• All Round 1-2 map scores and statistics\n' +
      '• All Round 1-2 chat messages\n' +
      '• All Round 1-2 scheduling data\n\n' +
      '🗑️ WHAT WILL BE DELETED:\n' +
      '• All Round 3+ matches and their results\n' +
      '• All Round 3+ standings data\n' +
      '• All Round 3+ chat messages\n' +
      '• All Round 3+ scheduling proposals\n' +
      '• All Round 3+ disputes\n' +
      '• All Round 3+ matchdays\n\n' +
      '⚠️ This action cannot be undone!\n\n' +
      'Are you sure you want to proceed with the BULLETPROOF revert to Round 2?'
    );
    
    if (!confirmed) return;
    
    try {
      setRevertingTournament(tournamentId);
      toast.loading('Starting BULLETPROOF revert to Round 2...', { duration: 2000 });
      
      await adminRevertSwissToRound2(tournamentId, currentUser.id);
      
      toast.success('✅ BULLETPROOF revert to Round 2 completed successfully!', { duration: 5000 });
      
      // Refresh tournaments list
      await loadTournaments();
    } catch (error) {
      console.error('Error reverting tournament to Round 2:', error);
      toast.error('❌ Failed to revert tournament to Round 2: ' + (error as Error).message);
    } finally {
      setRevertingTournament(null);
    }
  };

  const analyzeSwissPairings = async (tournamentId: string) => {
    if (!currentUser?.isAdmin) return;
    
    setAnalyzingSwiss(true);
    try {
      const { SwissTournamentService } = await import('../services/swissTournamentService');
      const analysis = await SwissTournamentService.analyzeSwissPairings(tournamentId);
      setSwissAnalysis(analysis);
      toast.success('Swiss pairing analysis completed!');
    } catch (error) {
      console.error('Error analyzing Swiss pairings:', error);
      toast.error('Failed to analyze Swiss pairings: ' + (error as Error).message);
    } finally {
      setAnalyzingSwiss(false);
    }
  };

  const handleFixRound2MatchdayDates = async (tournamentId: string) => {
    if (!currentUser?.isAdmin || !currentUser?.id) {
      return;
    }
    
    const confirmed = window.confirm(
      '🔧 Fix Round 2 Matchday Dates\n\n' +
      'This will update Round 2 matchday dates to be sequential after Round 1.\n\n' +
      '✅ WHAT WILL BE FIXED:\n' +
      '• Round 2 start date will be set to the day after Round 1 ends\n' +
      '• Round 2 end date will be set to 7 days after the new start date\n' +
      '• Scheduling proposals will use the correct dates\n\n' +
      'Are you sure you want to fix the Round 2 matchday dates?'
    );
    
    if (!confirmed) return;
    
    try {
      toast.loading('Fixing Round 2 matchday dates...', { duration: 2000 });
      
      await adminFixRound2MatchdayDates(tournamentId, currentUser.id);
      
      toast.success('✅ Round 2 matchday dates fixed successfully!', { duration: 5000 });
      
      // Refresh tournaments list
      await loadTournaments();
    } catch (error) {
      console.error('Error fixing Round 2 matchday dates:', error);
      toast.error('❌ Failed to fix Round 2 matchday dates: ' + (error as Error).message);
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
        <div className="flex space-x-1 bg-black/40 rounded-xl p-1 shadow-lg mb-8 border border-white/20 backdrop-blur-sm overflow-x-auto min-w-0">
          {[
            { id: 'tournaments', label: 'TOURNAMENTS', icon: Trophy },
            { id: 'teams', label: 'TEAMS', icon: Users },
            { id: 'matches', label: 'MATCHES', icon: Calendar },
            { id: 'all-matches', label: 'ALL MATCHES', icon: Calendar },
            { id: 'disputes', label: 'DISPUTES', icon: AlertTriangle },
            { id: 'notifications', label: 'NOTIFICATIONS', icon: MessageSquare },
            { id: 'signup-logs', label: 'SIGNUP LOGS', icon: FileText },
            { id: 'general-logs', label: 'GENERAL LOGS', icon: Activity },
            { id: 'users', label: 'USERS', icon: Users },
            { id: 'stats', label: 'STATISTICS', icon: BarChart3 },
            { id: 'stream-overlays', label: 'STREAM OVERLAYS', icon: Link },
            { id: 'streaming', label: 'STREAMING', icon: Tv },
            { id: 'streamer-management', label: 'STREAMER LINKS', icon: Users },
            { id: 'streamer-stats', label: 'STREAMER STATS', icon: Video },
            { id: 'map3-issues', label: 'MAP 3 ISSUES', icon: Bug },
            { id: 'swiss-analysis', label: 'SWISS ANALYSIS', icon: BarChart3 },
            { id: 'migration', label: 'MIGRATION', icon: Database }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/admin/${tab.id}`)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 font-mono tracking-tight whitespace-nowrap text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-3 h-3" />
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
                <button
                  onClick={() => setShowManualPlayerAddition(true)}
                  className="btn-secondary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player to Team
                </button>
                <button
                  onClick={() => setShowResetConfirmation(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset All Roster Changes</span>
                </button>
                <button
                  onClick={handleStartAllTeams}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>START ALL TEAMS</span>
                </button>
                <button
                  onClick={handleLockAllTeams}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>LOCK ALL TEAMS</span>
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
                    <th className="text-left p-3 text-gray-300 font-medium">Roster Status</th>
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
                          <div className="flex flex-col space-y-1">
                            {team.rosterLocked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </span>
                            ) : team.rosterChangesUsed >= 3 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-900/50 text-orange-300 border border-orange-700">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Max Changes Used
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {team.rosterChangesUsed || 0}/3 Changes
                              </span>
                            )}
                            {team.rosterChangeDeadline && !team.rosterLocked && new Date(team.rosterChangeDeadline).getTime() > 0 && (
                              <span className="text-xs text-gray-400">
                                Deadline: {team.rosterChangeDeadline.toLocaleDateString()}
                              </span>
                            )}
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
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleStartRosterChanges(team.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center space-x-1"
                              title="Start tracking roster changes"
                            >
                              <Play className="w-4 h-4" />
                              <span>START</span>
                            </button>
                            <button
                              onClick={() => handleLockRoster(team.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center space-x-1"
                              title="Lock roster and remove deadline"
                            >
                              <Lock className="w-4 h-4" />
                              <span>LOCK</span>
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="btn-danger btn-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Roster Dropdown */}
                      {expandedTeamRoster === team.id && (
                        <tr className="bg-gray-800/50">
                          <td colSpan={6} className="p-4">
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
                                              {isAdmin ? (user?.email || 'No email') : 'Email hidden'}
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

        {/* Reset Roster Changes Confirmation Modal */}
        {showResetConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <RefreshCw className="w-6 h-6 mr-3 text-orange-400" />
                  Reset All Roster Changes
                </h3>
                <button
                  onClick={() => setShowResetConfirmation(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-orange-400 font-semibold mb-2">Warning</h4>
                      <p className="text-gray-300 text-sm">
                        This will reset the roster change count to 0 for ALL teams. 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">What this does:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Sets roster changes used to 0 for all teams</li>
                    <li>• Allows teams to make roster changes again</li>
                    <li>• Does not affect team members or other data</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowResetConfirmation(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetAllRosterChanges}
                    disabled={resettingRosterChanges}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {resettingRosterChanges ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Reset All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Result Display */}
        {resetResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-green-400" />
                  Reset Complete
                </h3>
                <button
                  onClick={() => setResetResult(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-green-400 font-semibold">Success</h4>
                      <p className="text-gray-300 text-sm">
                        Reset roster changes for {resetResult.success} teams
                      </p>
                    </div>
                  </div>
                </div>
                
                {resetResult.errors.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-red-400 font-semibold mb-2">Errors ({resetResult.errors.length})</h4>
                        <div className="text-gray-300 text-sm space-y-1 max-h-32 overflow-y-auto">
                          {resetResult.errors.map((error, index) => (
                            <div key={index} className="text-xs bg-gray-700/50 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setResetResult(null)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Player Addition Modal */}
        {showManualPlayerAddition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Add Player to Team</h3>
                <button
                  onClick={() => {
                    setShowManualPlayerAddition(false);
                    setSelectedTeamForPlayerAddition('');
                    setSelectedUserForPlayerAddition('');
                    setSelectedRoleForPlayerAddition('member');
                    setTeamSearchTerm('');
                    setUserSearchTermForAddition('');
                    setFilteredTeamsForAddition([]);
                    setFilteredUsersForAddition([]);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Selection */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    Select Team
                  </h4>
                  
                  {/* Team Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search teams by name, tag, or captain..."
                      value={teamSearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTeamSearchTerm(value);
                        
                        if (teamSearchTimeout) {
                          clearTimeout(teamSearchTimeout);
                        }
                        
                        const timeoutId = setTimeout(() => {
                          searchTeams(value);
                        }, 300);
                        
                        setTeamSearchTimeout(timeoutId);
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchingTeams && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Team Results */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {teamSearchTerm ? (
                      filteredTeamsForAddition.length > 0 ? (
                        filteredTeamsForAddition.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => setSelectedTeamForPlayerAddition(team.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTeamForPlayerAddition === team.id
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{team.name}</div>
                                {team.teamTag && (
                                  <div className="text-sm text-gray-400">Tag: {team.teamTag}</div>
                                )}
                                <div className="text-sm text-gray-400">
                                  Captain: {getUserDetails(team.captainId)?.username || team.captainId}
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                {team.members?.length || 0}/{team.maxMembers}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          No teams found matching "{teamSearchTerm}"
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        Start typing to search for teams...
                      </div>
                    )}
                  </div>
                </div>

                {/* User Selection */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-green-400" />
                    Select User
                  </h4>
                  
                  {/* User Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search users by username, email, Riot ID..."
                      value={userSearchTermForAddition}
                      onChange={(e) => {
                        const value = e.target.value;
                        setUserSearchTermForAddition(value);
                        
                        if (userSearchTimeout) {
                          clearTimeout(userSearchTimeout);
                        }
                        
                        const timeoutId = setTimeout(() => {
                          searchUsersForAddition(value);
                        }, 300);
                        
                        setUserSearchTimeout(timeoutId);
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {searchingUsersForAddition && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                      </div>
                    )}
                  </div>

                  {/* User Results */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {userSearchTermForAddition ? (
                      filteredUsersForAddition.length > 0 ? (
                        filteredUsersForAddition.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedUserForPlayerAddition(user.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUserForPlayerAddition === user.id
                                ? 'bg-green-600 border-green-500 text-white'
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-gray-400">{user.email}</div>
                                {user.riotId && (
                                  <div className="text-sm text-gray-400">Riot ID: {user.riotId}</div>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">
                                {user.teamIds?.length || 0} teams
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          No users found matching "{userSearchTermForAddition}"
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        Start typing to search for users...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white flex items-center mb-4">
                  <Crown className="w-5 h-5 mr-2 text-yellow-400" />
                  Select Role
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'member', label: 'Member', description: 'Regular team member', color: 'gray' },
                    { value: 'captain', label: 'Captain', description: 'Team captain', color: 'blue' },
                    { value: 'owner', label: 'Owner', description: 'Team owner', color: 'yellow' }
                  ].map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRoleForPlayerAddition(role.value as 'member' | 'captain' | 'owner')}
                      className={`p-4 rounded-lg border transition-colors ${
                        selectedRoleForPlayerAddition === role.value
                          ? `bg-${role.color}-600 border-${role.color}-500 text-white`
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{role.label}</div>
                      <div className="text-sm text-gray-400">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-300 text-sm mb-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">Admin Action</span>
                </div>
                <div className="text-xs text-blue-200">
                  This action bypasses roster change limits (0/3) and does not count against the team's roster changes.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualPlayerAddition(false);
                    setSelectedTeamForPlayerAddition('');
                    setSelectedUserForPlayerAddition('');
                    setSelectedRoleForPlayerAddition('member');
                    setTeamSearchTerm('');
                    setUserSearchTermForAddition('');
                    setFilteredTeamsForAddition([]);
                    setFilteredUsersForAddition([]);
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualPlayerAddition}
                  disabled={addingPlayer || !selectedTeamForPlayerAddition || !selectedUserForPlayerAddition}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {addingPlayer ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding Player...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Player to Team</span>
                    </>
                  )}
                </button>
              </div>
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
                safeMatches.map((match) => {
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
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-300">
                            {match.isComplete ? (
                              <span className="text-green-400 font-medium">
                                {match.team1Score} - {match.team2Score}
                              </span>
                            ) : (
                              <span className="text-orange-400">TBD</span>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Manage</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Admin Match Management */}
                      {selectedMatch?.id === match.id && (
                        <AdminMatchManagement
                          match={match}
                          teams={safeTeams}
                          currentUser={currentUser}
                          onMatchUpdated={() => {
                            // Refresh matches data
                            window.location.reload();
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* All Matches Tab */}
        {activeTab === 'all-matches' && (
          <AllMatchesManagement
            matches={matches}
            teams={teams}
            tournaments={tournaments}
          />
        )}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {/* Test Tournament Generator */}
            <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center">
                <TestTube className="w-5 h-5 mr-2" />
                Test Swiss Playoff System
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Creates a complete Swiss tournament with 20 teams, all 5 rounds finished, ready to generate playoff bracket.
              </p>
              <button
                onClick={async () => {
                  if (!confirm('Create test Swiss tournament? This will add 20 test teams and 1 tournament.')) return;
                  try {
                    const { createCompleteTestSwissTournament } = await import('../services/firebaseService');
                    const tournamentId = await createCompleteTestSwissTournament();
                    toast.success(`Test tournament created! ID: ${tournamentId}`);
                    navigate(`/tournaments/${tournamentId}`);
                  } catch (error: any) {
                    toast.error(`Failed: ${error.message}`);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center space-x-2"
              >
                <TestTube className="w-4 h-4" />
                <span>CREATE TEST SWISS TOURNAMENT</span>
              </button>
            </div>

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
                          <div className="flex flex-col space-y-2">
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
                            
                            {/* Swiss Tournament BULLETPROOF Revert Button */}
                            {(() => {
                              const shouldShowButton = tournament.format?.type === 'swiss-system' && tournament.status === 'in-progress';
                              console.log(`🔍 Tournament ${tournament.id}:`, {
                                name: tournament.name,
                                type: tournament.format?.type,
                                status: tournament.status,
                                shouldShowButton
                              });
                              return shouldShowButton;
                            })() && (
                              <button
                                onClick={() => {
                                  console.log('🖱️ Button clicked for tournament:', tournament.id);
                                  handleRevertSwissToRound1(tournament.id);
                                }}
                                disabled={revertingTournament === tournament.id}
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                title="🛡️ BULLETPROOF: Safely removes Round 2+ matches while preserving all Round 1 data"
                              >
                                {revertingTournament === tournament.id ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 inline mr-1 animate-spin" />
                                    BULLETPROOF Reverting...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 inline mr-1" />
                                    🛡️ BULLETPROOF Revert
                                  </>
                                )}
                              </button>
                            )}

                            {/* Swiss Tournament Revert to Round 2 Button */}
                            {(() => {
                              const shouldShowButton = tournament.format?.type === 'swiss-system' && 
                                                      tournament.status === 'in-progress' && 
                                                      (tournament.stageManagement?.swissStage?.currentRound ?? 0) >= 3;
                              return shouldShowButton;
                            })() && (
                              <button
                                onClick={() => {
                                  console.log('🖱️ Revert to Round 2 clicked for tournament:', tournament.id);
                                  handleRevertSwissToRound2(tournament.id);
                                }}
                                disabled={revertingTournament === tournament.id}
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-3 py-2 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                title="🛡️ BULLETPROOF: Safely removes Round 3+ matches while preserving all Round 1-2 data"
                              >
                                {revertingTournament === tournament.id ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 inline mr-1 animate-spin" />
                                    Reverting to Round 2...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 inline mr-1" />
                                    🛡️ Revert to Round 2
                                  </>
                                )}
                              </button>
                            )}
                            
                            {/* Swiss Tournament Fix Round 2 Dates Button */}
                            {(() => {
                              const shouldShowButton = tournament.format?.type === 'swiss-system' && tournament.status === 'in-progress';
                              return shouldShowButton;
                            })() && (
                              <button
                                onClick={() => {
                                  handleFixRound2MatchdayDates(tournament.id);
                                }}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-semibold mt-2"
                                title="🔧 Fix Round 2 matchday dates to be sequential after Round 1"
                              >
                                <Calendar className="w-4 h-4 inline mr-1" />
                                🔧 Fix Round 2 Dates
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manual Team Registration Section */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-400" />
                Manual Team Registration
              </h3>
              
              <div className="space-y-4">
                {/* Tournament Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Tournament
                  </label>
                  <select
                    value={selectedTournamentForRegistration}
                    onChange={(e) => setSelectedTournamentForRegistration(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose a tournament...</option>
                    {tournaments
                      .filter(t => t.status === 'registration-open')
                      .map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name} ({tournament.teams?.length || 0}/{tournament.format?.teamCount || 8} teams)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Team Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search Teams
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by team name or tag..."
                      value={teamSearchTermForRegistration}
                      onChange={(e) => {
                        setTeamSearchTermForRegistration(e.target.value);
                        filterTeamsForRegistration(e.target.value);
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Team Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Team
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700">
                    {loadingTeams ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Loading teams...</p>
                      </div>
                    ) : filteredTeamsForRegistration.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No teams found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-600">
                        {filteredTeamsForRegistration.map((team) => {
                          const isAlreadyRegistered = selectedTournamentForRegistration && 
                            tournaments.find(t => t.id === selectedTournamentForRegistration)?.teams?.includes(team.id);
                          
                          return (
                            <div
                              key={team.id}
                              className={`p-3 cursor-pointer transition-colors ${
                                selectedTeamForRegistration === team.id
                                  ? 'bg-primary-600/20 border-l-4 border-primary-500'
                                  : 'hover:bg-gray-600'
                              } ${isAlreadyRegistered ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => !isAlreadyRegistered && setSelectedTeamForRegistration(team.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-white">{team.name}</h4>
                                  <p className="text-sm text-gray-400">
                                    {team.teamTag} • {team.members?.length || 0} members
                                  </p>
                                </div>
                                {isAlreadyRegistered && (
                                  <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                                    Already Registered
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Register Button */}
                <div className="flex justify-center">
                  <button
                    onClick={registerTeamManually}
                    disabled={registeringTeam || !selectedTournamentForRegistration || !selectedTeamForRegistration}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {registeringTeam ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        <span>Register Team</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Registration Result */}
                {registrationResult && (
                  <div className={`p-4 rounded-lg border ${
                    registrationResult.success 
                      ? 'bg-green-900/20 border-green-700 text-green-300' 
                      : 'bg-red-900/20 border-red-700 text-red-300'
                  }`}>
                    <div className="flex items-center">
                      {registrationResult.success ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-2" />
                      )}
                      <span className="font-medium">{registrationResult.message}</span>
                    </div>
                  </div>
                )}
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
          <div className="space-y-6">
            {/* Discord Bot Test Section */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <TestTube className="w-6 h-6 mr-3 text-green-400" />
                  Discord Bot Test
                </h2>
              </div>

              <div className="space-y-4">
                {/* Test Message Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Test Message
                  </label>
                  <textarea
                    value={discordTestMessage}
                    onChange={(e) => setDiscordTestMessage(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter your test message..."
                  />
                </div>

                {/* Test Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Test Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="dm"
                        checked={discordTestType === 'dm'}
                        onChange={(e) => setDiscordTestType(e.target.value as 'dm' | 'channel')}
                        className="mr-2 text-green-500"
                      />
                      <span className="text-white">Direct Message (DM)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="channel"
                        checked={discordTestType === 'channel'}
                        onChange={(e) => setDiscordTestType(e.target.value as 'dm' | 'channel')}
                        className="mr-2 text-green-500"
                      />
                      <span className="text-white">Channel Message</span>
                    </label>
                  </div>
                </div>

                {/* Discord User ID Input (for DM tests) */}
                {discordTestType === 'dm' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord User ID (for DM test)
                    </label>
                    <input
                      type="text"
                      value={discordTestTarget}
                      onChange={(e) => setDiscordTestTarget(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter Discord user ID (e.g., 123456789012345678)"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      💡 To get a Discord user ID: Right-click user → Copy ID (Developer Mode must be enabled)
                    </p>
                  </div>
                )}

                {/* Test Button */}
                <div className="flex justify-center">
                  <button
                    onClick={testDiscordNotification}
                    disabled={testingDiscord}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingDiscord ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4" />
                        <span>Test Discord Notification</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Test Result */}
                {discordTestResult && (
                  <div className={`p-4 rounded-lg border ${
                    discordTestResult.success 
                      ? 'bg-green-900/20 border-green-600 text-green-300' 
                      : 'bg-red-900/20 border-red-600 text-red-300'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {discordTestResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-medium">{discordTestResult.message}</span>
                    </div>
                    {discordTestResult.details && (
                      <div className="text-sm text-gray-400 mt-2">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(discordTestResult.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Discord Users List */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <MessageCircle className="w-6 h-6 mr-3 text-primary-400" />
                  Discord Users ({discordUsers.length} users with Discord linked)
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
                          <span className="text-blue-400 ml-2 text-sm">ID: {user.discordId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400 text-sm">Discord Linked</span>
                          <button
                            onClick={() => {
                              setDiscordTestTarget(user.discordId || '');
                              setDiscordTestType('dm');
                            }}
                            className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                          >
                            Test DM
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredUsers.map((user) => {
                    // Get user's teams with roles
                    const userTeams = teams.filter(team => 
                      team.members?.some(m => m.userId === user.id) ||
                      team.captainId === user.id ||
                      team.ownerId === user.id
                    ).map(team => {
                      const isOwner = team.ownerId === user.id;
                      const isCaptain = team.captainId === user.id;
                      const member = team.members?.find(m => m.userId === user.id);
                      const role = isOwner ? 'Owner' : isCaptain ? 'Captain' : member?.role || 'Member';
                      return { team, role };
                    });

                    const isExpanded = expandedUserId === user.id;

                    return (
                    <div key={user.id} className="bg-gray-800 rounded-lg border border-gray-700 hover:border-pink-500/30 transition-all">
                      {/* User Header - Clickable to expand */}
                      <div 
                        className="p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {user.discordAvatar ? (
                                <img
                                  src={user.discordAvatar}
                                  alt={user.username}
                                  className="w-12 h-12 rounded-full border-2 border-pink-500/30"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-purple-600 rounded-full flex items-center justify-center">
                                  <UserIcon className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-lg truncate">{user.username}</div>
                              <div className="text-gray-400 text-xs truncate">{user.email}</div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {user.isAdmin && (
                              <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded-full font-bold flex items-center space-x-1">
                                <Shield className="w-3 h-3" />
                                <span>ADMIN</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Expand indicator */}
                        <div className="text-center mt-2">
                          <span className="text-gray-500 text-xs">
                            {isExpanded ? '▼ Click to collapse' : '▶ Click for details'}
                          </span>
                        </div>
                      </div>

                      {/* User Info Grid - Always Visible */}
                      <div className="p-4 space-y-3">
                        {/* Riot ID with Edit Button */}
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-xs font-medium uppercase">Riot ID</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRiotId(user.id);
                                setNewRiotId(user.riotId || '');
                              }}
                              className="flex items-center space-x-1 px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-700/30 rounded transition-all text-xs"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                          <div className="text-white text-sm font-mono">{user.riotId || 'Not set'}</div>
                        </div>
                        
                        {/* Discord Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm font-medium">Discord:</span>
                          <div className="flex items-center space-x-2">
                            {user.discordLinked ? (
                              <>
                                <span className="text-green-400 text-sm truncate max-w-32">{user.discordUsername}</span>
                                {user.inDiscordServer && (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500 text-sm">Not linked</span>
                            )}
                          </div>
                        </div>

                        {/* Account Created */}
                        {user.createdAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm font-medium">Joined:</span>
                            <span className="text-gray-300 text-xs">
                              {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}

                      </div>

                      {/* Teams Section */}
                      {userTeams.length > 0 && (
                        <div className="px-4 pb-3">
                          <div className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>Teams ({userTeams.length})</span>
                          </div>
                          <div className="space-y-1.5">
                            {userTeams.map(({ team, role }) => (
                              <div 
                                key={team.id}
                                onClick={() => navigate(`/teams/${team.id}`)}
                                className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-700/50 hover:border-pink-500/50 transition-all cursor-pointer group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium truncate group-hover:text-pink-300 transition-colors">
                                    {team.name}
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                                  role === 'Owner' ? 'bg-yellow-900/50 text-yellow-300' :
                                  role === 'Captain' ? 'bg-blue-900/50 text-blue-300' :
                                  'bg-gray-700 text-gray-300'
                                }`}>
                                  {role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable Details Section */}
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-gray-700 bg-gray-900/30">
                          <div className="text-gray-400 text-xs font-bold uppercase mb-3 mt-3">Detailed Information</div>
                          
                          {/* All Match History */}
                          {userMatches[user.id]?.history && userMatches[user.id].history.length > 0 && (
                            <div className="mb-3">
                              <div className="text-gray-400 text-xs font-medium mb-1 flex items-center justify-between">
                                <span>Match History ({userMatches[user.id].history.length})</span>
                                <span className="text-purple-400">
                                  W: {userMatches[user.id].history.filter(m => {
                                    const userTeamIds = userTeams.map(ut => ut.team.id);
                                    return userTeamIds.includes(m.winnerId || '');
                                  }).length}
                                </span>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {userMatches[user.id].history.slice(0, 10).map((match) => {
                                  const team1 = teams.find(t => t.id === match.team1Id);
                                  const team2 = teams.find(t => t.id === match.team2Id);
                                  const userTeamIds = userTeams.map(ut => ut.team.id);
                                  const userWon = userTeamIds.includes(match.winnerId || '');
                                  return (
                                    <div 
                                      key={match.id}
                                      onClick={(e) => { e.stopPropagation(); navigate(`/match/${match.id}`); }}
                                      className="p-2 bg-gray-800/50 rounded text-xs hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 truncate">
                                          <span className={userWon ? 'text-green-400' : 'text-gray-400'}>
                                            {team1?.name} vs {team2?.name}
                                          </span>
                                        </div>
                                        <span className="text-white font-bold ml-2">
                                          {match.team1Score}-{match.team2Score}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* User ID for debugging */}
                          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                            <span className="text-gray-500 text-xs">User ID:</span>
                            <span className="text-gray-400 text-xs font-mono">{user.id}</span>
                          </div>
                        </div>
                      )}

                      {/* Match Stats */}
                      {!isExpanded && userMatches[user.id] && (userMatches[user.id].active.length > 0 || userMatches[user.id].history.length > 0) && (
                        <div className="px-4 pb-3">
                          <div className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center space-x-1">
                            <Trophy className="w-3 h-3" />
                            <span>Match Stats</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-900/20 border border-green-700/30 rounded p-2 text-center">
                              <div className="text-green-400 font-bold text-lg">{userMatches[user.id].active.length}</div>
                              <div className="text-gray-400 text-xs">Active</div>
                            </div>
                            <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2 text-center">
                              <div className="text-purple-400 font-bold text-lg">{userMatches[user.id].history.length}</div>
                              <div className="text-gray-400 text-xs">Completed</div>
                            </div>
                          </div>

                          {/* Active Match Details */}
                          {userMatches[user.id].active.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {userMatches[user.id].active.slice(0, 3).map((match) => {
                                const team1 = teams.find(t => t.id === match.team1Id);
                                const team2 = teams.find(t => t.id === match.team2Id);
                                return (
                                  <div 
                                    key={match.id}
                                    onClick={() => navigate(`/match/${match.id}`)}
                                    className="p-2 bg-blue-900/10 border border-blue-700/30 rounded text-xs hover:border-blue-500/50 transition-all cursor-pointer"
                                  >
                                    <div className="text-white font-medium truncate">
                                      {team1?.name || 'TBD'} <span className="text-gray-500">vs</span> {team2?.name || 'TBD'}
                                    </div>
                                    <div className="text-blue-400 text-xs mt-0.5">{match.matchState.replace(/_/g, ' ')}</div>
                                  </div>
                                );
                              })}
                              {userMatches[user.id].active.length > 3 && (
                                <div className="text-gray-400 text-xs text-center pt-1">
                                  +{userMatches[user.id].active.length - 3} more active
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="p-4 border-t border-gray-700 bg-gray-900/30">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Discord Message */}
                          {user.discordLinked && (
                            <button
                              onClick={() => {
                              setSelectedDiscordUser(user.id);
                              navigate('/admin/notifications');
                              }}
                              className="flex items-center justify-center space-x-1 px-3 py-2 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-700/30 rounded-md transition-all text-xs font-medium"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Message</span>
                            </button>
                          )}
                          
                          {/* Add to Team */}
                          <button
                            onClick={() => {
                              setSelectedUserForPlayerAddition(user.id);
                              setShowManualPlayerAddition(true);
                            }}
                            className="flex items-center justify-center space-x-1 px-3 py-2 bg-cyan-900/20 text-cyan-400 hover:bg-cyan-900/40 border border-cyan-700/30 rounded-md transition-all text-xs font-medium"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Add to Team</span>
                          </button>

                          {/* Toggle Admin */}
                          <button
                            onClick={() => handleUpdateAdminStatus(user.id, !user.isAdmin)}
                            disabled={updatingUser === user.id}
                            className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-md transition-all text-xs font-medium ${
                              user.isAdmin
                                ? 'bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 border border-orange-700/30'
                                : 'bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-700/30'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                                <Shield className="w-3 h-3" />
                                <span>Make Admin</span>
                              </>
                            )}
                          </button>

                          {/* View All Matches */}
                          {userMatches[user.id] && userMatches[user.id].history.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedUserId(user.id);
                              }}
                              className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 border border-purple-700/30 rounded-md transition-all text-xs font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Details</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Edit Riot ID Modal */}
              {editingRiotId && (
                <div 
                  className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
                  onClick={() => {
                    setEditingRiotId(null);
                    setNewRiotId('');
                  }}
                >
                  <div 
                    className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mt-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-white font-bold text-lg mb-4">Edit Riot ID</h3>
                    <div className="mb-4">
                      <label className="text-gray-400 text-sm mb-2 block">New Riot ID</label>
                      <input
                        type="text"
                        value={newRiotId}
                        onChange={(e) => setNewRiotId(e.target.value)}
                        placeholder="Username#TAG"
                        autoFocus
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setEditingRiotId(null);
                          setNewRiotId('');
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRiotId}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced User Profile Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <UserIcon className="w-6 h-6 mr-2 text-primary-400" />
                  User Profile: {editingUser.username}
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - User Information */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-blue-400" />
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Riot ID
                          {editingUser.riotIdSet && (
                            <span className="ml-2 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                              LOCKED
                            </span>
                          )}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingUser.riotId}
                            onChange={(e) => setEditingUser({ ...editingUser, riotId: e.target.value })}
                            className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter Riot ID (e.g., Username#1234)"
                          />
                          <button
                            onClick={() => handleSaveUser(editingUser)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center space-x-1"
                          >
                            <Save className="w-4 h-4" />
                            <span>Update</span>
                          </button>
                        </div>
                        {editingUser.riotIdSet && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Riot ID was set on {editingUser.riotIdSetAt ? new Date(editingUser.riotIdSetAt).toLocaleDateString() : 'unknown date'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nationality
                        </label>
                        <input
                          type="text"
                          value={editingUser.nationality || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, nationality: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discord Information */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-purple-400" />
                      Discord Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Discord Username
                        </label>
                        <input
                          type="text"
                          value={editingUser.discordUsername}
                          onChange={(e) => setEditingUser({ ...editingUser, discordUsername: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="discordLinked"
                            checked={editingUser.discordLinked || false}
                            onChange={(e) => setEditingUser({ ...editingUser, discordLinked: e.target.checked })}
                            className="w-4 h-4 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
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
                            className="w-4 h-4 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
                          />
                          <label htmlFor="inDiscordServer" className="text-sm font-medium text-gray-300">
                            In Discord Server
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-red-400" />
                      Admin Controls
                    </h4>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isAdmin"
                        checked={editingUser.isAdmin || false}
                        onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                        className="w-4 h-4 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="isAdmin" className="text-sm font-medium text-gray-300">
                        Admin Status
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column - IP Analysis & Security */}
                <div className="space-y-6">
                  {/* IP Analysis */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-white flex items-center">
                        <Globe className="w-5 h-5 mr-2 text-green-400" />
                        IP Analysis & Security
                      </h4>
                      <button
                        onClick={() => loadUserIPAnalysis(editingUser.id)}
                        disabled={loadingUserIP}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingUserIP ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {loadingUserIP ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Loading IP analysis...</p>
                      </div>
                    ) : userIPAnalysis.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No IP data available for this user</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userIPAnalysis.map((analysis, index) => (
                          <div key={index} className={`border rounded-lg p-3 ${
                            analysis.riskLevel === 'high' ? 'border-red-500 bg-red-900/20' :
                            analysis.riskLevel === 'medium' ? 'border-yellow-500 bg-yellow-900/20' :
                            'border-green-500 bg-green-900/20'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-bold text-white text-sm">
                                  IP Conflict #{index + 1}
                                </h5>
                                <p className="text-xs text-gray-300">
                                  Risk Level: <span className={`font-bold ${
                                    analysis.riskLevel === 'high' ? 'text-red-400' :
                                    analysis.riskLevel === 'medium' ? 'text-yellow-400' :
                                    'text-green-400'
                                  }`}>{analysis.riskLevel.toUpperCase()}</span>
                                </p>
                              </div>
                              {analysis.suspiciousActivity.length > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-red-400 font-bold">SUSPICIOUS</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              {analysis.users.map((user: any, userIndex: number) => (
                                <div key={userIndex} className="flex justify-between items-center bg-black/30 rounded p-2">
                                  <div>
                                    <span className="text-white font-medium text-sm">{user.username}</span>
                                    <span className="text-gray-400 text-xs ml-2">({user.sessionCount} sessions)</span>
                                  </div>
                                  <span className="text-gray-400 text-xs">
                                    Last: {user.lastSeen.toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Statistics */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                      User Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-900/20 border border-blue-700/30 rounded">
                        <div className="text-xl font-bold text-blue-400">
                          {editingUser.teamIds?.length || 0}
                        </div>
                        <div className="text-xs text-gray-300">Teams</div>
                      </div>
                      <div className="text-center p-3 bg-green-900/20 border border-green-700/30 rounded">
                        <div className="text-xl font-bold text-green-400">
                          {userMatches[editingUser.id]?.active.length || 0}
                        </div>
                        <div className="text-xs text-gray-300">Active Matches</div>
                      </div>
                      <div className="text-center p-3 bg-purple-900/20 border border-purple-700/30 rounded">
                        <div className="text-xl font-bold text-purple-400">
                          {userMatches[editingUser.id]?.history.length || 0}
                        </div>
                        <div className="text-xs text-gray-300">Match History</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
                        <div className="text-xl font-bold text-yellow-400">
                          {userIPAnalysis.length}
                        </div>
                        <div className="text-xs text-gray-300">IP Addresses</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700 mt-6">
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

        {/* Streaming Management Tab */}
        {activeTab === 'streaming' && (
          <div className="card">
            <StreamingManagement 
              matches={matches} 
              teams={teams} 
              currentUser={currentUser}
            />
          </div>
        )}

        {/* Streamer Management Tab */}
        {activeTab === 'streamer-management' && (
          <div className="card">
            <StreamerManagement />
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="card">
            <AdminStats />
          </div>
        )}

        {/* Map 3 Issues Tab */}
        {activeTab === 'map3-issues' && (
          <div className="card">
            <Map3IssuesTab />
          </div>
        )}

        {/* Streamer Statistics Tab */}
        {activeTab === 'streamer-stats' && (
          <div className="card">
            <StreamerStatisticsTab />
          </div>
        )}

        {/* Swiss Analysis Tab */}
        {activeTab === 'swiss-analysis' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <span>Swiss Pairing Analysis</span>
              </h2>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Analyze Swiss tournament pairings to understand why teams were matched against each other.
                Shows current round matches and generates next round pairings based on Swiss logic.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-4">
                {tournaments
                  .filter(t => t.format?.type === 'swiss-system' && t.status === 'in-progress')
                  .map(tournament => (
                    <button
                      key={tournament.id}
                      onClick={() => analyzeSwissPairings(tournament.id)}
                      disabled={analyzingSwiss}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {analyzingSwiss ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <BarChart3 className="w-4 h-4" />
                      )}
                      <span>
                        {analyzingSwiss ? 'Analyzing...' : `Analyze ${tournament.name}`}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Round Filter */}
              {swissAnalysis && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by Round:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedRound('all')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedRound === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      All Rounds
                    </button>
                    {swissAnalysis.pairingAnalysis && 
                      Array.from(new Set(swissAnalysis.pairingAnalysis.map((p: any) => p.round)))
                        .sort((a: any, b: any) => a - b)
                        .map((round: any) => (
                          <button
                            key={round}
                            onClick={() => setSelectedRound(round)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              selectedRound === round
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Round {round}
                            {round > swissAnalysis.currentRound && ' (Generated)'}
                          </button>
                        ))}
                  </div>
                </div>
              )}
            </div>

            {swissAnalysis && (
              <div className="space-y-6">
                {/* Tournament Info */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Tournament Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <div className="text-white font-medium">{swissAnalysis.tournamentName}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Current Round:</span>
                      <div className="text-white font-medium">{swissAnalysis.currentRound}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Total Teams:</span>
                      <div className="text-white font-medium">{swissAnalysis.totalTeams}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Active Teams:</span>
                      <div className="text-white font-medium">{swissAnalysis.activeTeams}</div>
                    </div>
                  </div>
                </div>

                {/* Current Standings */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Current Standings</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 text-gray-400">Rank</th>
                          <th className="text-left py-2 text-gray-400">Team</th>
                          <th className="text-center py-2 text-gray-400">Wins</th>
                          <th className="text-center py-2 text-gray-400">Losses</th>
                          <th className="text-center py-2 text-gray-400">Score</th>
                          <th className="text-center py-2 text-gray-400">Opponents</th>
                        </tr>
                      </thead>
                      <tbody>
                        {swissAnalysis.standings?.map((team: any, index: number) => (
                          <tr key={team.id} className="border-b border-gray-700/50">
                            <td className="py-2 text-white font-medium">#{index + 1}</td>
                            <td className="py-2 text-white">{team.name}</td>
                            <td className="py-2 text-center text-green-400">{team.wins}</td>
                            <td className="py-2 text-center text-red-400">{team.losses}</td>
                            <td className="py-2 text-center text-blue-400">{team.score}</td>
                            <td className="py-2 text-center text-gray-300">
                              {team.opponents?.length || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pairing Analysis */}
                {swissAnalysis.pairingAnalysis && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Pairing Analysis</h3>
                    <div className="space-y-4">
                      {swissAnalysis.pairingAnalysis
                        .filter((pairing: any) => 
                          selectedRound === 'all' || pairing.round === selectedRound
                        )
                        .map((pairing: any, index: number) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                              <div className="text-white font-medium">
                                {pairing.team1.name} vs {pairing.team2.name}
                              </div>
                              <div className="text-sm text-gray-400">
                                Round {pairing.round}
                                {pairing.isGenerated && (
                                  <span className="ml-2 px-2 py-1 bg-yellow-900 text-yellow-300 rounded text-xs">
                                    Generated
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              pairing.reason === 'valid' ? 'bg-green-900 text-green-300' :
                              pairing.reason === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-red-900 text-red-300'
                            }`}>
                              {pairing.reason}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-400 mb-2">Team 1 Details:</div>
                              <div className="space-y-1">
                                <div>Rank: #{pairing.team1.rank}</div>
                                <div>Score: {pairing.team1.score}</div>
                                <div>Wins: {pairing.team1.wins}</div>
                                <div>Losses: {pairing.team1.losses}</div>
                                <div>Previous Opponents: {pairing.team1OpponentNames?.join(', ') || 'None'}</div>
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-400 mb-2">Team 2 Details:</div>
                              <div className="space-y-1">
                                <div>Rank: #{pairing.team2.rank}</div>
                                <div>Score: {pairing.team2.score}</div>
                                <div>Wins: {pairing.team2.wins}</div>
                                <div>Losses: {pairing.team2.losses}</div>
                                <div>Previous Opponents: {pairing.team2OpponentNames?.join(', ') || 'None'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 p-3 bg-gray-600 rounded text-sm">
                            <div className="text-gray-300">
                              <strong>Analysis:</strong> {pairing.analysis}
                            </div>
                            {pairing.warnings && pairing.warnings.length > 0 && (
                              <div className="mt-2">
                                <div className="text-yellow-300 font-medium">Warnings:</div>
                                <ul className="list-disc list-inside text-yellow-200">
                                  {pairing.warnings.map((warning: string, i: number) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pairing Rules */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Swiss Pairing Rules</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>• Teams are paired by score (wins - losses)</div>
                    <div>• Teams with the same score are paired against each other</div>
                    <div>• Teams cannot play against the same opponent twice</div>
                    <div>• When possible, teams are paired with opponents they haven't faced</div>
                    <div>• If no valid opponent exists, teams may receive a bye</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Migration Tab */}
        {activeTab === 'migration' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Database className="w-6 h-6 mr-3 text-primary-400" />
                User Migration
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-blue-400" />
                  Privacy Migration
                </h3>
                
                <div className="text-gray-300 mb-4">
                  <p className="mb-2">
                    This migration creates <code className="bg-gray-700 px-2 py-1 rounded">public_users</code> documents 
                    for all existing users to hide their emails from public access.
                  </p>
                  <p className="mb-4">
                    <strong className="text-yellow-400">Important:</strong> This ensures existing users continue to work 
                    with the new privacy system.
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={runMigration}
                    disabled={isMigrating}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isMigrating
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isMigrating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Migrating...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5" />
                        <span>Run Migration</span>
                      </>
                    )}
                  </button>
                </div>

                {migrationResult && (
                  <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <h4 className="text-green-400 font-semibold mb-2 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Migration Complete
                    </h4>
                    <div className="text-gray-300 space-y-1">
                      <p>✅ Created: <span className="text-green-400 font-mono">{migrationResult.created}</span> public user documents</p>
                      <p>⚠️ Skipped: <span className="text-yellow-400 font-mono">{migrationResult.skipped}</span> (already existed)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Unity League Footer */}
      
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