import React, { useState, useEffect, useMemo } from 'react';
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
  UserX
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getTournaments, 
  getTournamentMatches, 
  getTeams, 
  getTeamById, 
  startTournament, 
  getUserMatches, 
  signupTeamForTournament, 
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
  startSingleElimination
} from '../services/firebaseService';
import { getTournament } from '../services/tournamentService';
import { 
  generateGroups, 
  generateMatchDay, 
  startKnockoutStage, 
  checkGroupStageCompletion, 
  updateGroupStandings,
  advanceWinnerToNextRound,
  completeCurrentRound
} from '../services/tournamentStageService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament, Match, Team, User } from '../types/tournament';
import TournamentBracket from '../components/TournamentBracket';
import GroupStageBracket from '../components/GroupStageBracket';
import TournamentSchedule from '../components/TournamentSchedule';
import TournamentLeaderboard from '../components/TournamentLeaderboard';
import { useAuth } from '../hooks/useAuth';

interface TournamentDetailProps {
  currentUser: User | null;
}

type TournamentView = 'overview' | 'bracket' | 'group-stage' | 'schedule' | 'standings';

const TournamentDetail: React.FC<TournamentDetailProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser: authUser } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [userActiveMatches, setUserActiveMatches] = useState<Match[]>([]);
  const [activeView, setActiveView] = useState<TournamentView>('overview');
  const [pendingTeams, setPendingTeams] = useState<Team[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);

  // Helper function to reload all tournament data
  const reloadTournamentData = async () => {
    if (!id) return;
    
    try {
      // Load tournament data
      const foundTournament = await getTournament(id);
      if (foundTournament) {
        setTournament(foundTournament);
        
        // Load teams data
        const teamsData = await Promise.all(
          foundTournament.teams.map(async (teamId) => {
            try {
              return await getTeamById(teamId);
            } catch (error) {
              console.warn(`Failed to load team ${teamId}:`, error);
              return null;
            }
          })
        );
        
        const validTeams = teamsData.filter(team => team !== null) as Team[];
        setTeams(validTeams);
        
        // Load user teams if user is logged in
        if (authUser?.uid) {
          const userTeamsData = await getUserTeams(authUser.uid);
          setUserTeams(userTeamsData);
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
      if (!id) return;
      
      setLoading(true);
      try {
        console.log('Loading tournament data for ID:', id);
        
        // Load tournament data
        const foundTournament = await getTournament(id);
        console.log('Found tournament:', foundTournament);
        
        if (foundTournament) {
          setTournament(foundTournament);
          
          // Load teams data
          const teamsData = await Promise.all(
            foundTournament.teams.map(async (teamId) => {
              try {
                return await getTeamById(teamId);
              } catch (error) {
                console.warn(`Failed to load team ${teamId}:`, error);
                return null;
              }
            })
          );
          
          const validTeams = teamsData.filter(team => team !== null) as Team[];
          setTeams(validTeams);
          
          // Load user teams if user is logged in
          if (authUser?.uid) {
            const userTeamsData = await getUserTeams(authUser.uid);
            setUserTeams(userTeamsData);
          }
          
          // Load matches if tournament is in progress or completed
          if (foundTournament.status === 'in-progress' || foundTournament.status === 'completed' || foundTournament.status === 'group-stage' || foundTournament.status === 'knockout-stage') {
            const matchesData = await getMatches();
            const tournamentMatches = matchesData.filter(match => match.tournamentId === id);
            setMatches(tournamentMatches);
          }
        } else {
          setTournament(null);
        }
      } catch (error) {
        console.error('Error loading tournament data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    loadTournamentData();
  }, [id, authUser]);

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
  
  // Debug admin check
  console.log('TournamentDetail - authUser:', authUser);
  console.log('TournamentDetail - currentUser prop:', currentUser);
  console.log('TournamentDetail - isAdmin:', isAdmin);
  console.log('TournamentDetail - authUser?.isAdmin:', authUser?.isAdmin);
  console.log('TournamentDetail - tournament:', tournament);

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

  const handleStartSingleElimination = async () => {
    if (!tournament || !authUser) return;
    
    setStarting(true);
    try {
      await startSingleElimination(tournament.id);
      await reloadTournamentData();
      toast.success('Single elimination tournament started!');
    } catch (error) {
      console.error('Error starting single elimination:', error);
      toast.error('Failed to start single elimination tournament');
    } finally {
      setStarting(false);
    }
  };

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
      console.log('🔍 DEBUG: Auto-completing all matches for tournament:', tournament.id);
      
      // Get all incomplete matches for this tournament
      const incompleteMatches = matches.filter(match => !match.isComplete);
      console.log('🔍 DEBUG: Found incomplete matches:', incompleteMatches.length);
      
      let completedCount = 0;
      for (const match of incompleteMatches) {
        if (!match.team1Id || !match.team2Id) {
          console.log('⚠️ DEBUG: Skipping match without both teams:', match.id);
          continue;
        }
        
        // Generate random scores
        const team1Score = Math.floor(Math.random() * 16) + 1; // 1-16
        const team2Score = Math.floor(Math.random() * 16) + 1; // 1-16
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
        
        console.log('🔍 DEBUG: Completing match:', {
          matchId: match.id,
          team1Score,
          team2Score,
          winnerId
        });
        
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
    
    try {
      setSigningUp(teamId);
      console.log('Signing up team for tournament:', teamId, tournament.id);
      
      await signupTeamForTournament(tournament.id, teamId);
      
      // Reload tournament data
      await reloadTournamentData();
      
      toast.success('Team signed up successfully!');
    } catch (error) {
      console.error('Error signing up team:', error);
      toast.error('Failed to sign up team');
    } finally {
      setSigningUp(null);
    }
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

  const isUserTeamSignedUp = userTeams.some(team => team.id === userTeams[0]?.id);
  const canSignupForUser = authUser && userTeams.length > 0 && !isUserTeamSignedUp && tournament && tournament.status === 'registration-open';

  const handleAutoCompleteCurrentRound = async () => {
    if (!tournament || starting) return;
    try {
      setStarting(true);
      console.log('🔍 DEBUG: Starting auto-complete current round');
      
      // Find the current round (lowest round with incomplete matches)
      const incompleteMatches = matches.filter(m => !m.isComplete);
      if (incompleteMatches.length === 0) {
        toast.error('No incomplete matches found');
        return;
      }
      
      const currentRound = Math.min(...incompleteMatches.map(m => m.round));
      console.log('🔍 DEBUG: Current round:', currentRound);
      
      const matchesInCurrentRound = matches.filter(m => m.round === currentRound && !m.isComplete);
      console.log('🔍 DEBUG: Matches in current round:', matchesInCurrentRound.map(m => ({
        id: m.id,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        round: m.round,
        matchNumber: m.matchNumber
      })));
      
      let completedCount = 0;
      for (const match of matchesInCurrentRound) {
        if (!match.team1Id || !match.team2Id) {
          console.log('⚠️ DEBUG: Skipping match without both teams:', match.id);
          continue; // Only auto-complete if both teams are set
        }
        
        const team1Score = Math.random() > 0.5 ? 13 : 7;
        const team2Score = team1Score === 13 ? 7 : 13;
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
        
        console.log('🔍 DEBUG: Completing match:', {
          matchId: match.id,
          team1Score,
          team2Score,
          winnerId
        });
        
        if (!winnerId) {
          console.warn('❌ DEBUG: Skipping match with undefined winnerId:', match);
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
      console.log('🔍 DEBUG: Completing single match:', { matchId, winnerId, team1Score, team2Score });
      
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
    if (authUser?.uid) {
      try {
        const userTeamsData = await getUserTeams(authUser.uid);
        setUserTeams(userTeamsData);
      } catch (error) {
        console.error('Error loading user teams:', error);
      }
    }
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
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Code/terminal style header overlay */}
      <div className="absolute top-0 left-0 w-full px-4 pt-8 z-10 select-none pointer-events-none">
        <div className="text-sm md:text-lg lg:text-2xl text-gray-400 tracking-tight">
          <span className="text-gray-600">function</span> <span className="text-red-500 font-bold">TournamentDetail</span><span className="text-white">(&#123;id&#125;)</span> <span className="text-gray-600">&#123;</span>
                    </div>
                  </div>

      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />

      {/* Main Content */}
      <div className="relative z-20 container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent uppercase">
            {tournament.name}
          </h1>
          <div className="text-center text-gray-400 mb-6 text-base md:text-lg">
            {tournament.description}
                      </div>
                      </div>

        {/* Tournament Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
            <div className="text-red-400 font-bold text-sm mb-2">STATUS</div>
            <div className="text-gray-200 text-lg font-bold capitalize">{tournament.status.replace('-', ' ')}</div>
            <div className="text-gray-400 text-xs mt-1">
              {tournament.status === 'registration-open' && 'Open for team registration'}
              {tournament.status === 'registration-closed' && 'Registration closed'}
              {tournament.status === 'in-progress' && 'Tournament in progress'}
              {tournament.status === 'completed' && 'Tournament completed'}
              {tournament.status === 'group-stage' && 'Group stage in progress'}
              {tournament.status === 'knockout-stage' && 'Knockout stage in progress'}
                    </div>
                  </div>

          <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
            <div className="text-red-400 font-bold text-sm mb-2">TEAMS</div>
            <div className="text-gray-200 text-lg font-bold">
              {tournament.teams?.length || 0} / {tournament.requirements?.maxTeams || 8}
                      </div>
            <div className="text-gray-400 text-xs mt-1">
              {tournament.requirements?.maxTeams || 8} teams maximum
                    </div>
                  </div>

          <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
            <div className="text-red-400 font-bold text-sm mb-2">PRIZE POOL</div>
            <div className="text-gray-200 text-lg font-bold">€{tournament.prizePool?.total || 0}</div>
            <div className="text-gray-400 text-xs mt-1">
              {prizeDistributionText}
                      </div>
                      </div>
                    </div>

        {/* Requirements */}
        <div className="bg-black/60 border border-gray-700 rounded-lg p-4 mb-8">
          <div className="text-red-400 font-bold text-sm mb-3">TOURNAMENT REQUIREMENTS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="text-gray-200 ml-2 capitalize">{tournament.requirements?.format || 'Single Elimination'}</span>
                  </div>
            <div>
              <span className="text-gray-400">Team Size:</span>
              <span className="text-gray-200 ml-2">{tournament.requirements?.teamSize || 5} players</span>
                </div>
            <div>
              <span className="text-gray-400">Max Teams:</span>
              <span className="text-gray-200 ml-2">{tournament.requirements?.maxTeams || 8}</span>
              </div>
            <div>
              <span className="text-gray-400">Skill Level:</span>
              <span className="text-gray-200 ml-2 capitalize">{tournament.requirements?.skillLevel || 'All Levels'}</span>
                    </div>
                  </div>
                </div>

        {/* Signup Section */}
        {canSignupForUser && (
          <div className="bg-black/60 border border-gray-700 rounded-lg p-4 mb-8">
            <div className="text-red-400 font-bold text-sm mb-3">TEAM REGISTRATION</div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-gray-200 mb-1">Your Team: {userTeams[0].name}</div>
                <div className="text-gray-400 text-sm">Click below to register your team for this tournament</div>
                        </div>
                        <button
                onClick={() => handleSignup(userTeams[0].id)}
                disabled={!!signingUp}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg border border-red-800 transition-all duration-200"
              >
                {signingUp ? 'Signing Up...' : 'Sign Up Team'}
                        </button>
                      </div>
                    </div>
                  )}

        {/* Admin Controls */}
        {(() => {
          console.log('Admin Controls Debug - isAdmin:', isAdmin);
          console.log('Admin Controls Debug - tournament.status:', tournament.status);
          console.log('Admin Controls Debug - tournament.type:', tournament.type);
          return isAdmin;
        })() && (
          <div className="bg-black/60 border border-gray-700 rounded-lg p-4 mb-8">
            <div className="text-red-400 font-bold text-sm mb-3">ADMIN CONTROLS</div>
            
            {/* Debug Info - Show on screen */}
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4">
              <div className="text-red-400 font-bold text-xs mb-2">DEBUG INFO</div>
              <div className="text-gray-300 text-xs space-y-1">
                <div>isAdmin: {isAdmin ? 'true' : 'false'}</div>
                <div>tournament.status: {tournament.status}</div>
                <div>tournament.type: {tournament.type || 'undefined'}</div>
                <div>registration-open: {tournament.status === 'registration-open' ? 'true' : 'false'}</div>
                <div>group-stage: {tournament.status === 'group-stage' ? 'true' : 'false'}</div>
                <div>in-progress/knockout: {(tournament.status === 'in-progress' || tournament.status === 'knockout-stage') ? 'true' : 'false'}</div>
                <div>Total matches: {matches.length}</div>
                <div>Completed matches: {matches.filter(m => m.isComplete).length}</div>
                <div>Incomplete matches: {matches.filter(m => !m.isComplete).length}</div>
                <div>Matches with teams: {matches.filter(m => m.team1Id && m.team2Id).length}</div>
                <div>Current round: {matches.length > 0 ? Math.min(...matches.filter(m => !m.isComplete).map(m => m.round)) : 'N/A'}</div>
                        </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Registration Controls */}
              {tournament.status === 'registration-open' && (
                <>
                        <button
                    onClick={handleFillDemoTeams}
                    disabled={starting}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-purple-800 transition-all duration-200 text-sm"
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Fill Demo Teams
                        </button>
                  
                        <button
                    onClick={handleStartGroupStage}
                    disabled={starting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-green-800 transition-all duration-200 text-sm"
                  >
                    <Grid3X3 className="w-4 h-4 inline mr-2" />
                    Start Group Stage
                        </button>
                  
                        <button
                    onClick={handleStartSingleElimination}
                    disabled={starting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-green-800 transition-all duration-200 text-sm"
                  >
                    <Play className="w-4 h-4 inline mr-2" />
                    Start Single Elimination
                        </button>
                </>
              )}
              
              {/* Registration-Closed Controls */}
              {tournament.status === 'registration-closed' && (
                <>
                        <button
                    onClick={handleReopenRegistration}
                    disabled={starting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-blue-800 transition-all duration-200 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Reopen Registration
                        </button>
                        <button
                    onClick={handleStartGroupStage}
                    disabled={starting}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-green-800 transition-all duration-200 text-sm"
                  >
                    <Grid3X3 className="w-4 h-4 inline mr-2" />
                    Start Group Stage
                        </button>
                        <button
                    onClick={handleStartSingleElimination}
                    disabled={starting}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-purple-800 transition-all duration-200 text-sm"
                  >
                    <Play className="w-4 h-4 inline mr-2" />
                    Start Single Elimination
                        </button>
                </>
              )}
              
              {/* Group Stage Controls */}
              {tournament.status === 'group-stage' && (
                <>
                        <button
                    onClick={handleStartKnockoutStage}
                    disabled={starting}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-orange-800 transition-all duration-200 text-sm"
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                          Start Knockout Stage
                        </button>
                </>
              )}
              
              {/* Tournament Progress Controls */}
              {(tournament.status === 'in-progress' || tournament.status === 'knockout-stage') && (
                <>
                        <button
                    onClick={handleRegenerateBracket}
                    disabled={starting}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-yellow-800 transition-all duration-200 text-sm"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Regenerate Bracket
                        </button>
                  
                        <button
                    onClick={handleAutoCompleteCurrentRound}
                    disabled={starting}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm"
                  >
                    <FastForward className="w-4 h-4 inline mr-2" />
                    Auto-Complete Current Round
                        </button>
                </>
              )}
                      </div>
                    </div>
                  )}

        {/* Team Approval Section (for admins) */}
        {/* Removed for now */}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          {[
            { key: 'overview', label: 'OVERVIEW' },
            { key: 'bracket', label: 'BRACKET' },
            { key: 'schedule', label: 'SCHEDULE' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
                activeView === tab.key
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
                        </button>
          ))}
                      </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeView === 'overview' && (
            <div className="space-y-6">
            {/* Registered Teams */}
              <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
                <div className="text-red-400 font-bold text-sm mb-3">REGISTERED TEAMS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournament.teams?.map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    return team ? (
                      <div key={teamId} className="bg-black/40 border border-gray-600 rounded-lg p-3">
                        <div className="text-gray-200 font-bold">{team.name}</div>
                        <div className="text-gray-400 text-xs">{team.members?.length || 0} members</div>
                </div>
                    ) : null;
                  })}
                </div>
                {(!tournament.teams || tournament.teams.length === 0) && (
                  <div className="text-gray-400 text-sm">No teams registered yet</div>
                )}
              </div>
              
              {/* Tournament Progress */}
              {matches.length > 0 && (
                <div className="bg-black/60 border border-gray-700 rounded-lg p-4">
                  <div className="text-red-400 font-bold text-sm mb-3">TOURNAMENT PROGRESS</div>
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
              </div>
            </div>

      {/* Terminal-style footer */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6 z-10 select-none pointer-events-none">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center text-xs text-gray-500 font-mono tracking-tight gap-1 md:gap-0">
          <span>&gt; TOURNAMENT ID: {tournament.id}</span>
          <span className="text-red-500">// bodax.dev/masters</span>
          </div>
      </div>
    </div>
  );
};

export default TournamentDetail; 