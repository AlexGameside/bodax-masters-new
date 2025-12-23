import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAllUsers, getMatches, getTeamById, getTeams, autoDetectAndSubmitMatchResult } from '../services/firebaseService';
import { getAccountByRiotId, parseRiotId, getPuuidByRiotId, getMatchHistory, getMatchDetails, autoDetectMatchResult } from '../services/riotApiService';
import type { User, Match, Team } from '../types/tournament';
import { Shield, Search, User as UserIcon, Mail, Gamepad2, MessageCircle, Calendar, Users, Loader2, AlertCircle, CheckCircle, XCircle, ExternalLink, Database, Globe, TestTube, Trophy, Zap, RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const RiotApiTesting = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRiotData, setLoadingRiotData] = useState(false);
  const [riotAccountData, setRiotAccountData] = useState<any>(null);
  const [riotMatchHistory, setRiotMatchHistory] = useState<any[]>([]);
  const [riotError, setRiotError] = useState<string | null>(null);
  const [manualRiotId, setManualRiotId] = useState('');
  const [testingManual, setTestingManual] = useState(false);
  
  // Match testing state
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedTestMatch, setSelectedTestMatch] = useState<Match | null>(null);
  const [testingMatch, setTestingMatch] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [matchTeams, setMatchTeams] = useState<{ team1: Team | null; team2: Team | null }>({ team1: null, team2: null });
  const [activeTab, setActiveTab] = useState<'user-lookup' | 'match-testing'>('user-lookup');
  const [allTeamsMap, setAllTeamsMap] = useState<{ [teamId: string]: Team }>({});

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      
      if (!currentUser) {
        toast.error('Please log in to access this page.');
        navigate('/');
        return;
      }
      
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const adminStatus = userData.isAdmin || false;
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            toast.error('Access denied. Admin only.');
            navigate('/');
          }
        } else {
          setIsAdmin(false);
          toast.error('Access denied. Admin only.');
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        navigate('/');
      }
    };
    
    checkAdmin();
  }, [currentUser, authLoading, navigate]);

  // Load all users
  useEffect(() => {
    if (isAdmin === true) {
      loadUsers();
    }
  }, [isAdmin]);

  // Load completed matches for testing
  useEffect(() => {
    if (isAdmin === true && activeTab === 'match-testing') {
      loadCompletedMatches();
    }
  }, [isAdmin, activeTab]);

  const loadCompletedMatches = async () => {
    setLoadingMatches(true);
    try {
      const [allMatches, allTeams] = await Promise.all([
        getMatches(),
        getTeams()
      ]);
      
      console.log('Total matches loaded:', allMatches.length);
      
      // Create teams map for quick lookup
      const teamsMap: { [teamId: string]: Team } = {};
      allTeams.forEach(team => {
        teamsMap[team.id] = team;
      });
      setAllTeamsMap(teamsMap);
      
      // Filter for completed matches with scores - be more lenient
      const completed = allMatches.filter(m => {
        // Check if match has scores (either from resultSubmission or directly)
        const hasScores = 
          (m.team1Score !== undefined && m.team2Score !== undefined) ||
          (m.resultSubmission?.team1SubmittedScore?.team1Score !== undefined) ||
          (m.resultSubmission?.team2SubmittedScore?.team1Score !== undefined);
        
        // Check if match is complete (either isComplete flag or matchState is 'completed')
        const isComplete = m.isComplete === true || m.matchState === 'completed';
        
        // Must have both teams
        const hasTeams = m.team1Id && m.team2Id;
        
        return hasScores && isComplete && hasTeams;
      }).sort((a, b) => {
        // Sort by most recent first
        const aTime = a.resolvedAt || a.scheduledTime;
        const bTime = b.resolvedAt || b.scheduledTime;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        const aDate = aTime instanceof Date ? aTime : (aTime.toDate ? aTime.toDate() : new Date(aTime));
        const bDate = bTime instanceof Date ? bTime : (bTime.toDate ? bTime.toDate() : new Date(bTime));
        return bDate.getTime() - aDate.getTime();
      });
      
      console.log('Completed matches found:', completed.length);
      setCompletedMatches(completed);
      
      if (completed.length === 0) {
        console.log('No completed matches. All matches:', allMatches.map(m => ({
          id: m.id,
          isComplete: m.isComplete,
          matchState: m.matchState,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          hasResultSubmission: !!m.resultSubmission
        })));
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allUsers.filter(user => 
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.riotId && user.riotId.toLowerCase().includes(term)) ||
      (user.discordUsername && user.discordUsername.toLowerCase().includes(term))
    );
    
    setFilteredUsers(filtered);
  }, [searchTerm, allUsers]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await getAllUsers();
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setRiotAccountData(null);
    setRiotMatchHistory([]);
    setRiotError(null);
    
    if (user.riotId && user.riotId.trim() !== '') {
      await fetchRiotData(user.riotId);
    }
  };

  const fetchRiotData = async (riotId: string) => {
    setLoadingRiotData(true);
    setRiotError(null);
    
    try {
      const parsed = parseRiotId(riotId);
      if (!parsed) {
        setRiotError(`Invalid Riot ID format: "${riotId}". Expected format: GameName#TagLine (e.g., BDX Alex#meow)`);
        setLoadingRiotData(false);
        return;
      }

      console.log('Parsed Riot ID:', { 
        original: riotId, 
        gameName: parsed.gameName, 
        tagLine: parsed.tagLine,
        encodedGameName: encodeURIComponent(parsed.gameName),
        encodedTagLine: encodeURIComponent(parsed.tagLine)
      });

      // Get account info
      try {
        const accountData = await getAccountByRiotId(parsed.gameName, parsed.tagLine);
        console.log('Account data received:', accountData);
        setRiotAccountData(accountData);

        // PUUID is available immediately from account data
        const puuid = accountData.puuid;
        console.log('PUUID found:', puuid);
        
        if (puuid) {
          try {
            const matchHistory = await getMatchHistory(puuid, 0, 10);
            console.log('Match history received:', matchHistory);
            
            // Match history is an array of match objects with matchId, gameStartTimeMillis, queueId
            setRiotMatchHistory(matchHistory);
          } catch (matchError: any) {
            console.error('Error fetching match history:', matchError);
            // Don't fail completely if match history fails - account data is still valuable
            // Match history might require production API key or have different permissions
            const errorMsg = matchError.message || 'Unknown error';
            if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
              // Format the error message to be more readable in the UI
              const formattedError = errorMsg
                .split('\n')
                .filter((line: string) => line.trim())
                .map((line: string, idx: number) => {
                  if (idx === 0) return line;
                  if (line.trim().startsWith('Possible causes:')) return `\n${line}`;
                  if (line.match(/^\d+\./)) return `  ${line}`;
                  if (line.trim().startsWith('Check your')) return `\n${line}`;
                  if (line.trim().startsWith('-')) return `  ${line}`;
                  return line;
                })
                .join('\n');
              setRiotError(`✅ Account found successfully!\n\n❌ Match history failed:\n${formattedError}\n\nThe account data above is still valid and displayed.`);
            } else if (errorMsg.includes('rate limit')) {
              setRiotError(`✅ Account found! ⚠️ Match history rate limited: ${errorMsg}. Try again in a moment.`);
            } else {
              setRiotError(`✅ Account found! ⚠️ Match history error: ${errorMsg}. Account data is still displayed above.`);
            }
          }
        }
      } catch (accountError: any) {
        console.error('Error fetching account:', accountError);
        // Check if it's a 403 (API key issue) or 404 (account not found)
        if (accountError.message?.includes('403') || accountError.message?.includes('invalid') || accountError.message?.includes('expired')) {
          setRiotError(`API Key Error: ${accountError.message}. Riot API keys expire after 24 hours. Please update the key in riotApiService.ts`);
        } else if (accountError.message?.includes('404') || accountError.message?.includes('not found')) {
          setRiotError(`Account not found: "${parsed.gameName}#${parsed.tagLine}". Please verify the Riot ID is correct.`);
        } else {
          setRiotError(`Error: ${accountError.message || 'Unknown error'}`);
        }
        throw accountError;
      }
    } catch (error: any) {
      console.error('Error fetching Riot data:', error);
      if (!riotError) {
        setRiotError(error.message || 'Failed to fetch Riot API data');
      }
      toast.error(`Riot API Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingRiotData(false);
    }
  };

  const handleMatchClick = (matchId: string, e?: React.MouseEvent) => {
    // Open in new tab/page
    if (e?.ctrlKey || e?.metaKey) {
      // Ctrl/Cmd click - open in new tab
      window.open(`/admin/riot-api-testing/match/${matchId}`, '_blank');
    } else {
      // Regular click - navigate to new page
      navigate(`/admin/riot-api-testing/match/${matchId}`);
    }
  };

  const handleSelectMatch = async (match: Match) => {
    setSelectedTestMatch(match);
    setTestResult(null);
    setMatchTeams({ team1: null, team2: null });
    try {
      const [team1, team2] = await Promise.all([
        match.team1Id ? getTeamById(match.team1Id) : Promise.resolve(null),
        match.team2Id ? getTeamById(match.team2Id) : Promise.resolve(null)
      ]);
      setMatchTeams({ team1, team2 });
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load team data');
    }
  };

  const handleTestMatch = async () => {
    if (!selectedTestMatch) return;
    
    setTestingMatch(true);
    setTestResult(null);
    
    try {
      // Get Riot IDs from both teams
      const getTeamRiotIds = async (team: Team | null): Promise<string[]> => {
        if (!team || !team.members) return [];
        const riotIds: string[] = [];
        for (const member of team.members) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            const userDoc = await getDoc(doc(db, 'users', member.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.riotId) {
                riotIds.push(userData.riotId);
              }
            }
          } catch (error) {
            console.error('Error getting user Riot ID:', error);
          }
        }
        return riotIds;
      };
      
      const team1RiotIds = await getTeamRiotIds(matchTeams.team1);
      const team2RiotIds = await getTeamRiotIds(matchTeams.team2);
      
      // Only need at least 3 players with Riot IDs (more lenient)
      if (team1RiotIds.length < 3 || team2RiotIds.length < 3) {
        toast.error(`Not enough players with Riot IDs. Need at least 3 per team. Team 1: ${team1RiotIds.length}, Team 2: ${team2RiotIds.length}`);
        setTestResult({
          success: false,
          error: `Not enough players with Riot IDs. Need at least 3 per team. Team 1: ${team1RiotIds.length}, Team 2: ${team2RiotIds.length}`,
          team1RiotIds: team1RiotIds.length,
          team2RiotIds: team2RiotIds.length
        });
        return;
      }
      
      console.log(`Testing with ${team1RiotIds.length} Team 1 players and ${team2RiotIds.length} Team 2 players`);
      
      // Get match scheduled time or resolved time (for old matches)
      let matchStartTime: number | undefined;
      if (selectedTestMatch.scheduledTime) {
        matchStartTime = selectedTestMatch.scheduledTime instanceof Date 
          ? selectedTestMatch.scheduledTime.getTime() 
          : selectedTestMatch.scheduledTime.toMillis?.() || selectedTestMatch.scheduledTime;
      } else if (selectedTestMatch.resolvedAt) {
        // Use resolved time if scheduled time not available
        const resolvedTime = selectedTestMatch.resolvedAt instanceof Date 
          ? selectedTestMatch.resolvedAt.getTime() 
          : selectedTestMatch.resolvedAt.toMillis?.() || selectedTestMatch.resolvedAt;
        matchStartTime = resolvedTime;
      }
      
      console.log('Match time for search:', matchStartTime ? new Date(matchStartTime).toISOString() : 'Not provided');
      
      // Test auto-detection with very large time window for old matches
      // Use 14 days before and 1 day after match time to account for scheduling delays or early matches
      // This ensures we catch matches that were played before the scheduled time
      const detectionResult = await autoDetectMatchResult(
        team1RiotIds,
        team2RiotIds,
        matchStartTime,
        matchStartTime ? 20160 : 10080 // 14 days (20160 minutes) before/after if match time provided, 7 days if not
      );
      
      if (detectionResult && detectionResult.detected) {
        // Get full match details for analytics
        const matchDetails = detectionResult.matchDetails;
        
        setTestResult({
          success: true,
          detected: true,
          detectedScore: {
            team1: detectionResult.team1Score,
            team2: detectionResult.team2Score
          },
          actualScore: {
            team1: selectedTestMatch.team1Score,
            team2: selectedTestMatch.team2Score
          },
          scoresMatch: detectionResult.team1Score === selectedTestMatch.team1Score && 
                      detectionResult.team2Score === selectedTestMatch.team2Score,
          confidence: detectionResult.confidence,
          matchId: detectionResult.matchId,
          matchDetails: matchDetails,
          team1RiotIds: team1RiotIds.length,
          team2RiotIds: team2RiotIds.length
        });
        
        toast.success(`Match detected! Score: ${detectionResult.team1Score} - ${detectionResult.team2Score}`);
      } else {
        setTestResult({
          success: false,
          detected: false,
          error: 'No matching match found in Riot API',
          actualScore: {
            team1: selectedTestMatch.team1Score,
            team2: selectedTestMatch.team2Score
          },
          team1RiotIds: team1RiotIds.length,
          team2RiotIds: team2RiotIds.length
        });
        toast.error('No matching match found');
      }
    } catch (error: any) {
      console.error('Error testing match:', error);
      setTestResult({
        success: false,
        error: error.message || 'Failed to test match'
      });
      toast.error(error.message || 'Failed to test match');
    } finally {
      setTestingMatch(false);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-4xl font-bold text-white font-bodax uppercase tracking-wider">Riot API Testing</h1>
          </div>
          <p className="text-gray-400 font-mono mb-6 text-sm uppercase tracking-widest">Admin-only page for testing Riot API features and user lookup</p>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('user-lookup')}
              className={`px-6 py-3 font-mono uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'user-lookup'
                  ? 'text-white border-red-500'
                  : 'text-gray-400 hover:text-white border-transparent'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              User Lookup
            </button>
            <button
              onClick={() => setActiveTab('match-testing')}
              className={`px-6 py-3 font-mono uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'match-testing'
                  ? 'text-white border-red-500'
                  : 'text-gray-400 hover:text-white border-transparent'
              }`}
            >
              <TestTube className="w-4 h-4 inline mr-2" />
              Match Testing
            </button>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3 text-yellow-400 font-mono text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-2 text-yellow-300 uppercase tracking-wider">⚠️ Riot API Key Notice</p>
                <p className="text-gray-300 mb-1">Riot API keys expire after 24 hours. If you see 403 errors, the key in <code className="bg-black px-2 py-0.5 rounded text-yellow-400">src/services/riotApiService.ts</code> needs to be updated.</p>
                <p className="text-gray-300">To get a new key: <a href="https://developer.riotgames.com/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 underline">Riot Developer Portal</a></p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'user-lookup' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: User Search */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6 font-bodax uppercase tracking-wider flex items-center gap-3">
              <Search className="w-6 h-6 text-red-500" />
              User Lookup
            </h2>

            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username, email, Riot ID, or Discord..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-mono"
                />
              </div>
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-mono uppercase tracking-wider text-sm">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedUser?.id === user.id
                        ? 'bg-red-500/10 border-red-500 shadow-lg'
                        : 'bg-black border-gray-800 hover:bg-[#0a0a0a] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-white font-mono">{user.username}</span>
                          {user.isAdmin && (
                            <Shield className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="text-sm text-gray-400 font-mono space-y-1">
                          {user.riotId && (
                            <div className="flex items-center gap-1">
                              <Gamepad2 className="w-3 h-3" />
                              <span>{user.riotId}</span>
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedUser?.id === user.id && (
                        <CheckCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: User Details */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6 font-bodax uppercase tracking-wider flex items-center gap-3">
              <Database className="w-6 h-6 text-red-500" />
              User Details
            </h2>

            {!selectedUser ? (
              <div className="text-center py-12 text-gray-400 font-mono uppercase tracking-wider text-sm">
                Select a user to view details
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-4 font-bodax uppercase tracking-wider">User Information</h3>
                  <div className="space-y-3 text-sm font-mono">
                    <div className="flex items-center gap-2 text-gray-300">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Username:</span>
                      <span className="text-white">{selectedUser.username}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Email:</span>
                      <span className="text-white">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Gamepad2 className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Riot ID:</span>
                      <span className="text-white">{selectedUser.riotId || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Discord:</span>
                      <span className="text-white">{selectedUser.discordUsername || 'Not set'}</span>
                      {selectedUser.discordLinked && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Created:</span>
                      <span className="text-white">{selectedUser.createdAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Teams:</span>
                      <span className="text-white">{selectedUser.teamIds?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Admin:</span>
                      {selectedUser.isAdmin ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual Riot ID Test */}
                <div className="bg-black border border-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-4 font-bodax uppercase tracking-wider flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-red-500" />
                    Test Riot ID Manually
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Riot ID (e.g., BDX Alex#meow)"
                      value={manualRiotId}
                      onChange={(e) => setManualRiotId(e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#050505] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 font-mono"
                    />
                    <button
                      onClick={async () => {
                        if (!manualRiotId.trim()) return;
                        setTestingManual(true);
                        setRiotAccountData(null);
                        setRiotMatchHistory([]);
                        setRiotError(null);
                        await fetchRiotData(manualRiotId.trim());
                        setTestingManual(false);
                      }}
                      disabled={testingManual || !manualRiotId.trim()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-mono uppercase tracking-wider transition-colors"
                    >
                      {testingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-mono uppercase tracking-wider">
                    Format: GameName#TagLine (e.g., BDX Alex#meow)
                  </p>
                </div>

                {/* Riot API Data */}
                {((selectedUser?.riotId && selectedUser.riotId.trim() !== '') || riotAccountData) && (
                  <div className="bg-black border border-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-white mb-4 font-bodax uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-5 h-5 text-red-500" />
                      Riot API Data
                      {selectedUser?.riotId && (
                        <span className="text-sm text-gray-400 font-normal normal-case">
                          ({selectedUser.riotId})
                        </span>
                      )}
                    </h3>

                    {loadingRiotData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                      </div>
                    ) : riotAccountData ? (
                      <div className="space-y-4">
                        {/* Show account data with PUUID first */}
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <h4 className="text-sm font-bold text-green-400 font-mono uppercase tracking-wider">Account Found Successfully!</h4>
                          </div>
                          <div className="text-sm font-mono space-y-3">
                            <div className="bg-[#050505] border border-gray-800 rounded p-3">
                              <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">PUUID (Player Unique ID):</div>
                              <div className="text-green-400 break-all font-semibold text-base">{riotAccountData.puuid}</div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(riotAccountData.puuid);
                                  toast.success('PUUID copied to clipboard!');
                                }}
                                className="mt-2 text-xs text-green-400 hover:text-green-300 underline"
                              >
                                📋 Copy PUUID
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-gray-300 pt-2 border-t border-gray-800">
                              <div>
                                <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Game Name:</span>{' '}
                                <span className="text-white">{riotAccountData.gameName}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-400 uppercase tracking-wider text-xs">Tag Line:</span>{' '}
                                <span className="text-white">{riotAccountData.tagLine}</span>
                              </div>
                            </div>
                            <div className="text-gray-400 text-xs pt-2">
                              Full Riot ID: <span className="text-white">{riotAccountData.gameName}#{riotAccountData.tagLine}</span>
                            </div>
                          </div>
                        </div>

                        {/* Match History Display (if available) */}
                        {riotMatchHistory.length > 0 && (
                          <div className="relative z-10">
                            <h4 className="text-sm font-bold text-white mb-3 font-mono uppercase tracking-wider">Recent Matches ({riotMatchHistory.length})</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {riotMatchHistory.map((match, idx) => {
                                const matchId = match.matchId || match;
                                const queueName = match.queueId || 'unknown';
                                const gameTime = match.gameStartTimeMillis ? new Date(match.gameStartTimeMillis).toLocaleString() : 'N/A';
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={(e) => handleMatchClick(matchId, e)}
                                    className="w-full text-left bg-[#050505] hover:bg-black rounded-lg p-3 border border-gray-800 hover:border-red-500/50 transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="text-white font-semibold text-sm mb-1 group-hover:text-red-400 transition-colors">
                                          {queueName.charAt(0).toUpperCase() + queueName.slice(1)}
                                        </div>
                                        <div className="text-gray-400 text-xs font-mono">
                                          {gameTime}
                                        </div>
                                        <div className="text-gray-500 text-xs font-mono mt-1 break-all">
                                          {matchId}
                                        </div>
                                      </div>
                                      <div className="ml-2">
                                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Show error message if match history failed */}
                        {riotError && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-2 text-red-400 font-mono text-sm">
                              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                              <div className="whitespace-pre-line text-gray-300">{riotError}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400 font-mono uppercase tracking-wider text-sm">
                        Click to fetch Riot API data
                      </div>
                    )}
                  </div>
                )}

                {(!selectedUser || (!selectedUser.riotId || selectedUser.riotId.trim() === '')) && !riotAccountData && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-400 font-mono text-sm">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-gray-300">User has no Riot ID set. Use manual test above to test any Riot ID.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Match Testing Tab */
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-bodax uppercase tracking-wider flex items-center gap-3">
              <TestTube className="w-6 h-6 text-red-500" />
              Test Auto-Detection on Completed Matches
            </h2>
            <p className="text-gray-400 font-mono text-sm mb-6 uppercase tracking-wider">
              Select a completed match to test if auto-detection can find it in the Riot API and compare scores.
            </p>

            {/* Match List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingMatches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                </div>
              ) : completedMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-mono uppercase tracking-wider text-sm">
                  No completed matches found
                </div>
              ) : (
                completedMatches.map((match) => {
                  const team1 = allTeamsMap[match.team1Id || ''];
                  const team2 = allTeamsMap[match.team2Id || ''];
                  const team1Name = team1?.name || match.team1Id || 'Team 1';
                  const team2Name = team2?.name || match.team2Id || 'Team 2';
                  const winner = (match.team1Score || 0) > (match.team2Score || 0) ? team1Name : team2Name;
                  
                  return (
                    <button
                      key={match.id}
                      onClick={() => handleSelectMatch(match)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedTestMatch?.id === match.id
                          ? 'bg-red-500/10 border-red-500 shadow-lg ring-2 ring-red-500/30'
                          : 'bg-black border-gray-800 hover:bg-[#0a0a0a] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-white font-bold font-mono text-lg">
                              {team1Name}
                            </div>
                            <div className="text-gray-500 font-mono">vs</div>
                            <div className="text-white font-bold font-mono text-lg">
                              {team2Name}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-white font-bodax">
                              {match.team1Score || 0} - {match.team2Score || 0}
                            </div>
                            <div className="text-yellow-400 text-sm font-mono flex items-center gap-1">
                              <Trophy className="w-4 h-4" />
                              {winner}
                            </div>
                          </div>
                          {match.resolvedAt && (
                            <div className="text-gray-400 text-xs font-mono mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {match.resolvedAt instanceof Date 
                                ? match.resolvedAt.toLocaleString()
                                : match.resolvedAt.toDate?.().toLocaleString() || 'N/A'}
                            </div>
                          )}
                          {match.tournamentId && (
                            <div className="text-red-400 text-xs font-mono mt-1 uppercase tracking-wider">
                              Tournament Match
                            </div>
                          )}
                        </div>
                        <Trophy className="w-6 h-6 text-yellow-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Test Results */}
          {selectedTestMatch && (
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white font-bodax uppercase tracking-wider">Test Results</h3>
                <button
                  onClick={handleTestMatch}
                  disabled={testingMatch || !matchTeams.team1 || !matchTeams.team2}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-mono uppercase tracking-wider transition-colors"
                >
                  {testingMatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Test Auto-Detection
                    </>
                  )}
                </button>
              </div>

              {/* Match Info */}
              {selectedTestMatch && matchTeams.team1 && matchTeams.team2 && (
                <div className="mb-6 p-4 bg-black border border-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-bold font-mono text-xl mb-1">
                        {matchTeams.team1.name} vs {matchTeams.team2.name}
                      </div>
                      <div className="text-gray-400 text-sm font-mono">
                        Match ID: <code className="bg-[#050505] px-2 py-0.5 rounded text-gray-300">{selectedTestMatch.id.substring(0, 20)}...</code>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white font-bodax">
                        {selectedTestMatch.team1Score || 0} - {selectedTestMatch.team2Score || 0}
                      </div>
                      <div className="text-gray-400 text-xs font-mono mt-1">
                        {selectedTestMatch.resolvedAt instanceof Date 
                          ? selectedTestMatch.resolvedAt.toLocaleString()
                          : selectedTestMatch.resolvedAt?.toDate?.().toLocaleString() || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {testResult && (
                <div className="space-y-6">
                  {/* Score Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black border border-gray-800 rounded-lg p-4">
                      <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2">Actual Score</div>
                      <div className="text-3xl font-bold text-white font-bodax mb-2">
                        {testResult.actualScore?.team1 || selectedTestMatch?.team1Score} - {testResult.actualScore?.team2 || selectedTestMatch?.team2Score}
                      </div>
                      <div className="text-gray-400 text-xs font-mono">
                        {matchTeams.team1?.name || 'Team 1'} vs {matchTeams.team2?.name || 'Team 2'}
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 border ${
                      testResult.scoresMatch 
                        ? 'bg-green-500/10 border-green-500/30 ring-2 ring-green-500/20' 
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2">Detected Score</div>
                      <div className="text-3xl font-bold text-white font-bodax mb-2">
                        {testResult.detectedScore?.team1 || 'N/A'} - {testResult.detectedScore?.team2 || 'N/A'}
                      </div>
                      {testResult.scoresMatch ? (
                        <div className="flex items-center gap-2 text-green-400 text-xs font-mono uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4" />
                          Scores Match Perfectly!
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase tracking-wider">
                          <XCircle className="w-4 h-4" />
                          Scores Don't Match
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detection Status */}
                  {testResult.detected && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-green-400 font-mono font-bold text-lg uppercase tracking-wider">Match Successfully Detected!</div>
                          <div className="text-gray-400 text-xs font-mono mt-1 uppercase tracking-wider">
                            Confidence: <span className="text-white font-semibold">{testResult.confidence || 'medium'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-black border border-gray-800 rounded p-3">
                          <div className="text-gray-400 text-xs font-mono mb-1 uppercase tracking-wider">Riot Match ID</div>
                          <code className="text-green-400 text-sm break-all">{testResult.matchId}</code>
                        </div>
                        <div className="bg-black border border-gray-800 rounded p-3">
                          <div className="text-gray-400 text-xs font-mono mb-1 uppercase tracking-wider">Players Found</div>
                          <div className="text-white font-semibold">
                            Team 1: {testResult.team1RiotIds || 0} | Team 2: {testResult.team2RiotIds || 0}
                          </div>
                        </div>
                      </div>

                      {testResult.matchDetails && (
                        <div className="space-y-3">
                          {/* Match Details Preview */}
                          <div className="bg-black border border-gray-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <BarChart3 className="w-5 h-5 text-red-500" />
                              <span className="text-white font-mono font-semibold uppercase tracking-wider">Match Analytics Available</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm font-mono">
                              {testResult.matchDetails.matchInfo && (
                                <>
                                  <div>
                                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Map</div>
                                    <div className="text-white">{testResult.matchDetails.matchInfo.mapId || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Mode</div>
                                    <div className="text-white">{testResult.matchDetails.matchInfo.gameMode || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Duration</div>
                                    <div className="text-white">
                                      {testResult.matchDetails.matchInfo.gameLengthMillis 
                                        ? `${Math.round(testResult.matchDetails.matchInfo.gameLengthMillis / 1000 / 60)}m`
                                        : 'N/A'}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* View Full Analytics Button */}
                          <button
                            onClick={() => handleMatchClick(testResult.matchId)}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold font-mono uppercase tracking-wider transition-all"
                          >
                            <BarChart3 className="w-5 h-5" />
                            View Full Match Analytics & Player Stats
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!testResult.detected && testResult.error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-mono font-semibold uppercase tracking-wider">Detection Failed</span>
                      </div>
                      <div className="text-gray-300 font-mono text-sm">{testResult.error}</div>
                      {testResult.team1RiotIds !== undefined && (
                        <div className="mt-2 text-gray-400 text-xs font-mono">
                          Team 1 Riot IDs: {testResult.team1RiotIds} | Team 2 Riot IDs: {testResult.team2RiotIds}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default RiotApiTesting;

