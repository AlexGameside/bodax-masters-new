import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Clock, 
  Zap, 
  Gamepad2, 
  UserPlus, 
  Star,
  Award,
  Target,
  Shield,
  Crown,
  Sparkles,
  TrendingUp,
  Eye,
  RefreshCw,
  Grid3X3,
  AlertTriangle,
  Settings,
  RotateCcw,
  FastForward,
  CheckSquare,
  XCircle,
  UserCheck,
  UserX,
  MessageCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getTournaments, 
  getTournamentMatches, 
  getTeams, 
  getTeamById, 
  getTeamsByIds,
  startTournament, 
  getUserMatches, 
 
  getUserTeams, 
  checkAndMarkTournamentCompleted, 
  forceMarkTournamentCompleted, 
  getMatches, 
  updateMatchState, 
  generateSingleEliminationBracket, 
  completeMatch,
  fillTournamentWithDemoTeams,
  approveTeamForTournament,
  rejectTeamFromTournament,
  updateTournamentStatus,
  startSingleElimination,
  startDoubleElimination,
  onUserTeamsChange,
  revertTeamRegistration,
  revertTeamApproval,
  revertTeamRejection,
  getTeamTournamentStatus,
  revertMatchResult,
  revertTeamAdvancement,
  revertRound,
  revertRoundComprehensive,
  getMatchProgressionInfo,
  debugBracketState,
  withdrawTeamFromTournament
} from '../services/firebaseService';
import { 
  getTournament,
  updateTournament,
  deleteTournament,
  publishTournament,
  closeRegistration,
  registerTeamForTournamentWithVerification,
  fixExistingTournamentDates
} from '../services/tournamentService';
import { 
  generateGroups, 
  generateMatchDay, 
  startKnockoutStage, 
  checkGroupStageCompletion, 
  updateGroupStandings,
  advanceWinnerToNextRound,
  completeCurrentRound
} from '../services/tournamentStageService';
import { SwissTournamentService } from '../services/swissTournamentService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament, Match, Team, User } from '../types/tournament';
import TournamentBracket from '../components/TournamentBracket';
import GroupStageBracket from '../components/GroupStageBracket';
import TournamentSchedule from '../components/TournamentSchedule';
import TournamentLeaderboard from '../components/TournamentLeaderboard';
import EnhancedTeamRegistration from '../components/EnhancedTeamRegistration';
import SwissStandings from '../components/SwissStandings';
import SwissRoundManagement from '../components/SwissRoundManagement';
import AdminMatchdayCalendar from '../components/AdminMatchdayCalendar';
import UpcomingMatches from '../components/UpcomingMatches';
import PlayoffBracket from '../components/PlayoffBracket';
import MatchSchedulingInterface from '../components/MatchSchedulingInterface';
import UserMatches from '../components/UserMatches';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeUserMatches } from '../hooks/useRealtimeData';
import ManualSeedingInterface from '../components/ManualSeedingInterface';

interface TournamentDetailProps {
  currentUser: User | null;
}

type TournamentView = 'overview' | 'bracket' | 'group-stage' | 'schedule' | 'standings' | 'swiss-standings' | 'matchday-management' | 'playoff-bracket';

const TournamentDetail: React.FC<TournamentDetailProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser: authUser } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUserTeams, setLoadingUserTeams] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  // Use real-time hook for user matches
  const { matches: userMatches, loading: userMatchesLoading, error: userMatchesError } = useRealtimeUserMatches(authUser?.id || '');
  
  const [userActiveMatches, setUserActiveMatches] = useState<Match[]>([]);
  const [activeView, setActiveView] = useState<TournamentView>('overview');
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [showEnhancedTeamRegistration, setShowEnhancedTeamRegistration] = useState(false);
  const [selectedTeamForRegistration, setSelectedTeamForRegistration] = useState<Team | null>(null);
  const [selectedSignupTeamId, setSelectedSignupTeamId] = useState<string | null>(null);
  const [justStartedTournament, setJustStartedTournament] = useState(false);
  const [showRevertConfirmation, setShowRevertConfirmation] = useState(false);
  const [revertAction, setRevertAction] = useState<{
    type: 'registration' | 'approval' | 'rejection';
    teamId: string;
    teamName: string;
  } | null>(null);
  const [showBracketRevertConfirmation, setShowBracketRevertConfirmation] = useState(false);
  const [bracketRevertAction, setBracketRevertAction] = useState<{
    type: 'match' | 'team-advancement' | 'round';
    matchId?: string;
    teamId?: string;
    round?: number;
    description: string;
  } | null>(null);
  const [showManualSeeding, setShowManualSeeding] = useState(false);

  // Helper function to format dates
  const formatDate = (date: Date | string | any | undefined) => {
    if (!date) {
      return 'TBD';
    }
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'TBD';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'TBD';
      }
      
      const formatted = dateObj.toLocaleDateString('de-DE', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      });
      return formatted;
    } catch (error) {
      return 'TBD';
    }
  };

  // Check Discord requirements
  const discordLinked = !!(authUser?.discordId && authUser?.discordLinked);
  const inDiscordServer = discordLinked ? authUser?.inDiscordServer ?? false : false;

  // Ref to ensure we only auto-navigate to match ONCE after tournament start
  const hasAutoNavigatedToMatch = useRef(false);

  // Auto-navigate to match page only if justStartedTournament is true
  useEffect(() => {
    if (justStartedTournament && userActiveMatches.length > 0 && !hasAutoNavigatedToMatch.current) {
      hasAutoNavigatedToMatch.current = true;
      setJustStartedTournament(false);
      navigate(`/match/${userActiveMatches[0].id}`);
    }
  }, [userActiveMatches, justStartedTournament, navigate]);

  // Helper function to reload all tournament data
  const reloadTournamentData = async () => {
    if (!id) return;
    
    try {
      // Load tournament data
      const foundTournament = await getTournament(id);
      if (foundTournament) {
        setTournament(foundTournament);
        
        // Load teams data efficiently using batch operation
        const teamsData = await getTeamsByIds(foundTournament.teams);
        setTeams(teamsData);
        
        // Load user teams if user is logged in
        if (authUser?.uid || authUser?.id) {
          try {
            const userId = authUser.id || authUser.uid;
            if (userId) {
              const userTeamsData = await getUserTeams(userId);
              setUserTeams(userTeamsData);
            }
          } catch (error) {
            console.warn('Failed to load user teams:', error);
            setUserTeams([]);
          }
        }
        
        // Load matches if tournament is in progress or completed
        if (foundTournament.status === 'in-progress' || foundTournament.status === 'completed' || foundTournament.status === 'group-stage' || foundTournament.status === 'knockout-stage') {
          const matchesData = await getMatches();
          const tournamentMatches = matchesData.filter(match => match.tournamentId === id);
          setMatches(tournamentMatches);
        }
      }
    } catch (error) {
      console.error('Error reloading tournament data:', error);
    }
  };

  useEffect(() => {
    const loadTournamentData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      try {
        // Load tournament data
        const foundTournament = await getTournament(id);
        
        if (foundTournament) {
          setTournament(foundTournament);
          
          // Load teams data efficiently using batch operation
          const teamsData = await getTeamsByIds(foundTournament.teams);
          setTeams(teamsData);
          
          // Load user teams if user is logged in
          if (authUser?.uid || authUser?.id) {
            try {
              const userId = authUser.id || authUser.uid;
              if (userId) {
                const userTeamsData = await getUserTeams(userId);
                setUserTeams(userTeamsData);
              }
            } catch (error) {
              console.warn('Failed to load user teams:', error);
              setUserTeams([]);
            }
          }
          
          // Load matches if tournament is in progress or completed
          if (foundTournament.status === 'in-progress' || foundTournament.status === 'completed' || foundTournament.status === 'group-stage' || foundTournament.status === 'knockout-stage') {
            try {
              const matchesData = await getMatches();
              const tournamentMatches = matchesData.filter(match => match.tournamentId === id);
              setMatches(tournamentMatches);
            } catch (error) {
              console.warn('Failed to load matches:', error);
              setMatches([]);
            }
          }
        } else {
          setTournament(null);
          setError('Tournament not found');
        }
      } catch (error) {
        console.error('Error loading tournament data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    loadTournamentData();
  }, [id]); // Remove authUser from dependencies to prevent infinite loops

  // Separate pending and approved teams - MUST be called before any early returns
  useEffect(() => {
    if (tournament && teams && teams.length > 0) {
      const pending = teams.filter(team => !tournament.approvedTeams?.includes(team.id));
      const approved = teams.filter(team => tournament.approvedTeams?.includes(team.id));
      setPendingTeams(pending);
      setApprovedTeams(approved);
    } else {
      // Reset teams when tournament or teams are not available
      setPendingTeams([]);
      setApprovedTeams([]);
    }
  }, [tournament, teams]);

  // Memoize prize distribution text to prevent console.log spam
  const prizeDistributionText = useMemo(() => {
    if (!tournament) return 'Winner takes all';
    const prizeDist = tournament.prizeDistribution || tournament.prizePool;
    if (typeof prizeDist === 'string') {
      return prizeDist;
    } else if (prizeDist && typeof prizeDist === 'object') {
      if (prizeDist.total !== undefined) {
        const { distribution } = prizeDist;
        if (distribution) {
          return `1st: €${distribution.first || 0}, 2nd: €${distribution.second || 0}, 3rd: €${distribution.third || 0}`;
        }
        return `Total: €${prizeDist.total}`;
      } else {
        // Only use distribution if it exists, otherwise fallback
        const result = prizeDist.distribution || 'Winner takes all';
        return String(result);
      }
    } else {
      return 'Winner takes all';
    }
  }, [tournament]);

  // Check if user is admin - use authUser from useAuth() instead of currentUser prop
  const isAdmin = authUser?.isAdmin || false;
  
  const handleStartTournament = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Starting tournament:', tournament.id);
      await startTournament(tournament.id);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Tournament started successfully!');
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast.error('Failed to start tournament');
    } finally {
      setStarting(false);
    }
  };

  const handleStartGroupStage = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Starting group stage for tournament:', tournament.id);
      
      // Generate groups and initial matches
      await generateGroups(tournament.id);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Group stage started successfully!');
    } catch (error) {
      console.error('Error starting group stage:', error);
      toast.error('Failed to start group stage');
    } finally {
      setStarting(false);
    }
  };

  const handleStartKnockoutStage = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Starting knockout stage for tournament:', tournament.id);
      
      // Start knockout stage
      await startKnockoutStage(tournament.id);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Knockout stage started successfully!');
    } catch (error) {
      console.error('Error starting knockout stage:', error);
      toast.error('Failed to start knockout stage');
    } finally {
      setStarting(false);
    }
  };

  const handleStartSwissStage = async () => {
    if (!tournament?.id) return;
    
    setStarting(true);
    try {
      
      // Initialize Swiss stage
      if (tournament.format?.type === 'swiss-system' && tournament.format.swissConfig) {
        // Generate Swiss rounds and first round pairings
        // This will automatically close registration and set status to in-progress
        await SwissTournamentService.generateSwissRounds(
          tournament.id, 
          tournament.teams || [], 
          tournament.format.swissConfig.rounds
        );
      }
      
      await reloadTournamentData();
      toast.success('Swiss system tournament started successfully!');
      setJustStartedTournament(true);
    } catch (error) {
      console.error('❌ DEBUG: Error starting Swiss system:', error);
      toast.error('Failed to start Swiss system tournament');
    } finally {
      setStarting(false);
    }
  };

  const handleFixDates = async () => {
    try {
      console.log('🔧 Starting to fix tournament dates...');
      const fixedCount = await fixExistingTournamentDates();
      toast.success(`Fixed ${fixedCount} tournaments!`);
      
      // Reload the current tournament data
      await reloadTournamentData();
    } catch (error) {
      console.error('❌ Error fixing tournament dates:', error);
      toast.error('Failed to fix tournament dates');
    }
  };

  const handleStartSingleElimination = async () => {
    if (!tournament?.id) return;
    
    setStarting(true);
    try {
      // Use the correct start function based on tournament type
      if (tournament.format?.type === 'double-elimination') {
        await startDoubleElimination(tournament.id);
      } else {
        await startSingleElimination(tournament.id);
      }
      
      await reloadTournamentData();
      toast.success(`${tournament.format?.type === 'double-elimination' ? 'Double elimination' : 'single elimination'} tournament started!`);
      setJustStartedTournament(true);
      // Fetch latest matches and update userActiveMatches
      const matchesData = await getMatches();
      const tournamentMatches = matchesData.filter(match => match.tournamentId === tournament.id);
      // Fetch latest matches and update userActiveMatches
      const userTeamIds = userTeams.map(t => t.id);
      const activeMatch = tournamentMatches.find(match =>
        (match.team1Id && userTeamIds.includes(match.team1Id)) || (match.team2Id && userTeamIds.includes(match.team2Id))
      );
      if (activeMatch) {
        setUserActiveMatches([activeMatch]);
      }
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast.error(`Failed to start ${tournament.format?.type === 'double-elimination' ? 'double elimination' : 'single elimination'} tournament`);
    } finally {
      setStarting(false);
    }
  };

  // Update userActiveMatches whenever matches or userTeams change
  useEffect(() => {
    if (!matches.length || !userTeams.length) {
      setUserActiveMatches([]);
      return;
    }
    const userTeamIds = userTeams.map(t => t.id);
    const activeMatches = matches.filter(match =>
      !match.isComplete &&
      ((match.team1Id && userTeamIds.includes(match.team1Id)) || (match.team2Id && userTeamIds.includes(match.team2Id)))
    );
    setUserActiveMatches(activeMatches);
  }, [matches, userTeams]);

  const handleReopenRegistration = async () => {
    if (!tournament || !authUser) return;
    
    setStarting(true);
    try {
      await updateTournamentStatus(tournament.id, 'registration-open');
      await reloadTournamentData();
      toast.success('Registration reopened!');
    } catch (error) {
      console.error('Error reopening registration:', error);
      toast.error('Failed to reopen registration');
    } finally {
      setStarting(false);
    }
  };

  const handleRegenerateBracket = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Regenerating bracket for tournament:', tournament.id);
      
      if (tournament.type === 'single-elimination') {
        await generateSingleEliminationBracket(tournament.id, tournament.teams || []);
      } else if (tournament.type === 'group-stage-single-elim') {
        await startKnockoutStage(tournament.id);
      }
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Bracket regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating bracket:', error);
      toast.error('Failed to regenerate bracket');
    } finally {
      setStarting(false);
    }
  };

  const handleCompleteRound = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Completing current round for tournament:', tournament.id);
      
      await completeCurrentRound(tournament.id);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Round completed successfully!');
    } catch (error) {
      console.error('Error completing round:', error);
      toast.error('Failed to complete round');
    } finally {
      setStarting(false);
    }
  };

  const handleFillDemoTeams = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      console.log('Filling tournament with demo teams:', tournament.id);
      
      await fillTournamentWithDemoTeams(tournament.id);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Tournament filled with demo teams!');
    } catch (error) {
      console.error('Error filling demo teams:', error);
      toast.error('Failed to fill demo teams');
    } finally {
      setStarting(false);
    }
  };

  const handleAutoCompleteMatches = async () => {
    if (!tournament || starting) return;
    
    try {
      setStarting(true);
      
      // Get all incomplete matches for this tournament
      const incompleteMatches = matches.filter(match => !match.isComplete);
      
      let completedCount = 0;
      for (const match of incompleteMatches) {
        if (!match.team1Id || !match.team2Id) {
          continue;
        }
        
        // Generate random scores
        const team1Score = Math.floor(Math.random() * 16) + 1; // 1-16
        const team2Score = Math.floor(Math.random() * 16) + 1; // 1-16
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
        
        // Fix: Pass parameters separately instead of as an object
        await completeMatch(match.id, team1Score, team2Score, winnerId);
        completedCount++;
      }
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success(`Auto-completed ${completedCount} matches!`);
    } catch (error) {
      console.error('❌ DEBUG: Error auto-completing matches:', error);
      toast.error('Failed to auto-complete matches');
    } finally {
      setStarting(false);
    }
  };

  const handleApproveTeam = async (teamId: string) => {
    if (!tournament) return;
    
    try {
      await approveTeamForTournament(tournament.id, teamId);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Team approved successfully!');
    } catch (error) {
      console.error('Error approving team:', error);
      toast.error('Failed to approve team');
    }
  };

  const handleRejectTeam = async (teamId: string) => {
    if (!tournament) return;
    
    try {
      await rejectTeamFromTournament(tournament.id, teamId);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Team rejected successfully!');
    } catch (error) {
      console.error('Error rejecting team:', error);
      toast.error('Failed to reject team');
    }
  };

  const handleSignup = async (teamId: string) => {
    if (!tournament || !authUser || signingUp) return;
    
    const team = userTeams.find(t => t.id === teamId);
    if (!team) {
      toast.error('Team not found');
      return;
    }

    // Show enhanced team registration modal
    setSelectedTeamForRegistration(team);
    setShowEnhancedTeamRegistration(true);
  };



  const handleCancelEnhancedTeamRegistration = () => {
    setShowEnhancedTeamRegistration(false);
    setSelectedTeamForRegistration(null);
  };

  const handleMatchUpdate = async (matchId: string, result: { team1Score: number; team2Score: number }) => {
    try {
      await updateMatchState(matchId, result);
      await reloadTournamentData();
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration-open': return 'text-green-400';
      case 'registration-closed': return 'text-yellow-400';
      case 'in-progress': return 'text-blue-400';
      case 'completed': return 'text-purple-400';
      case 'group-stage': return 'text-orange-400';
      case 'knockout-stage': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registration-open': return <UserPlus className="w-5 h-5" />;
      case 'registration-closed': return <Clock className="w-5 h-5" />;
      case 'in-progress': return <Play className="w-5 h-5" />;
      case 'completed': return <Trophy className="w-5 h-5" />;
      case 'group-stage': return <Grid3X3 className="w-5 h-5" />;
      case 'knockout-stage': return <TrendingUp className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
    }
  };

  // Helper functions for team management
  const canSignup = (team: Team) => {
    if (!tournament) return false;
    return !tournament.teams?.includes(team.id) && tournament.status === 'registration-open';
  };

  const isTeamSignedUp = (team: Team) => {
    if (!tournament) return false;
    return tournament.teams?.includes(team.id) || false;
  };

  const getAvailableUserTeams = () => {
    return userTeams.filter(team => canSignup(team));
  };

  // Correct logic: check if any user team is already signed up for this tournament
  const isUserTeamSignedUp = userTeams.some(team => (tournament?.teams || []).includes(team.id));
  const canSignupForUser = authUser && userTeams.length > 0 && !isUserTeamSignedUp && tournament && tournament.status === 'registration-open';

  const handleAutoCompleteCurrentRound = async () => {
    if (!tournament || starting) return;
    try {
      setStarting(true);
      
      // Find the current round (lowest round with incomplete matches)
      const incompleteMatches = matches.filter(m => !m.isComplete);
      if (incompleteMatches.length === 0) {
        toast.error('No incomplete matches found');
        return;
      }
      
      const currentRound = Math.min(...incompleteMatches.map(m => m.round));
      
      const matchesInCurrentRound = matches.filter(m => m.round === currentRound && !m.isComplete);
      
      let completedCount = 0;
      for (const match of matchesInCurrentRound) {
        if (!match.team1Id || !match.team2Id) {
          continue; // Only auto-complete if both teams are set
        }
        
        const team1Score = Math.random() > 0.5 ? 13 : 7;
        const team2Score = team1Score === 13 ? 7 : 13;
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
        
        if (!winnerId) {
          continue;
        }
        
        // Fix: Pass parameters separately instead of as an object
        await completeMatch(match.id, team1Score, team2Score, winnerId);
        completedCount++;
      }
      
      await reloadTournamentData();
      toast.success(`Auto-completed ${completedCount} matches in current round!`);
    } catch (error) {
      console.error('❌ DEBUG: Error auto-completing current round:', error);
      toast.error('Failed to auto-complete current round');
    } finally {
      setStarting(false);
    }
  };

  // New function to complete a single match manually
  const handleCompleteSingleMatch = async (matchId: string, winnerId: string, team1Score: number, team2Score: number) => {
    if (!tournament || starting) return;
    try {
      setStarting(true);
      
      await completeMatch(matchId, team1Score, team2Score, winnerId);
      await reloadTournamentData();
      toast.success('Match completed successfully!');
    } catch (error) {
      console.error('❌ DEBUG: Error completing single match:', error);
      toast.error('Failed to complete match');
    } finally {
      setStarting(false);
    }
  };

  const loadUserTeams = async () => {
    if (!authUser?.uid && !authUser?.id) return;
    
    setLoadingUserTeams(true);
    try {
      const userId = authUser.id || authUser.uid;
      if (userId) {
        const userTeamsData = await getUserTeams(userId);
        setUserTeams(userTeamsData);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
      setUserTeams([]);
    } finally {
      setLoadingUserTeams(false);
    }
  };

  // Load user teams when component mounts or authUser changes
  useEffect(() => {
    // Only load if we don't already have teams loaded
    if (userTeams.length === 0) {
      loadUserTeams();
    }
  }, [authUser]);

  // Add real-time listener for user teams
  useEffect(() => {
    if (!authUser?.uid && !authUser?.id) return;
    
    const userId = authUser.id || authUser.uid;
    if (!userId) return;
    
    // Set up real-time listener for user teams
    const unsubscribe = onUserTeamsChange(userId, (teams) => {
      setUserTeams(teams);
    });
    
    return () => unsubscribe();
  }, [authUser]);

  // Add a function to withdraw the user's team from the tournament
  const handleWithdraw = async (teamId: string) => {
    if (!tournament || !teamId || !authUser?.uid) return;
    try {
      await withdrawTeamFromTournament(tournament.id, teamId, authUser.uid);
      toast.success('Your team has been withdrawn from the tournament.');
      await reloadTournamentData();
    } catch (error) {
      console.error('Error withdrawing from tournament:', error);
      toast.error('Failed to withdraw from tournament.');
    }
  };

  const handleRevertTeamRegistration = async (teamId: string) => {
    if (!tournament?.id) return;
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    setRevertAction({
      type: 'registration',
      teamId,
      teamName: team.name
    });
    setShowRevertConfirmation(true);
  };

  const handleRevertTeamApproval = async (teamId: string) => {
    if (!tournament?.id) return;
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    setRevertAction({
      type: 'approval',
      teamId,
      teamName: team.name
    });
    setShowRevertConfirmation(true);
  };

  const handleRevertTeamRejection = async (teamId: string) => {
    if (!tournament?.id) return;
    
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    setRevertAction({
      type: 'rejection',
      teamId,
      teamName: team.name
    });
    setShowRevertConfirmation(true);
  };

  const confirmRevertAction = async () => {
    if (!revertAction || !tournament?.id) return;
    
    try {
      switch (revertAction.type) {
        case 'registration':
          await revertTeamRegistration(tournament.id, revertAction.teamId);
          toast.success('Team registration reverted successfully!');
          break;
        case 'approval':
          await revertTeamApproval(tournament.id, revertAction.teamId);
          toast.success('Team approval reverted successfully!');
          break;
        case 'rejection':
          await revertTeamRejection(tournament.id, revertAction.teamId);
          toast.success('Team rejection reverted successfully!');
          break;
      }
      
      await reloadTournamentData();
    } catch (error) {
      console.error('Error reverting team action:', error);
      toast.error('Failed to revert team action');
    } finally {
      setShowRevertConfirmation(false);
      setRevertAction(null);
    }
  };

  const cancelRevertAction = () => {
    setShowRevertConfirmation(false);
    setRevertAction(null);
  };

  const handleRevertMatchResult = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);
    
    setBracketRevertAction({
      type: 'match',
      matchId,
      description: `Revert match result between ${team1?.name || 'Team 1'} and ${team2?.name || 'Team 2'}`
    });
    setShowBracketRevertConfirmation(true);
  };

  const handleRevertTeamAdvancement = async (matchId: string, teamId: string) => {
    const match = matches.find(m => m.id === matchId);
    const team = teams.find(t => t.id === teamId);
    if (!match || !team) return;
    
    setBracketRevertAction({
      type: 'team-advancement',
      matchId,
      teamId,
      description: `Revert ${team.name}'s advancement from match #${match.matchNumber}`
    });
    setShowBracketRevertConfirmation(true);
  };

  const handleRevertRound = async (round: number) => {
    if (!tournament?.id) return;
    
    setBracketRevertAction({
      type: 'round',
      round,
      description: `Revert round ${round} and remove teams that advanced from this round from all subsequent rounds`
    });
    setShowBracketRevertConfirmation(true);
  };

  const confirmBracketRevertAction = async () => {
    if (!bracketRevertAction) return;
    
    try {
      switch (bracketRevertAction.type) {
        case 'match':
          if (bracketRevertAction.matchId) {
            await revertMatchResult(bracketRevertAction.matchId);
            toast.success('Match result reverted successfully!');
          }
          break;
        case 'team-advancement':
          if (bracketRevertAction.matchId && bracketRevertAction.teamId) {
            await revertTeamAdvancement(bracketRevertAction.matchId, bracketRevertAction.teamId);
            toast.success('Team advancement reverted successfully!');
          }
          break;
        case 'round':
          if (bracketRevertAction.round && tournament?.id) {
            console.log('Before revert - Bracket state:');
            await debugBracketState(tournament.id);
            
            await revertRoundComprehensive(tournament.id, bracketRevertAction.round);
            
            console.log('After revert - Bracket state:');
            await debugBracketState(tournament.id);
            
            toast.success(`Round ${bracketRevertAction.round} reverted successfully!`);
          }
          break;
      }
      
      // Force refresh all data to ensure visual updates
      await reloadTournamentData();
      
      // Additional delay to ensure Firebase updates are propagated
      setTimeout(async () => {
        await reloadTournamentData();
      }, 1000);
      
    } catch (error) {
      console.error('Error reverting bracket action:', error);
      toast.error('Failed to revert bracket action');
    } finally {
      setShowBracketRevertConfirmation(false);
      setBracketRevertAction(null);
    }
  };

  const cancelBracketRevertAction = () => {
    setShowBracketRevertConfirmation(false);
    setBracketRevertAction(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-4">LOADING...</div>
          <div className="text-gray-400 text-sm">Fetching tournament data</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-4">ERROR</div>
          <div className="text-gray-400 text-sm mb-4">{error || 'Tournament not found'}</div>
          <button
            onClick={() => navigate('/tournaments')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-mono relative overflow-hidden">
      {/* Unity League Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: `
               linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
               linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%),
               radial-gradient(circle at 25% 25%, rgba(6,182,212,0.1) 0 1px, transparent 1px 100px),
               radial-gradient(circle at 75% 75%, rgba(236,72,153,0.1) 0 1px, transparent 1px 100px)
             `
           }} />
      
      {/* Diagonal accent lines like Unity League */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-1 bg-cyan-400 transform rotate-45 origin-top-right"></div>
        <div className="absolute bottom-20 right-10 w-24 h-1 bg-cyan-400 transform -rotate-45 origin-bottom-right"></div>
        <div className="absolute top-40 left-0 w-20 h-1 bg-pink-400 transform rotate-45 origin-top-left"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 bg-clip-text text-transparent uppercase">
            {tournament.name}
          </h1>
          <div className="text-center text-pink-200 mb-6 text-base md:text-lg">
            {tournament.description}
          </div>
        </div>

        {/* Tournament Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="unity-card-cyan">
            <div className="text-cyan-400 font-bold text-sm mb-2">STATUS</div>
            <div className="text-white text-lg font-bold capitalize">{tournament.status.replace('-', ' ')}</div>
            <div className="text-cyan-200 text-xs mt-1">
              {tournament.status === 'registration-open' && 'Open for team registration'}
              {tournament.status === 'registration-closed' && 'Registration closed'}
              {tournament.status === 'in-progress' && 'Tournament in progress'}
              {tournament.status === 'completed' && 'Tournament completed'}
              {tournament.status === 'group-stage' && 'Group stage in progress'}
              {tournament.status === 'knockout-stage' && 'Knockout stage in progress'}
            </div>
          </div>

          <div className="unity-card-pink">
            <div className="text-pink-400 font-bold text-sm mb-2">START TIME</div>
            <div className="text-white text-lg font-bold">{formatDate(tournament.schedule?.startDate)}</div>
            <div className="text-pink-200 text-xs mt-1">
              Tournament begins
            </div>
          </div>

          <div className="unity-card-purple">
            <div className="text-purple-400 font-bold text-sm mb-2">TEAMS</div>
            <div className="text-white text-lg font-bold">
              {tournament.teams?.length || 0} / {tournament.format?.teamCount || 8}
            </div>
            <div className="text-purple-200 text-xs mt-1">
              {tournament.format?.teamCount || 8} teams maximum
            </div>
          </div>

          <div className="unity-card">
            <div className="text-pink-400 font-bold text-sm mb-2">PRIZE POOL</div>
            <div className="text-white text-lg font-bold">€{tournament.prizePool?.total || 0}</div>
            <div className="text-pink-200 text-xs mt-1">
              {prizeDistributionText}
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-black/60 border border-gray-700 rounded-lg p-4 mb-8">
          <div className="text-red-400 font-bold text-sm mb-3">TOURNAMENT REQUIREMENTS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Starting Time:</span>
              <span className="text-gray-200 ml-2">{formatDate(tournament.schedule?.startDate)}</span>
            </div>
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="text-gray-200 ml-2 capitalize">{tournament.format?.type?.replace(/-/g, ' ') || 'Single Elimination'}</span>
            </div>
            <div>
              <span className="text-gray-400">Team Size:</span>
              <span className="text-gray-200 ml-2">{tournament.requirements?.teamSize || 5} players</span>
            </div>
            <div>
              <span className="text-gray-400">Max Teams:</span>
              <span className="text-gray-200 ml-2">{tournament.format?.teamCount || 8}</span>
            </div>
            <div>
              <span className="text-gray-400">Match Format:</span>
              <span className="text-gray-200 ml-2">{tournament.format?.matchFormat || 'BO1'}</span>
            </div>
          </div>
        </div>

        {/* Signup Section */}
        {canSignupForUser && (
          <div className="unity-card mb-8">
            <div className="text-pink-400 font-bold text-lg mb-4">TEAM REGISTRATION</div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-pink-200 mb-2 font-medium">Select Your Team:</div>
                <select
                  className="w-full bg-black/40 text-white border border-pink-400/30 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400"
                  value={selectedSignupTeamId || ''}
                  onChange={e => setSelectedSignupTeamId(e.target.value)}
                >
                  <option value="" disabled>Select a team</option>
                  {getAvailableUserTeams().map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <div className="text-pink-200 text-sm">Choose a team to register with enhanced role selection</div>
              </div>
              <button
                onClick={() => { if (selectedSignupTeamId) handleSignup(selectedSignupTeamId); }}
                disabled={!selectedSignupTeamId || !!signingUp}
                className="unity-btn-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {signingUp ? 'Registering...' : 'Register Team'}
              </button>
            </div>
          </div>
        )}

        {/* Admin Start Swiss Stage Button */}
        {isAdmin && tournament.format?.type === 'swiss-system' && tournament.status === 'registration-open' && (
          <div className="unity-card-cyan mb-8">
            <div className="text-center">
              <h3 className="text-xl font-bold text-cyan-400 mb-4">Ready to Start Swiss Stage?</h3>
              <p className="text-cyan-200 mb-4">
                Tournament has {tournament.teams?.length || 0} teams registered. 
                Click below to start the Swiss system tournament.
              </p>
              <button
                onClick={handleStartSwissStage}
                disabled={starting}
                className="unity-btn-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {starting ? 'Starting...' : 'Start Swiss Stage'}
              </button>
            </div>
          </div>
        )}

        {/* Leave Tournament Button (formerly Withdraw) */}
        {tournament && userTeams && userTeams.length > 0 && userTeams.some(team => (tournament.teams || []).includes(team.id)) && (
          userTeams
            .filter(team => {
              const userId = authUser?.uid || authUser?.id;
              const isCaptainOrOwner = team.captainId === userId || team.ownerId === userId;
              return (tournament.teams || []).includes(team.id) && isCaptainOrOwner;
            })
            .map(team => (
              <button
                key={`leave-${team.id}`}
                onClick={() => handleWithdraw(team.id)}
                className="bg-yellow-700 hover:bg-yellow-800 text-white font-bold py-2 px-6 rounded-lg shadow-lg border border-yellow-900 transition-all duration-200 mt-4 mb-8"
              >
                Leave Tournament
              </button>
            ))
        )}

        {/* Admin Tools (smaller, top-right) */}
        {isAdmin && (
          <div className="fixed top-28 right-8 z-40 bg-black/80 border border-yellow-700 rounded-lg p-3 w-64 shadow-lg">
            <div className="text-yellow-400 font-bold text-xs mb-2 text-center">ADMIN TOOLS</div>
            <div className="grid grid-cols-1 gap-2">
              {/* Fix Tournament Dates Button */}
              <button
                onClick={handleFixDates}
                className="bg-orange-700 hover:bg-orange-800 text-white font-bold py-1 px-2 rounded text-xs border border-orange-900 transition-all duration-200"
              >
                Fix Dates
              </button>
              {/* Bracket Reveal Button */}
              <button
                onClick={() => navigate(`/admin/bracket-reveal/${id}`)}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-1 px-2 rounded text-xs border border-purple-900 transition-all duration-200"
              >
                Bracket Reveal
              </button>
              {/* Manual Seeding Button: Only show if seeding is manual and registration is closed */}
              {(tournament.seeding?.method === 'manual' || tournament.format?.seedingMethod === 'manual') && tournament.status === 'registration-closed' && (
                <button
                  onClick={() => setShowManualSeeding(true)}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-2 rounded text-xs border border-blue-900 transition-all duration-200"
                >
                  Manual Seeding
                </button>
              )}
              {tournament.status === 'registration-open' && (
                <>
                  <button
                    onClick={handleFillDemoTeams}
                    disabled={starting}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-1 px-2 rounded text-xs border border-purple-900 transition-all duration-200"
                  >
                    Fill Demo Teams
                  </button>
                  {/* Swiss System Start Button */}
                  {tournament.format?.type === 'swiss-system' && (
                    <button
                      onClick={handleStartSwissStage}
                      disabled={starting}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-1 px-2 rounded text-xs border border-cyan-900 transition-all duration-200"
                    >
                      Start Swiss Stage
                    </button>
                  )}
                  <button
                    onClick={handleStartGroupStage}
                    disabled={starting}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-2 rounded text-xs border border-green-900 transition-all duration-200"
                  >
                    Start Group Stage
                  </button>
                  <button
                    onClick={handleStartSingleElimination}
                    disabled={starting}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-2 rounded text-xs border border-green-900 transition-all duration-200"
                  >
                    Start {tournament.format?.type === 'double-elimination' ? 'Double Elim' : 'Single Elim'}
                  </button>
                </>
              )}
              {tournament.status === 'registration-closed' && (
                <>
                  <button
                    onClick={handleReopenRegistration}
                    disabled={starting}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-2 rounded text-xs border border-blue-900 transition-all duration-200"
                  >
                    Reopen Registration
                  </button>
                  {/* Swiss System Start Button */}
                  {tournament.format?.type === 'swiss-system' && (
                    <button
                      onClick={handleStartSwissStage}
                      disabled={starting}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-1 px-2 rounded text-xs border border-cyan-900 transition-all duration-200"
                    >
                      Start Swiss Stage
                    </button>
                  )}
                  <button
                    onClick={handleStartGroupStage}
                    disabled={starting}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-2 rounded text-xs border border-green-900 transition-all duration-200"
                  >
                    Start Group Stage
                  </button>
                  <button
                    onClick={handleStartSingleElimination}
                    disabled={starting}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold py-1 px-2 rounded text-xs border border-green-900 transition-all duration-200"
                  >
                    Start {tournament.format?.type === 'double-elimination' ? 'Double Elim' : 'Single Elim'}
                  </button>
                </>
              )}
              {tournament.status === 'group-stage' && (
                <button
                  onClick={handleStartKnockoutStage}
                  disabled={starting}
                  className="bg-orange-700 hover:bg-orange-800 text-white font-bold py-1 px-2 rounded text-xs border border-orange-900 transition-all duration-200"
                >
                  Start Knockout Stage
                </button>
              )}
              {(tournament.status === 'in-progress' || tournament.status === 'knockout-stage') && (
                <>
                  <button
                    onClick={handleRegenerateBracket}
                    disabled={starting}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white font-bold py-1 px-2 rounded text-xs border border-yellow-900 transition-all duration-200"
                  >
                    Regenerate Bracket
                  </button>
                  <button
                    onClick={handleAutoCompleteCurrentRound}
                    disabled={starting}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-1 px-2 rounded text-xs border border-red-900 transition-all duration-200"
                  >
                    Auto-Complete Round
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tournament Teams Debug */}
        {/* Removed for now */}

        {/* Navigation Tabs */}
        <div className="flex border-b border-pink-400/30 mb-8 overflow-x-auto">
          {(() => {
            const baseTabs = [
              { key: 'overview', label: 'OVERVIEW' }
            ];
            
            // Add Swiss system tabs if tournament is Swiss system
            if (tournament.format?.type === 'swiss-system') {
              baseTabs.push(
                { key: 'swiss-standings', label: 'SWISS STANDINGS' },
                { key: 'matchday-management', label: 'UPCOMING MATCHES' }
              );
              
              // Add playoff bracket tab only if playoffs are available
              if (tournament.stageManagement?.playoffStage?.isActive && tournament.matches && tournament.matches.length > 0) {
                baseTabs.push({ key: 'playoff-bracket', label: 'PLAYOFF BRACKET' });
              }
            } else {
              // For non-Swiss tournaments, show regular bracket
              baseTabs.push({ key: 'bracket', label: 'BRACKET' });
            }
            
            return baseTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                className={`px-6 py-3 font-bold text-sm transition-all duration-200 whitespace-nowrap ${
                  activeView === tab.key
                    ? 'text-pink-400 border-b-2 border-pink-400'
                    : 'text-pink-200 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ));
          })()}
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeView === 'overview' && (
            <div className="space-y-6">
                        {/* Registered Teams */}
            <div className="unity-card">
              <div className="text-pink-400 font-bold text-lg mb-4">REGISTERED TEAMS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournament.teams?.filter((teamId, index, array) => array.indexOf(teamId) === index) // Remove duplicates
                    .map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    const isApproved = tournament.approvedTeams?.includes(teamId);
                    const isRejected = tournament.rejectedTeams?.includes(teamId);
                    const isPending = false; // pendingTeams doesn't exist in Tournament type
                    
                    return team ? (
                      <div key={`team-${teamId}-${team.name}`} className="bg-black/40 border border-pink-400/30 rounded-lg p-3 hover:border-pink-400/60 transition-all duration-200">
                        <div className="text-white font-bold cursor-pointer hover:text-pink-300 transition-colors" onClick={() => navigate(`/teams/${team.id}`)}>
                          {team.name}
                        </div>
                        <div className="text-pink-200 text-xs mb-2">{team.members?.length || 0} members</div>
                        
                        {/* Status Badge */}
                        <div className="mb-2">
                          {isApproved && (
                            <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs">Approved</span>
                          )}
                          {isRejected && (
                            <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs">Rejected</span>
                          )}
                          {isPending && (
                            <span className="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-xs">Pending</span>
                          )}
                          {!isApproved && !isRejected && !isPending && (
                            <span className="bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-xs">Registered</span>
                          )}
                        </div>
                        
                        {/* Revert Actions */}
                        {isAdmin && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {isApproved && (
                              <button
                                onClick={() => handleRevertTeamApproval(teamId)}
                                className="bg-yellow-700 hover:bg-yellow-800 text-white px-2 py-1 rounded text-xs border border-yellow-900 transition-all duration-200"
                                title="Revert Approval"
                              >
                                Revert Approval
                              </button>
                            )}
                            {isRejected && (
                              <button
                                onClick={() => handleRevertTeamRejection(teamId)}
                                className="bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded text-xs border border-blue-900 transition-all duration-200"
                                title="Revert Rejection"
                              >
                                Revert Rejection
                              </button>
                            )}
                            <button
                              onClick={() => handleRevertTeamRegistration(teamId)}
                              className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs border border-red-900 transition-all duration-200"
                              title="Remove Team"
                            >
                              Remove Team
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
                {(!tournament.teams || tournament.teams.length === 0) && (
                  <div className="text-gray-400 text-sm">No teams registered yet</div>
                )}
              </div>
              
              {/* Pending Teams (if any) */}
              {tournament.approvedTeams && tournament.approvedTeams.length > 0 && (
                <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
                  <div className="text-yellow-400 font-bold text-sm mb-3">APPROVED TEAMS</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tournament.approvedTeams.map(teamId => {
                      const team = teams.find(t => t.id === teamId);
                      return team ? (
                        <div key={teamId} className="bg-black/40 border border-green-600 rounded-lg p-3">
                          <div className="text-gray-200 font-bold cursor-pointer hover:text-green-300 transition-colors" onClick={() => navigate(`/teams/${team.id}`)}>
                            {team.name}
                          </div>
                          <div className="text-gray-400 text-xs mb-2">{team.members?.length || 0} members</div>
                          <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs">Approved</span>
                          
                          {/* Revert Actions */}
                          {isAdmin && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <button
                                onClick={() => handleRevertTeamApproval(teamId)}
                                className="bg-yellow-700 hover:bg-yellow-800 text-white px-2 py-1 rounded text-xs border border-yellow-900 transition-all duration-200"
                                title="Revert Approval"
                              >
                                Revert Approval
                              </button>
                              <button
                                onClick={() => handleRevertTeamRegistration(teamId)}
                                className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs border border-red-900 transition-all duration-200"
                                title="Remove Team"
                              >
                                Remove Team
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Rejected Teams (if any) */}
              {tournament.rejectedTeams && tournament.rejectedTeams.length > 0 && (
                <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
                  <div className="text-red-400 font-bold text-sm mb-3">REJECTED TEAMS</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tournament.rejectedTeams.map(teamId => {
                      const team = teams.find(t => t.id === teamId);
                      return team ? (
                        <div key={teamId} className="bg-black/40 border border-red-600 rounded-lg p-3">
                          <div className="text-gray-200 font-bold cursor-pointer hover:text-red-300 transition-colors" onClick={() => navigate(`/teams/${team.id}`)}>
                            {team.name}
                          </div>
                          <div className="text-gray-400 text-xs mb-2">{team.members?.length || 0} members</div>
                          <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs">Rejected</span>
                          
                          {/* Revert Actions */}
                          {isAdmin && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <button
                                onClick={() => handleRevertTeamRejection(teamId)}
                                className="bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded text-xs border border-blue-900 transition-all duration-200"
                                title="Revert Rejection"
                              >
                                Revert Rejection
                              </button>
                              <button
                                onClick={() => handleRevertTeamRegistration(teamId)}
                                className="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-xs border border-red-900 transition-all duration-200"
                                title="Remove Team"
                              >
                                Remove Team
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Tournament Progress */}
              {matches.length > 0 && (
                <div className="unity-card">
                  <div className="text-pink-400 font-bold text-lg mb-4">TOURNAMENT PROGRESS</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Total Matches:</span>
                      <span className="text-gray-200 ml-2">{matches.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Completed:</span>
                      <span className="text-gray-200 ml-2">{matches.filter(m => m.isComplete).length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Remaining:</span>
                      <span className="text-gray-200 ml-2">{matches.filter(m => !m.isComplete).length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Swiss System Match Scheduling */}
              {tournament.format?.type === 'swiss-system' && matches.length > 0 && (
                <div className="unity-card-cyan">
                  <div className="text-cyan-400 font-bold text-lg mb-4">MATCH SCHEDULING</div>
                  <div className="text-gray-400 text-sm mb-4">
                    Teams can schedule their matches within the specified timeframes. 
                    {tournament.format.swissConfig?.schedulingWindow && 
                      ` Scheduling window: ${tournament.format.swissConfig.schedulingWindow} days per matchday.`
                    }
                  </div>
                  <div className="space-y-3">
                    {matches
                      .filter(m => m.tournamentType === 'swiss-round' && !m.isComplete)
                      .slice(0, 5) // Show first 5 pending matches
                      .map(match => {
                        const team1 = teams.find(t => t.id === match.team1Id);
                        const team2 = teams.find(t => t.id === match.team2Id);
                        return (
                          <div key={match.id} className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-white font-medium">
                                {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                Round {match.swissRound} • Matchday {match.matchday}
                              </div>
                            </div>
                            <div className="text-gray-400 text-xs">
                              Status: {match.currentSchedulingStatus || 'pending_scheduling'}
                            </div>
                            {match.scheduledTime && (
                              <div className="text-green-400 text-xs">
                                Scheduled: {new Date(match.scheduledTime).toLocaleString('de-DE', {
                  timeZone: 'Europe/Berlin',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {matches.filter(m => m.tournamentType === 'swiss-round' && !m.isComplete).length === 0 && (
                      <div className="text-gray-400 text-sm">No pending Swiss round matches to schedule.</div>
                    )}
                  </div>
                </div>
              )}

              {/* User's Current Matches */}
              {tournament.format?.type === 'swiss-system' && authUser && (
                <UserMatches 
                  userId={authUser.id}
                  matches={userMatches}
                  teams={teams}
                />
              )}

              {/* All Current Matches */}
              {tournament.format?.type === 'swiss-system' && matches.length > 0 && (
                <div className="unity-card-pink">
                  <div className="text-pink-400 font-bold text-lg mb-4">ALL CURRENT MATCHES</div>
                  <div className="text-gray-400 text-sm mb-4">
                    View all ongoing matches and their scheduling status.
                  </div>
                  <div className="space-y-3">
                    {matches
                      .filter(m => m.tournamentType === 'swiss-round' && !m.isComplete)
                      .map(match => {
                        const team1 = teams.find(t => t.id === match.team1Id);
                        const team2 = teams.find(t => t.id === match.team2Id);
                        const statusColor = match.scheduledTime ? 'text-green-400' : 
                                          match.currentSchedulingStatus === 'proposed' ? 'text-orange-400' : 'text-yellow-400';
                        
                        return (
                          <div key={match.id} className="bg-black/40 border border-pink-400/30 rounded-lg p-4 hover:border-pink-400/60 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-white font-medium text-lg">
                                {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                              </div>
                              <div className={`font-medium ${statusColor}`}>
                                {match.scheduledTime ? '✅ Scheduled' :
                                 match.currentSchedulingStatus === 'proposed' ? '⏳ Proposal Sent' : '⏰ Pending'}
                              </div>
                            </div>
                            <div className="text-pink-300 text-sm mb-2">
                              Round {match.swissRound} • Matchday {match.matchday}
                            </div>
                            {match.scheduledTime && (
                              <div className="text-green-400 text-sm">
                                📅 {new Date(match.scheduledTime).toLocaleString('de-DE', {
                                  timeZone: 'Europe/Berlin',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                            {!match.scheduledTime && (
                              <div className="text-yellow-400 text-sm">
                                ⏰ Teams need to schedule this match
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {matches.filter(m => m.tournamentType === 'swiss-round' && !m.isComplete).length === 0 && (
                      <div className="text-gray-400 text-sm">No pending Swiss round matches to schedule.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Swiss System Status */}
              {tournament.format?.type === 'swiss-system' && (
                <div className="unity-card-purple">
                  <div className="text-purple-400 font-bold text-lg mb-4">SWISS SYSTEM STATUS</div>
                  <div className="text-gray-400 text-sm mb-4">
                    Current tournament progress and standings information.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Current Round:</span>
                      <span className="text-gray-200 ml-2">
                        {tournament.stageManagement?.swissStage?.currentRound || 1} / {tournament.format.swissConfig?.rounds || 5}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Current Matchday:</span>
                      <span className="text-gray-200 ml-2">
                        {tournament.stageManagement?.swissStage?.currentMatchday || 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Teams Advancing:</span>
                      <span className="text-gray-200 ml-2">
                        {tournament.format.swissConfig?.teamsAdvanceToPlayoffs || 8} teams
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Swiss Stage:</span>
                      <span className="text-gray-200 ml-2">
                        {tournament.stageManagement?.swissStage?.isActive ? 'Active' : 'Not Started'}
                      </span>
                    </div>
                  </div>
                  {tournament.stageManagement?.playoffStage?.isActive && (
                    <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700 rounded">
                      <div className="text-blue-400 text-sm font-medium">Playoff Stage Active</div>
                      <div className="text-blue-300 text-xs">
                        Round {tournament.stageManagement.playoffStage.currentRound} of {tournament.stageManagement.playoffStage.totalRounds}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeView === 'bracket' && (
            <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
              <div className="text-red-400 font-bold text-sm mb-3">TOURNAMENT BRACKET</div>
              {tournament.type === 'group-stage-single-elim' ? (
                <GroupStageBracket tournament={tournament} matches={matches} teams={teams} />
              ) : (
                <TournamentBracket
                  tournament={tournament}
                  matches={matches} 
                  teams={teams} 
                  currentUser={authUser}
                  isAdmin={isAdmin}
                  onCompleteMatch={handleCompleteSingleMatch}
                  onRefresh={reloadTournamentData}
                  onRevertMatchResult={handleRevertMatchResult}
                  onRevertTeamAdvancement={handleRevertTeamAdvancement}
                  onRevertRound={handleRevertRound}
                />
              )}
            </div>
          )}

          {activeView === 'schedule' && (
            <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
              <div className="text-red-400 font-bold text-sm mb-3">MATCH SCHEDULE</div>
              <TournamentSchedule tournament={tournament} matches={matches} teams={teams} />
            </div>
          )}

          {/* Swiss System Tabs */}
          {activeView === 'swiss-standings' && tournament.format?.type === 'swiss-system' && (
            <div className="unity-card-cyan">
              <div className="text-cyan-400 font-bold text-xl mb-4">SWISS SYSTEM STANDINGS</div>
              <SwissStandings 
                standings={tournament.stageManagement?.swissStage?.standings || []}
                teams={teams}
                currentRound={tournament.stageManagement?.swissStage?.currentRound || 1}
                totalRounds={tournament.format.swissConfig?.rounds || 5}
                teamsAdvancingToPlayoffs={tournament.format.swissConfig?.teamsAdvanceToPlayoffs || 8}
              />
            </div>
          )}

          {activeView === 'matchday-management' && tournament.format?.type === 'swiss-system' && (
            <>
              {/* Admin Swiss Round Management */}
              {isAdmin && (
                <div className="unity-card-purple mb-6">
                  <div className="text-purple-400 font-bold text-xl mb-4">MANAGE SWISS ROUNDS</div>
                  <SwissRoundManagement 
                    tournament={tournament}
                    onRoundGenerated={reloadTournamentData}
                  />
                </div>
              )}
              
              {/* Admin Calendar View */}
              {isAdmin && (
                <div className="unity-card-pink mb-6">
                  <div className="text-pink-400 font-bold text-xl mb-4">ADMIN MATCHDAY CALENDAR</div>
                  <AdminMatchdayCalendar tournamentId={tournament.id} />
                </div>
              )}
              
              {/* Upcoming Matches for Everyone */}
              <div className="unity-card-cyan">
                <div className="text-cyan-400 font-bold text-xl mb-4">UPCOMING MATCHES</div>
                <UpcomingMatches tournamentId={tournament.id} />
              </div>
            </>
          )}

          {activeView === 'playoff-bracket' && tournament.format?.type === 'swiss-system' && (
            <div className="unity-card-purple">
              <div className="text-purple-400 font-bold text-xl mb-4">PLAYOFF BRACKET</div>
              <PlayoffBracket 
                tournament={tournament}
                matches={matches}
                teams={teams}
                onUpdate={reloadTournamentData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Unity League Footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-pink-300 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; TOURNAMENT ID: {tournament.id}</span>
          <span className="text-cyan-400">// Unity League 2025</span>
        </div>
      </div>

      {/* Enhanced Team Registration Modal */}
      {showEnhancedTeamRegistration && selectedTeamForRegistration && tournament && authUser && (
        <EnhancedTeamRegistration
          tournament={tournament}
          team={selectedTeamForRegistration}
          currentUser={authUser}
          onRegistrationComplete={async () => {
            await reloadTournamentData();
            setShowEnhancedTeamRegistration(false);
            setSelectedTeamForRegistration(null);
            toast.success('Team registered successfully for tournament!');
          }}
          onCancel={handleCancelEnhancedTeamRegistration}
        />
      )}

      {/* Revert Confirmation Modal */}
      {showRevertConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-red-400 font-bold text-lg mb-4">CONFIRM REVERT ACTION</div>
            
            <div className="text-gray-300 mb-6">
              <p>Are you sure you want to revert the {revertAction?.type} for team:</p>
              <p className="font-bold text-white mt-2">{revertAction?.teamName}?</p>
              
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded">
                <p className="text-red-400 text-sm">
                  {revertAction?.type === 'registration' ? 'This will completely remove the team from the tournament.' : ''}
                  {revertAction?.type === 'approval' ? 'This will move the team back to pending status.' : ''}
                  {revertAction?.type === 'rejection' ? 'This will move the team back to pending status.' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRevertAction}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevertAction}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Revert Confirmation Modal */}
      {showBracketRevertConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-red-400 font-bold text-lg mb-4">CONFIRM REVERT ACTION</div>
            
            <div className="text-gray-300 mb-6">
              <p>{bracketRevertAction?.description}</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelBracketRevertAction}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBracketRevertAction}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Seeding Modal */}
      {showManualSeeding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative w-full max-w-3xl mx-auto">
            <ManualSeedingInterface
              tournament={tournament}
              teams={teams}
              onSeedingUpdated={async () => {
                setShowManualSeeding(false);
                await reloadTournamentData();
              }}
              onClose={() => setShowManualSeeding(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail; 
