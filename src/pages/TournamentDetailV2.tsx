import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, SectionHeader } from '../components/ui';
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
  MessageCircle,
  Wrench,
  Video,
  Maximize2
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
import DoubleEliminationBracket from '../components/DoubleEliminationBracket';
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
import StreamingManagement from '../components/StreamingManagement';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeUserMatches } from '../hooks/useRealtimeData';
import ManualSeedingInterface from '../components/ManualSeedingInterface';
import PlayoffManualSeeding from '../components/PlayoffManualSeeding';
import PlayoffBracketManagement from '../components/PlayoffBracketManagement';

interface TournamentDetailProps {
  currentUser: User | null;
}

type TournamentView = 'overview' | 'teams' | 'bracket' | 'group-stage' | 'schedule' | 'standings' | 'swiss-standings' | 'matchday-management' | 'playoff-bracket' | 'admin' | 'veto';

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
  const [fixingDates, setFixingDates] = useState(false);
  const [selectedMatchday, setSelectedMatchday] = useState<number | 'all'>('all');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');

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
      const fixedCount = await fixExistingTournamentDates();
      toast.success(`Fixed ${fixedCount} tournaments!`);
      
      // Reload the current tournament data
      await reloadTournamentData();
    } catch (error) {
      console.error('❌ Error fixing tournament dates:', error);
      toast.error('Failed to fix tournament dates');
    }
  };

  const handleFixTournamentDates = async () => {
    setFixingDates(true);
    try {
      const fixedCount = await fixExistingTournamentDates();
      toast.success(`Fixed ${fixedCount} tournaments!`);
      
      // Reload the current tournament data
      await reloadTournamentData();
    } catch (error) {
      console.error('❌ Error fixing tournament dates:', error);
      toast.error('Failed to fix tournament dates');
    } finally {
      setFixingDates(false);
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
            await debugBracketState(tournament.id);
            
            await revertRoundComprehensive(tournament.id, bracketRevertAction.round);
            
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
              {/* Manual Seeding Button: Show if seeding is manual (both open and closed registration) */}
              {(tournament.seeding?.method === 'manual' || tournament.format?.seedingMethod === 'manual') && (
                <button
                  onClick={async () => {
                    // Ensure teams are loaded before opening the modal
                    if (teams.length === 0 && tournament.teams && tournament.teams.length > 0) {
                      await reloadTournamentData();
                    }
                    setShowManualSeeding(true);
                  }}
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

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR - Navigation */}
          <div className="lg:col-span-2">
            <Card variant="glass" padding="sm">
              <div className="space-y-1">
          {(() => {
            const baseTabs = [
                    { key: 'overview', label: 'Overview', icon: Eye },
                    { key: 'teams', label: 'Teams', icon: Users }
            ];
            
            // Add Swiss system tabs if tournament is Swiss system
            if (tournament.format?.type === 'swiss-system') {
              baseTabs.push(
                      { key: 'swiss-standings', label: 'Standings', icon: Award },
                      { key: 'matchday-management', label: 'Schedule', icon: Calendar }
              );
              
              // Debug playoff tab conditions
              console.log('🏆 Playoff Tab Check:');
              console.log('  - playoffStage isActive:', tournament.stageManagement?.playoffStage?.isActive);
              console.log('  - tournament.matches:', tournament.matches?.length);
              console.log('  - All matches count:', matches.length);
              console.log('  - Playoff matches:', matches.filter(m => m.tournamentType === 'playoff').length);
              
              // Add playoff bracket tab only if playoffs are available
              if (tournament.stageManagement?.playoffStage?.isActive) {
                      baseTabs.push({ key: 'playoff-bracket', label: 'Playoffs', icon: Crown });
                      console.log('  ✅ Playoffs tab ADDED');
              } else {
                console.log('  ❌ Playoffs tab NOT added');
              }
            } else {
              // For non-Swiss tournaments, show regular bracket
                    baseTabs.push({ key: 'bracket', label: 'Bracket', icon: Grid3X3 });
                  }
                  
                  // Add Admin tab for admins only
                  if (isAdmin) {
                    baseTabs.push({ key: 'admin', label: 'Admin', icon: Shield });
                  }
                  
                  // Add veto tab if tournament has matches
                  if (matches.length > 0) {
                    baseTabs.push({ key: 'veto', label: 'Veto', icon: Target });
                  }
                  
                  return baseTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  activeView === tab.key
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                        <TabIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{tab.label}</span>
              </button>
                    );
                  });
          })()}
              </div>
            </Card>
        </div>

          {/* CENTER - Main Content */}
          <div className={`${activeView === 'playoff-bracket' ? 'lg:col-span-9' : 'lg:col-span-7'}`}>
            <div className="space-y-6">
          {activeView === 'overview' && (
            <>
              {/* Tournament Progress */}
              {matches.length > 0 && (
                <Card variant="glass" padding="lg">
                  <SectionHeader title="Tournament Progress" icon={TrendingUp} />
                  <div className="grid grid-cols-3 gap-6 mt-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">{matches.length}</div>
                      <div className="text-gray-400 text-sm uppercase tracking-wider">Total Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-400 mb-2">{matches.filter(m => m.isComplete).length}</div>
                      <div className="text-gray-400 text-sm uppercase tracking-wider">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-cyan-400 mb-2">{matches.filter(m => !m.isComplete).length}</div>
                      <div className="text-gray-400 text-sm uppercase tracking-wider">Remaining</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Current Round Recap */}
              {matches.length > 0 && (() => {
                // Get current round (highest round with active/completed matches)
                const currentRound = Math.max(...matches.map(m => m.matchday || m.swissRound || m.round || 1));
                const roundMatches = matches.filter(m => (m.matchday || m.swissRound || m.round) === currentRound);
                const recentResults = roundMatches.filter(m => m.isComplete).slice(0, 6);
                const upcomingMatches = roundMatches.filter(m => !m.isComplete && ['scheduled', 'ready_up', 'pending_scheduling'].includes(m.matchState)).slice(0, 6);
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Recent Results */}
                    {recentResults.length > 0 && (
                      <Card variant="glass" padding="md">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-white font-bold text-sm">Recent Results - Round {currentRound}</span>
                          </div>
                          <button 
                            onClick={() => setActiveView('schedule')}
                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="space-y-2">
                          {recentResults.map(match => {
                            const team1 = teams.find(t => t.id === match.team1Id);
                            const team2 = teams.find(t => t.id === match.team2Id);
                            const team1Won = match.winnerId === match.team1Id;
                            const team2Won = match.winnerId === match.team2Id;
                            return (
                              <div 
                                key={match.id}
                                onClick={() => navigate(`/match/${match.id}`)}
                                className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-green-500/50 transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate ${team1Won ? 'text-green-400' : 'text-gray-400'}`}>
                                      {team1?.name || 'TBD'}
                                    </div>
                                    <div className={`text-sm font-medium truncate ${team2Won ? 'text-green-400' : 'text-gray-400'}`}>
                                      {team2?.name || 'TBD'}
                                    </div>
                                  </div>
                                  <div className="text-white font-bold text-lg ml-3">
                                    {match.team1Score} - {match.team2Score}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}

                    {/* Upcoming Matches */}
                    {upcomingMatches.length > 0 && (
                      <Card variant="glass" padding="md">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-bold text-sm">Upcoming - Round {currentRound}</span>
                          </div>
                          <button 
                            onClick={() => setActiveView('schedule')}
                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="space-y-2">
                          {upcomingMatches.map(match => {
                            const team1 = teams.find(t => t.id === match.team1Id);
                            const team2 = teams.find(t => t.id === match.team2Id);
                            return (
                              <div 
                                key={match.id}
                                onClick={() => navigate(`/match/${match.id}`)}
                                className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">
                                      {team1?.name || 'TBD'}
                                    </div>
                                    <div className="text-xs text-gray-400 my-0.5">vs</div>
                                    <div className="text-sm font-medium text-white truncate">
                                      {team2?.name || 'TBD'}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400 ml-3">
                                    {match.scheduledTime ? (
                                      formatDate(match.scheduledTime)
                                    ) : match.matchState === 'scheduled' ? (
                                      <span className="text-blue-400">Scheduled</span>
                                    ) : (
                                      <span className="italic">Pending</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                );
              })()}

              {/* User's Active Matches */}
              {userActiveMatches && userActiveMatches.length > 0 && (
                <Card variant="bordered" padding="lg">
                  <SectionHeader title="Your Active Matches" icon={Gamepad2} />
                  <div className="mt-4">
                    <UserMatches 
                      userId={authUser?.id || ''}
                      matches={userActiveMatches.slice(0, 5)} 
                      teams={teams}
                    />
                  </div>
                </Card>
              )}
            </>
          )}

          {activeView === 'teams' && (
            <>
                        {/* Registered Teams */}
              <Card variant="glass" padding="lg">
                <SectionHeader 
                  title="REGISTERED TEAMS" 
                  icon={Users}
                  subtitle={`${tournament.teams?.length || 0} / ${tournament.format?.teamCount || 8} teams`}
                />
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {tournament.teams?.filter((teamId, index, array) => array.indexOf(teamId) === index) // Remove duplicates
                    .map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    const isApproved = tournament.approvedTeams?.includes(teamId);
                    const isRejected = tournament.rejectedTeams?.includes(teamId);
                    const isPending = false; // pendingTeams doesn't exist in Tournament type
                    
                    return team ? (
                      <div 
                        key={`team-${teamId}-${team.name}`} 
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-pink-400/50 transition-all duration-200 cursor-pointer group"
                        onClick={() => navigate(`/teams/${team.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-base group-hover:text-pink-300 transition-colors truncate">
                          {team.name}
                        </div>
                            <div className="text-gray-400 text-xs mt-0.5">{team.members?.length || 0} members</div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {isApproved && <StatusBadge status="approved" />}
                            {isRejected && <StatusBadge status="rejected" />}
                            {isPending && <StatusBadge status="pending" />}
                            {!isApproved && !isRejected && !isPending && <StatusBadge status="registered" />}
                          </div>
                        </div>
                        
                        {/* Admin Actions */}
                        {isAdmin && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-700/50" onClick={(e) => e.stopPropagation()}>
                            {isApproved && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRevertTeamApproval(teamId); }}
                                className="bg-yellow-600/80 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Revert Approval
                              </button>
                            )}
                            {isRejected && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRevertTeamRejection(teamId); }}
                                className="bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Revert Rejection
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRevertTeamRegistration(teamId); }}
                              className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
                {(!tournament.teams || tournament.teams.length === 0) && (
                    <div className="text-center text-gray-400 py-8">No teams registered yet</div>
                )}
              </div>
              </Card>
              
              {/* Approved Teams */}
              {tournament.approvedTeams && tournament.approvedTeams.length > 0 && (
                <Card variant="glass" padding="md" className="border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white font-bold text-sm">APPROVED TEAMS</span>
                    </div>
                    <Badge variant="success">{tournament.approvedTeams.length}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                    {tournament.approvedTeams.map(teamId => {
                      const team = teams.find(t => t.id === teamId);
                      return team ? (
                        <div 
                          key={teamId} 
                          className="bg-green-900/10 border border-green-600/30 rounded-lg p-2.5 hover:border-green-500/50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/teams/${team.id}`)}
                        >
                          <div className="text-white font-semibold text-sm group-hover:text-green-300 transition-colors truncate">
                            {team.name}
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5">{team.members?.length || 0} members</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </Card>
              )}
              
              {/* Rejected Teams (Admin Only) */}
              {tournament.rejectedTeams && tournament.rejectedTeams.length > 0 && isAdmin && (
                <Card variant="glass" padding="md" className="border-l-4 border-l-red-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-white font-bold text-sm">REJECTED TEAMS</span>
                    </div>
                    <Badge variant="error">{tournament.rejectedTeams.length}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                    {tournament.rejectedTeams.map(teamId => {
                      const team = teams.find(t => t.id === teamId);
                      return team ? (
                        <div 
                          key={teamId} 
                          className="bg-red-900/10 border border-red-600/30 rounded-lg p-2.5 hover:border-red-500/50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/teams/${team.id}`)}
                        >
                          <div className="text-white font-semibold text-sm group-hover:text-red-300 transition-colors truncate">
                            {team.name}
                            </div>
                          <div className="text-gray-400 text-xs mt-0.5">{team.members?.length || 0} members</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </Card>
              )}
              
              {/* Rejected Teams (Admin Only) */}
              {tournament.rejectedTeams && tournament.rejectedTeams.length > 0 && isAdmin && (
                <Card variant="glass" padding="lg" className="border-l-4 border-l-red-500">
                  <SectionHeader 
                    title="REJECTED TEAMS" 
                    icon={XCircle}
                    subtitle={`${tournament.rejectedTeams.length} teams rejected`}
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </Card>
              )}
            </>
          )}

          {activeView === 'bracket' && (
            <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-red-400 font-bold text-sm">TOURNAMENT BRACKET</div>
                <button
                  type="button"
                  onClick={() => navigate(`/tournaments/${tournament.id}/bracket`)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors font-mono uppercase tracking-widest text-xs"
                >
                  <Maximize2 className="w-4 h-4" />
                  Open Full Page
                </button>
              </div>
              {tournament.type === 'group-stage-single-elim' ? (
                <GroupStageBracket tournament={tournament} matches={matches} teams={teams} />
              ) : tournament.format?.type === 'double-elimination' ? (
                <DoubleEliminationBracket 
                  tournament={tournament} 
                  matches={matches} 
                  teams={teams}
                  isAdmin={isAdmin}
                  currentUser={authUser}
                  onUpdate={reloadTournamentData}
                />
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
            <Card variant="glass" padding="lg">
              <SectionHeader 
                title="SWISS SYSTEM STANDINGS" 
                icon={Trophy}
                subtitle={`Round ${tournament.stageManagement?.swissStage?.currentRound || 1} of ${tournament.format.swissConfig?.rounds || 5}`}
              />
              <div className="mt-4">
                <SwissStandings 
                  standings={tournament.stageManagement?.swissStage?.standings || []}
                  teams={teams}
                  currentRound={tournament.stageManagement?.swissStage?.currentRound || 1}
                  totalRounds={tournament.format.swissConfig?.rounds || 5}
                  teamsAdvancingToPlayoffs={tournament.format.swissConfig?.teamsAdvanceToPlayoffs || 8}
                />
                    </div>
            </Card>
          )}

          {activeView === 'matchday-management' && tournament.format?.type === 'swiss-system' && (
            <Card variant="glass" padding="lg">
              <SectionHeader 
                title="TOURNAMENT SCHEDULE" 
                icon={Calendar}
                subtitle={`${(() => {
                  const matchdays = Array.from(new Set(matches.map(m => m.matchday || m.swissRound).filter(Boolean))).sort((a, b) => a! - b!);
                  let filteredMatches = selectedMatchday === 'all' ? matches : matches.filter(m => (m.matchday || m.swissRound) === selectedMatchday);
                  if (matchStatusFilter === 'upcoming') filteredMatches = filteredMatches.filter(m => !m.isComplete && ['scheduled', 'ready_up', 'pending_scheduling'].includes(m.matchState));
                  else if (matchStatusFilter === 'live') filteredMatches = filteredMatches.filter(m => !m.isComplete && ['map_banning', 'playing'].includes(m.matchState));
                  else if (matchStatusFilter === 'completed') filteredMatches = filteredMatches.filter(m => m.isComplete);
                  const mdText = selectedMatchday === 'all' ? 'All Rounds' : `Round ${selectedMatchday}`;
                  const statusText = matchStatusFilter === 'all' ? 'All Status' : matchStatusFilter.charAt(0).toUpperCase() + matchStatusFilter.slice(1);
                  return `${mdText} • ${statusText} • ${filteredMatches.length} matches`;
                })()}`}
              />
              <div className="mt-4">
                {(() => {
                  // Get unique matchdays from matches - use round field as fallback
                  const matchdays = Array.from(new Set(
                    matches.map(m => m.matchday || m.swissRound || m.round).filter(Boolean)
                  )).sort((a, b) => a! - b!);
                  
                  // Filter matches by selected matchday (use round as fallback)
                  let filteredMatches = selectedMatchday === 'all' 
                    ? matches 
                    : matches.filter(m => (m.matchday || m.swissRound || m.round) === selectedMatchday);
                  
                  // Group matches by status FIRST (before applying status filter)
                  const allUpcoming = filteredMatches.filter(m => !m.isComplete && ['scheduled', 'ready_up', 'pending_scheduling'].includes(m.matchState));
                  const allCompleted = filteredMatches.filter(m => m.isComplete);
                  const allLive = filteredMatches.filter(m => !m.isComplete && ['map_banning', 'playing'].includes(m.matchState));
                  
                  // Apply status filter
                  if (matchStatusFilter === 'upcoming') {
                    filteredMatches = allUpcoming;
                  } else if (matchStatusFilter === 'live') {
                    filteredMatches = allLive;
                  } else if (matchStatusFilter === 'completed') {
                    filteredMatches = allCompleted;
                  }
                  
                  // For display in sections (when 'all' is selected)
                  const upcomingMatches = matchStatusFilter === 'all' ? allUpcoming : filteredMatches;
                  const completedMatches = matchStatusFilter === 'all' ? allCompleted : (matchStatusFilter === 'completed' ? filteredMatches : []);
                  const inProgressMatches = matchStatusFilter === 'all' ? allLive : (matchStatusFilter === 'live' ? filteredMatches : []);
                  
                  return (
                    <>
                      {/* Status Filter Pills */}
                      <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
                        <button
                          onClick={() => setMatchStatusFilter('all')}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all outline-none focus:outline-none ${
                            matchStatusFilter === 'all'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                          }`}
                        >
                          All Status
                        </button>
                        <button
                          onClick={() => setMatchStatusFilter('live')}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all outline-none focus:outline-none ${
                            matchStatusFilter === 'live'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                          }`}
                        >
                          Live ({allLive.length})
                        </button>
                        <button
                          onClick={() => setMatchStatusFilter('upcoming')}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all outline-none focus:outline-none ${
                            matchStatusFilter === 'upcoming'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                          }`}
                        >
                          Upcoming ({allUpcoming.length})
                        </button>
                        <button
                          onClick={() => setMatchStatusFilter('completed')}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all outline-none focus:outline-none ${
                            matchStatusFilter === 'completed'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                          }`}
                        >
                          Completed ({allCompleted.length})
                        </button>
                    </div>

                      {/* Matchday Filter Tabs */}
                      {matchdays.length > 0 && (
                        <div className="mb-4">
                          <div className="text-gray-400 text-xs font-medium mb-2">Filter by Round:</div>
                          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                            <button
                              onClick={() => setSelectedMatchday('all')}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all outline-none focus:outline-none ${
                                selectedMatchday === 'all'
                                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                  : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                              }`}
                            >
                              All Rounds
                            </button>
                            {matchdays.map(day => (
                              <button
                                key={day}
                                onClick={() => setSelectedMatchday(day!)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all outline-none focus:outline-none ${
                                  selectedMatchday === day
                                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'
                                }`}
                              >
                                Round {day}
                              </button>
                            ))}
                  </div>
                </div>
              )}

                      {/* Match Stats - Show counts based on current filters */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-400">{allLive.length}</div>
                          <div className="text-gray-400 text-xs mt-1">In Progress</div>
                  </div>
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-400">{allUpcoming.length}</div>
                          <div className="text-gray-400 text-xs mt-1">Upcoming</div>
                        </div>
                        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-400">{allCompleted.length}</div>
                          <div className="text-gray-400 text-xs mt-1">Completed</div>
                        </div>
                      </div>

                      {/* In Progress Matches */}
                      {inProgressMatches.length > 0 && (
                        <div className="mb-6">
                          <div className="text-yellow-400 font-semibold text-sm mb-3 flex items-center space-x-2">
                            <Zap className="w-4 h-4" />
                            <span>IN PROGRESS</span>
                  </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {inProgressMatches.map(match => {
                        const team1 = teams.find(t => t.id === match.team1Id);
                        const team2 = teams.find(t => t.id === match.team2Id);
                        return (
                                <div 
                                  key={match.id}
                                  onClick={() => navigate(`/match/${match.id}`)}
                                  className="bg-yellow-900/10 border border-yellow-600/30 rounded-lg p-3 hover:border-yellow-500/50 transition-all cursor-pointer"
                                >
                            <div className="flex items-center justify-between mb-2">
                                    <div className="text-yellow-400 text-xs font-medium flex items-center space-x-1">
                                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                      <span>LIVE</span>
                              </div>
                                    {(match.matchday || match.swissRound || match.round) && (
                                      <div className="text-gray-500 text-xs">R{match.matchday || match.swissRound || match.round}</div>
                                    )}
                              </div>
                                  <div className="text-white font-semibold text-sm truncate">{team1?.name || 'TBD'}</div>
                                  <div className="text-gray-400 text-xs my-0.5">vs</div>
                                  <div className="text-white font-semibold text-sm truncate">{team2?.name || 'TBD'}</div>
                            {match.scheduledTime && (
                                    <div className="text-gray-500 text-xs mt-2">{formatDate(match.scheduledTime)}</div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

                      {/* Upcoming Matches */}
                      {upcomingMatches.length > 0 && (
                        <div className="mb-6">
                          <div className="text-blue-400 font-semibold text-sm mb-3 flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>UPCOMING</span>
                  </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {upcomingMatches.map((match) => {
                        const team1 = teams.find(t => t.id === match.team1Id);
                        const team2 = teams.find(t => t.id === match.team2Id);
                        return (
                                <div 
                                  key={match.id}
                                  onClick={() => navigate(`/match/${match.id}`)}
                                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all cursor-pointer"
                                >
                            <div className="flex items-center justify-between mb-2">
                                    <div className="text-blue-400 text-xs font-medium">UPCOMING</div>
                                    {(match.matchday || match.swissRound || match.round) && (
                                      <div className="text-gray-500 text-xs">R{match.matchday || match.swissRound || match.round}</div>
                                    )}
                              </div>
                                  <div className="text-white font-semibold text-sm truncate">{team1?.name || 'TBD'}</div>
                                  <div className="text-gray-400 text-xs my-0.5">vs</div>
                                  <div className="text-white font-semibold text-sm truncate">{team2?.name || 'TBD'}</div>
                                  <div className="text-gray-400 text-xs mt-2">
                                    {match.scheduledTime ? (
                                      formatDate(match.scheduledTime)
                                    ) : match.matchState === 'scheduled' ? (
                                      <span className="text-blue-400">Scheduled</span>
                                    ) : (
                                      <span className="text-gray-500 italic">Pending scheduling</span>
                                    )}
                                  </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

                      {/* Completed Matches */}
                      {completedMatches.length > 0 && (
                    <div>
                          <div className="text-green-400 font-semibold text-sm mb-3 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>COMPLETED</span>
                    </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {completedMatches.map(match => {
                              const team1 = teams.find(t => t.id === match.team1Id);
                              const team2 = teams.find(t => t.id === match.team2Id);
                              const team1Won = match.winnerId === match.team1Id;
                              const team2Won = match.winnerId === match.team2Id;
                              return (
                                <div 
                                  key={match.id}
                                  onClick={() => navigate(`/match/${match.id}`)}
                                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-green-500/50 transition-all cursor-pointer"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-green-400 text-xs font-medium">COMPLETED</div>
                                    {(match.matchday || match.swissRound || match.round) && (
                                      <div className="text-gray-500 text-xs">R{match.matchday || match.swissRound || match.round}</div>
                                    )}
                    </div>
                                  <div className="flex items-center justify-between">
                                    <div className={`font-semibold text-sm truncate flex-1 ${team1Won ? 'text-green-400' : 'text-gray-400'}`}>
                                      {team1?.name || 'TBD'}
                    </div>
                                    <div className="text-white font-bold text-base mx-2">{match.team1Score}</div>
                    </div>
                                  <div className="text-gray-500 text-xs my-0.5">vs</div>
                                  <div className="flex items-center justify-between">
                                    <div className={`font-semibold text-sm truncate flex-1 ${team2Won ? 'text-green-400' : 'text-gray-400'}`}>
                                      {team2?.name || 'TBD'}
                  </div>
                                    <div className="text-white font-bold text-base mx-2">{match.team2Score}</div>
                      </div>
                    </div>
                              );
                            })}
                </div>
            </div>
          )}

                      {filteredMatches.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                          No matches found for this matchday
            </div>
          )}
                    </>
                  );
                })()}
            </div>
            </Card>
          )}

          {activeView === 'playoff-bracket' && tournament.format?.type === 'swiss-system' && (
            <>
              <div className="unity-card-purple mb-6">
                <div className="text-purple-400 font-bold text-xl mb-4">PLAYOFF BRACKET</div>
                <PlayoffBracket 
                  tournament={tournament}
                  matches={matches}
                  teams={teams}
                  onUpdate={reloadTournamentData}
                />
              </div>

              {/* Admin Bracket Management */}
              {isAdmin && (
                <>
                  <div className="unity-card-pink mb-6">
                    <div className="text-pink-400 font-bold text-xl mb-4">ADMIN BRACKET MANAGEMENT</div>
                    <PlayoffBracketManagement
                      matches={matches}
                      teams={teams}
                      onUpdate={reloadTournamentData}
                      currentUser={currentUser}
                    />
                  </div>

                  {/* Ungenerate Bracket Button */}
                  <div className="unity-card-red">
                    <div className="text-red-400 font-bold text-xl mb-4 flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span>DANGER ZONE</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Delete the entire playoff bracket and all matches. This cannot be undone!
                    </p>
                    <button
                      onClick={async () => {
                        if (!confirm('⚠️ DELETE PLAYOFF BRACKET?\n\nThis will permanently delete all playoff matches and reset the bracket. This action cannot be undone!\n\nAre you sure?')) return;
                        try {
                          const { SwissTournamentService } = await import('../services/swissTournamentService');
                          await SwissTournamentService.deletePlayoffBracket(tournament.id);
                          toast.success('Playoff bracket deleted successfully!');
                          await reloadTournamentData();
                        } catch (error: any) {
                          toast.error(`Failed to delete playoff bracket: ${error.message}`);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>DELETE PLAYOFF BRACKET</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ADMIN TAB - Admin-Only Features */}
          {activeView === 'admin' && isAdmin && (
            <>
              {/* Swiss Round Management */}
              {tournament.format?.type === 'swiss-system' && (
                <Card variant="glass" padding="lg" className="border-l-4 border-l-purple-500">
                  <SectionHeader 
                    title="MANAGE SWISS ROUNDS" 
                    icon={Settings}
                    subtitle="Generate and manage Swiss system rounds"
                  />
                  <div className="mt-4">
                  <SwissRoundManagement 
                    tournament={tournament}
                    onRoundGenerated={reloadTournamentData}
                  />
                    
                    {/* Generate Playoff Bracket Button */}
                    {(tournament.stageManagement?.swissStage?.currentRound || 0) >= (tournament.format?.swissConfig?.rounds || 5) && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-yellow-400 font-bold text-lg mb-2 flex items-center space-x-2">
                              <Crown className="w-5 h-5" />
                              <span>Generate Playoff Bracket</span>
                            </h4>
                            <p className="text-gray-300 text-sm mb-3">
                              Swiss rounds are complete! Generate a BO3 single-elimination bracket for the top 8 teams.
                            </p>
                            <ul className="text-gray-400 text-xs space-y-1 mb-4">
                              <li>• Quarter Finals: 4 matches (1v8, 2v7, 3v6, 4v5)</li>
                              <li>• Semi Finals: 2 matches</li>
                              <li>• Grand Final: 1 match</li>
                              <li>• All matches are Best of 3 (BO3)</li>
                            </ul>
                </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Generate playoff bracket for top 8 teams? This cannot be undone.')) return;
                            try {
                              const { SwissTournamentService } = await import('../services/swissTournamentService');
                              await SwissTournamentService.generatePlayoffBracket(tournament.id);
                              toast.success('Playoff bracket generated! Check the Playoffs tab.');
                              await reloadTournamentData();
                            } catch (error: any) {
                              toast.error(`Failed to generate playoff bracket: ${error.message}`);
                            }
                          }}
                          disabled={tournament.stageManagement?.playoffStage?.isActive}
                          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {tournament.stageManagement?.playoffStage?.isActive ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span>Playoffs Already Generated</span>
                            </>
                          ) : (
                            <>
                              <Crown className="w-5 h-5" />
                              <span>GENERATE PLAYOFF BRACKET</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Admin Matchday Calendar */}
              {tournament.format?.type === 'swiss-system' && (
                <Card variant="glass" padding="lg" className="border-l-4 border-l-pink-500 mt-6">
                  <SectionHeader 
                    title="ADMIN MATCHDAY CALENDAR" 
                    icon={Calendar}
                    subtitle="Schedule and manage match times"
                  />
                  <div className="mt-4">
                  <AdminMatchdayCalendar tournamentId={tournament.id} />
                </div>
                </Card>
              )}

              {/* Tournament Management Tools */}
              <Card variant="glass" padding="lg" className="border-l-4 border-l-cyan-500 mt-6">
                <SectionHeader 
                  title="TOURNAMENT TOOLS" 
                  icon={Wrench}
                  subtitle="Administrative utilities"
                />
                <div className="mt-4 space-y-3">
                  {/* Fix Tournament Dates Button */}
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
                        onClick={async () => {
                          // Ensure teams are loaded before opening the modal
                          if (teams.length === 0 && tournament.teams && tournament.teams.length > 0) {
                            await reloadTournamentData();
                          }
                          setShowManualSeeding(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors ml-4"
                      >
                        Adjust Seeding
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Team Management (Revert Actions) */}
              <Card variant="glass" padding="lg" className="border-l-4 border-l-orange-500 mt-6">
                <SectionHeader 
                  title="TEAM MANAGEMENT" 
                  icon={Users}
                  subtitle="Manage team registrations, approvals, and rejections"
                />
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-4">
                    You can manage team registrations in the <button onClick={() => setActiveView('teams')} className="text-pink-400 hover:text-pink-300 underline">Teams tab</button>.
                    All admin actions (approve, reject, revert) are available there.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">{tournament.teams?.length || 0}</div>
                      <div className="text-gray-400 text-xs">Total Registered</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">{tournament.approvedTeams?.length || 0}</div>
                      <div className="text-gray-400 text-xs">Approved</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400 mb-1">{tournament.rejectedTeams?.length || 0}</div>
                      <div className="text-gray-400 text-xs">Rejected</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Streaming Management */}
              <Card variant="glass" padding="lg" className="border-l-4 border-l-indigo-500 mt-6">
                <SectionHeader 
                  title="STREAMING MANAGEMENT" 
                  icon={Video}
                  subtitle="Assign streamers to matches"
                />
                <div className="mt-4">
                  <StreamingManagement 
                matches={matches}
                teams={teams}
                    currentUser={authUser}
              />
            </div>
              </Card>
            </>
          )}

          {/* VETO TAB - Veto Information */}
          {activeView === 'veto' && (
            <Card variant="glass" padding="lg">
              <SectionHeader 
                title="VETO INFORMATION" 
                icon={Target}
                subtitle="View all map bans, picks, and side selections for tournament matches"
              />
              <div className="mt-6 space-y-6">
                {matches.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    No matches found for this tournament.
                  </div>
                ) : (
                  matches
                    .sort((a, b) => {
                      // Sort by round, then by match number
                      if (a.round !== b.round) return a.round - b.round;
                      return a.matchNumber - b.matchNumber;
                    })
                    .map((match) => {
                      const team1 = teams.find(t => t.id === match.team1Id);
                      const team2 = teams.find(t => t.id === match.team2Id);
                      const matchFormat = match.matchFormat || 'BO1';
                      const hasVetoData = 
                        (match.bannedMaps && (match.bannedMaps.team1?.length > 0 || match.bannedMaps.team2?.length > 0)) ||
                        match.banSequence?.length > 0 ||
                        match.selectedMap ||
                        match.map1 ||
                        match.map2 ||
                        match.deciderMap;

                      if (!hasVetoData && match.matchState === 'scheduled') {
                        return null; // Skip matches that haven't started veto process
                      }

                      return (
                        <div key={match.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-pink-500/50 transition-all duration-200">
                          {/* Match Header */}
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                            <div className="flex items-center gap-4">
                              <div className="text-white font-bold text-lg">
                                {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Round {match.round} • Match {match.matchNumber}
                              </Badge>
                              {match.bracketType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {match.bracketType.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {matchFormat}
                            </Badge>
                          </div>

                          {/* Veto Information */}
                          {hasVetoData ? (
                            <div className="space-y-4">
                              {/* Ban Sequence */}
                              {match.banSequence && match.banSequence.length > 0 && (
                                <div>
                                  <div className="text-gray-400 font-semibold text-sm mb-3 flex items-center space-x-2">
                                    <Target className="w-4 h-4" />
                                    <span>BAN SEQUENCE</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {match.banSequence.map((ban, index) => {
                                      const banTeam = ban.teamId === match.team1Id ? team1 : team2;
                                      const banNumber = ban.banNumber || (index + 1);
                                      return (
                                        <div
                                          key={index}
                                          className="bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5 text-sm"
                                        >
                                          <span className="text-gray-400 font-semibold mr-2">
                                            {banNumber}.
                                          </span>
                                          <span className="text-gray-300">
                                            {banTeam?.name || 'Team'} banned
                                          </span>
                                          <span className="text-white font-bold ml-2">{ban.mapName}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* BO1 Map Selection */}
                              {matchFormat === 'BO1' && match.selectedMap && (() => {
                                // The team that made the last ban effectively picked the remaining map
                                const lastBan = match.banSequence?.[match.banSequence.length - 1];
                                const mapPickingTeam = lastBan?.teamId === match.team1Id ? team1 : 
                                                      lastBan?.teamId === match.team2Id ? team2 : null;
                                // Fallback: if no banSequence, check who made the last ban from bannedMaps
                                let fallbackPickingTeam = null;
                                if (!mapPickingTeam && match.bannedMaps) {
                                  const team1Bans = match.bannedMaps.team1?.length || 0;
                                  const team2Bans = match.bannedMaps.team2?.length || 0;
                                  const totalBans = team1Bans + team2Bans;
                                  // In BO1, teams alternate. If odd number of bans, team1 made last ban
                                  if (totalBans > 0) {
                                    const lastBanByTeam1 = totalBans % 2 === 1;
                                    fallbackPickingTeam = lastBanByTeam1 ? team1 : team2;
                                  }
                                }
                                const finalPickingTeam = mapPickingTeam || fallbackPickingTeam;
                                return (
                                  <div>
                                    <div className="text-gray-400 font-semibold text-sm mb-2">SELECTED MAP</div>
                                    <div className="bg-gray-800/50 border border-gray-700 rounded px-4 py-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-white font-semibold">{match.selectedMap}</span>
                                        {finalPickingTeam && (
                                          <span className="text-gray-400 text-xs">
                                            (picked by {finalPickingTeam.name} - last ban)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* BO1 Side Selection */}
                              {matchFormat === 'BO1' && match.selectedMap && (() => {
                                // The team that picks the side is the OPPOSITE of the team that made the last ban
                                const lastBan = match.banSequence?.[match.banSequence.length - 1];
                                let sidePickingTeam = lastBan?.teamId === match.team1Id ? team2 : 
                                                     lastBan?.teamId === match.team2Id ? team1 : null;
                                // Fallback: if no banSequence, check who made the last ban from bannedMaps
                                if (!sidePickingTeam && match.bannedMaps) {
                                  const team1Bans = match.bannedMaps.team1?.length || 0;
                                  const team2Bans = match.bannedMaps.team2?.length || 0;
                                  const totalBans = team1Bans + team2Bans;
                                  if (totalBans > 0) {
                                    const lastBanByTeam1 = totalBans % 2 === 1;
                                    sidePickingTeam = lastBanByTeam1 ? team2 : team1;
                                  }
                                }
                                
                                // Determine which side each team has - check both direct properties and sideSelection object
                                const team1Side = match.team1Side || match.sideSelection?.team1Side;
                                const team2Side = match.team2Side || match.sideSelection?.team2Side;
                                
                                return (
                                  <div>
                                    <div className="text-gray-400 font-semibold text-sm mb-3">SIDE SELECTION</div>
                                    {sidePickingTeam && (
                                      <div className="text-gray-300 text-xs mb-3">
                                        {sidePickingTeam.name} selected starting side
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      {team1 && (
                                        <div className={`bg-gray-800/50 border rounded px-4 py-3 ${
                                          sidePickingTeam?.id === team1.id 
                                            ? 'border-gray-600' 
                                            : 'border-gray-700'
                                        }`}>
                                          <div className="text-gray-400 text-xs mb-2 font-medium">{team1.name}</div>
                                          {team1Side ? (
                                            <>
                                              <div className="text-white font-semibold capitalize">
                                                {team1Side}
                                              </div>
                                              {sidePickingTeam && sidePickingTeam.id === team1.id && (
                                                <div className="text-gray-400 text-xs mt-1">(selected by {team1.name})</div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="text-gray-500 text-sm">Not selected</div>
                                          )}
                                        </div>
                                      )}
                                      {team2 && (
                                        <div className={`bg-gray-800/50 border rounded px-4 py-3 ${
                                          sidePickingTeam?.id === team2.id 
                                            ? 'border-gray-600' 
                                            : 'border-gray-700'
                                        }`}>
                                          <div className="text-gray-400 text-xs mb-2 font-medium">{team2.name}</div>
                                          {team2Side ? (
                                            <>
                                              <div className="text-white font-semibold capitalize">
                                                {team2Side}
                                              </div>
                                              {sidePickingTeam && sidePickingTeam.id === team2.id && (
                                                <div className="text-gray-400 text-xs mt-1">(selected by {team2.name})</div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="text-gray-500 text-sm">Not selected</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* BO3 Map System */}
                              {matchFormat === 'BO3' && (
                                <div className="space-y-4">
                                  {/* Map 1 */}
                                  {match.map1 && (
                                    <div>
                                      <div className="text-pink-400 font-bold text-sm mb-2">MAP 1</div>
                                      <div className="bg-green-900/30 border border-green-500/50 rounded px-4 py-2 mb-3">
                                        <span className="text-green-300 font-bold">{match.map1}</span>
                                      </div>
                                      {match.map1Side && (() => {
                                        // For BO3, the team that picked Map 1 gets to pick the side
                                        // Map 1 is picked by Team 1 (first picker)
                                        const sidePickingTeam = team1;
                                        return (
                                          <div>
                                            {sidePickingTeam && (
                                              <div className="text-pink-300 text-xs mb-2">
                                                {sidePickingTeam.name} selected starting side
                                              </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                              {team1 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team1.name}</div>
                                                  <div className="text-white font-bold capitalize">{match.map1Side}</div>
                                                  {sidePickingTeam && sidePickingTeam.id === team1.id && (
                                                    <div className="text-blue-200 text-xs mt-1">(selected)</div>
                                                  )}
                                                </div>
                                              )}
                                              {team2 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team2.name}</div>
                                                  <div className="text-white font-bold capitalize">
                                                    {match.map1Side === 'attack' ? 'defense' : 'attack'}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Map 2 */}
                                  {match.map2 && (
                                    <div>
                                      <div className="text-pink-400 font-bold text-sm mb-2">MAP 2</div>
                                      <div className="bg-green-900/30 border border-green-500/50 rounded px-4 py-2 mb-3">
                                        <span className="text-green-300 font-bold">{match.map2}</span>
                                      </div>
                                      {match.map2Side && (() => {
                                        // For BO3, Map 2 is picked by Team 2, so they get to pick the side
                                        const sidePickingTeam = team2;
                                        return (
                                          <div>
                                            {sidePickingTeam && (
                                              <div className="text-pink-300 text-xs mb-2">
                                                {sidePickingTeam.name} selected starting side
                                              </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                              {team1 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team1.name}</div>
                                                  <div className="text-white font-bold capitalize">
                                                    {match.map2Side === 'attack' ? 'defense' : 'attack'}
                                                  </div>
                                                </div>
                                              )}
                                              {team2 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team2.name}</div>
                                                  <div className="text-white font-bold capitalize">{match.map2Side}</div>
                                                  {sidePickingTeam && sidePickingTeam.id === team2.id && (
                                                    <div className="text-blue-200 text-xs mt-1">(selected)</div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Decider Map */}
                                  {match.deciderMap && (
                                    <div>
                                      <div className="text-pink-400 font-bold text-sm mb-2">DECIDER MAP</div>
                                      <div className="bg-yellow-900/30 border border-yellow-500/50 rounded px-4 py-2 mb-3">
                                        <span className="text-yellow-300 font-bold">{match.deciderMap}</span>
                                      </div>
                                      {match.deciderMapSide && (() => {
                                        // For BO3 decider, Team 1 picks the side (they pick first after the bans)
                                        const sidePickingTeam = team1;
                                        return (
                                          <div>
                                            {sidePickingTeam && (
                                              <div className="text-pink-300 text-xs mb-2">
                                                {sidePickingTeam.name} selected starting side
                                              </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                              {team1 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team1.name}</div>
                                                  <div className="text-white font-bold capitalize">{match.deciderMapSide}</div>
                                                  {sidePickingTeam && sidePickingTeam.id === team1.id && (
                                                    <div className="text-blue-200 text-xs mt-1">(selected)</div>
                                                  )}
                                                </div>
                                              )}
                                              {team2 && (
                                                <div className="bg-blue-900/30 border border-blue-500/50 rounded px-4 py-3">
                                                  <div className="text-blue-300 text-xs mb-1 font-semibold">{team2.name}</div>
                                                  <div className="text-white font-bold capitalize">
                                                    {match.deciderMapSide === 'attack' ? 'defense' : 'attack'}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Team Bans Summary */}
                              {match.bannedMaps && (
                                <div>
                                  <div className="text-gray-400 font-semibold text-sm mb-3">BANS BY TEAM</div>
                                  <div className="grid grid-cols-2 gap-4">
                                    {team1 && match.bannedMaps.team1 && match.bannedMaps.team1.length > 0 && (
                                      <div>
                                        <div className="text-gray-300 text-xs mb-2 font-semibold">{team1.name} Bans:</div>
                                        <div className="flex flex-wrap gap-2">
                                          {match.bannedMaps.team1.map((map, index) => {
                                            // Find the ban in banSequence to get the global banNumber (1-6)
                                            const banEntry = match.banSequence?.find(b => b.mapName === map && b.teamId === match.team1Id);
                                            const banIndex = match.banSequence?.findIndex(b => b.mapName === map && b.teamId === match.team1Id);
                                            const banNumber = banEntry?.banNumber || (banIndex !== undefined && banIndex !== -1 ? banIndex + 1 : null) || (index + 1);
                                            return (
                                              <Badge key={index} variant="outline" className="bg-gray-800/50 border-gray-700 text-gray-300 text-xs">
                                                {banNumber}. {map}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {team2 && match.bannedMaps.team2 && match.bannedMaps.team2.length > 0 && (
                                      <div>
                                        <div className="text-gray-300 text-xs mb-2 font-semibold">{team2.name} Bans:</div>
                                        <div className="flex flex-wrap gap-2">
                                          {match.bannedMaps.team2.map((map, index) => {
                                            // Find the ban in banSequence to get the global banNumber (1-6)
                                            const banEntry = match.banSequence?.find(b => b.mapName === map && b.teamId === match.team2Id);
                                            const banIndex = match.banSequence?.findIndex(b => b.mapName === map && b.teamId === match.team2Id);
                                            const banNumber = banEntry?.banNumber || (banIndex !== undefined && banIndex !== -1 ? banIndex + 1 : null) || (index + 1);
                                            return (
                                              <Badge key={index} variant="outline" className="bg-gray-800/50 border-gray-700 text-gray-300 text-xs">
                                                {banNumber}. {map}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm text-center py-4">
                              Veto process has not started yet.
                            </div>
                          )}

                        </div>
                      );
                    })
                    .filter(Boolean) // Remove null entries
                )}
              </div>
            </Card>
          )}
            </div>
          </div>

          {/* RIGHT SIDEBAR - Quick Info & Stats */}
          {activeView !== 'playoff-bracket' && (
          <div className="lg:col-span-3 space-y-4">
            {/* Tournament Quick Info */}
            <Card variant="glass" padding="md">
              <div className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-4">Tournament Info</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Format</span>
                  <span className="text-white font-medium text-xs capitalize">{tournament.format?.type?.replace(/-/g, ' ') || 'Single Elim'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Team Size</span>
                  <span className="text-white font-medium">{tournament.requirements?.teamSize || 5}v{tournament.requirements?.teamSize || 5}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Match Format</span>
                  <span className="text-white font-medium">{tournament.format?.matchFormat || 'BO1'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Start Date</span>
                  <span className="text-white font-medium text-xs text-right">{formatDate(tournament.schedule?.startDate)}</span>
                </div>
              </div>
            </Card>

            {/* User Active Matches Widget */}
            {userActiveMatches && userActiveMatches.length > 0 && (
              <Card variant="bordered" padding="md">
                <div className="text-pink-400 font-semibold text-xs uppercase tracking-wider mb-3">Your Matches</div>
                <div className="space-y-2">
                  {userActiveMatches.slice(0, 3).map(match => {
                    const team1 = teams.find(t => t.id === match.team1Id);
                    const team2 = teams.find(t => t.id === match.team2Id);
                    return (
                      <div 
                        key={match.id} 
                        className="p-2 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-pink-500/30 transition-colors cursor-pointer text-xs"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <div className="text-white font-medium mb-1 leading-tight">
                          {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {formatDate(match.scheduledTime)}
                        </div>
                      </div>
                    );
                  })}
                  {userActiveMatches.length > 3 && (
                    <div className="text-center text-gray-400 text-xs mt-2">
                      +{userActiveMatches.length - 3} more matches
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Discord Status */}
            {!discordLinked && canSignupForUser && (
              <Card variant="glass" padding="md" className="border-l-4 border-l-yellow-500">
                <div className="text-yellow-400 font-semibold text-xs uppercase tracking-wider mb-2">Discord Required</div>
                <p className="text-gray-300 text-xs mb-3">Link Discord to register for tournaments</p>
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Link Discord
                </button>
              </Card>
            )}
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
      {showManualSeeding && tournament && (
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
