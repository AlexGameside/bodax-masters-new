import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, collection, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { handleTeamReadyUp, getMatch, getTeams, getUserTeamForMatch, selectMap, getTeamPlayers, updateTeamActivePlayers, getTeamById, updateMatchState, getUsersByIds } from '../services/firebaseService';
import { SwissTournamentService } from '../services/swissTournamentService';
import { useAuth } from '../hooks/useAuth';
import type { Match, Team, User } from '../types/tournament';
import EnhancedReadyUpModal from '../components/EnhancedReadyUpModal';
import MapBanning from '../components/MapBanning';
import MatchSchedulingInterface from '../components/MatchSchedulingInterface';
import SideSelection from '../components/SideSelection';
import MatchInProgress from '../components/MatchInProgress';
import MatchChat from '../components/MatchChat';
import TicketCreationModal from '../components/TicketCreationModal';
import { ArrowLeft, Trophy, Clock, CheckCircle, User as UserIcon, BarChart3, Target, AlertTriangle, MessageSquare } from 'lucide-react';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

const MatchPage = () => {
  const params = useParams<{ matchId: string }>();
  const { matchId: id } = params;
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyingUp, setReadyingUp] = useState(false);
  const [showReadyUpModal, setShowReadyUpModal] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<User[]>([]);
  const [activePlayers, setActivePlayers] = useState<string[]>([]);
  const [adminReadyUpTeam, setAdminReadyUpTeam] = useState<Team | null>(null);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [team1Players, setTeam1Players] = useState<User[]>([]);
  const [team2Players, setTeam2Players] = useState<User[]>([]);
  const [team1Coach, setTeam1Coach] = useState<User | null>(null);
  const [team2Coach, setTeam2Coach] = useState<User | null>(null);
  const [team1AssistantCoach, setTeam1AssistantCoach] = useState<User | null>(null);
  const [team2AssistantCoach, setTeam2AssistantCoach] = useState<User | null>(null);
  const [countdownTime, setCountdownTime] = useState<string>('');
  const [showDisputeTicketModal, setShowDisputeTicketModal] = useState(false);

  // Countdown timer for scheduled matches
  useEffect(() => {
    if (match?.matchState === 'scheduled' && match?.scheduledTime) {
      const updateCountdown = () => {
        const scheduledTime = match.scheduledTime instanceof Date 
          ? match.scheduledTime 
          : new Date((match.scheduledTime as any).seconds * 1000);
        const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
        const now = new Date();
        
        if (now >= readyUpTime) {
          setCountdownTime('Ready Up Phase Available Now!');
          // Auto-refresh match data to transition to ready_up state
          if (match.matchState === 'scheduled') {
            // Trigger a refresh to get the updated match state
            window.dispatchEvent(new CustomEvent('refreshMatchData'));
          }
        } else {
          const timeUntilReadyUp = readyUpTime.getTime() - now.getTime();
          const hours = Math.floor(timeUntilReadyUp / (1000 * 60 * 60));
          const minutes = Math.floor((timeUntilReadyUp % (1000 * 60 * 60)) / (1000 * 60));
          setCountdownTime(`${hours}h ${minutes}m until Ready Up`);
        }
      };

      // Update immediately
      updateCountdown();
      
      // Update every minute
      const interval = setInterval(updateCountdown, 60000);
      
      return () => clearInterval(interval);
    }
  }, [match?.matchState, match?.scheduledTime]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefreshMatchData = async () => {
      if (match) {
        try {
          // Auto-transition scheduled matches to ready_up if needed
          await SwissTournamentService.autoTransitionScheduledMatches();
          
          // Refresh the match data
          const updatedMatch = await getMatch(match.id);
          if (updatedMatch) {
            setMatch(updatedMatch);
          }
        } catch (error) {

        }
      }
    };

    window.addEventListener('refreshMatchData', handleRefreshMatchData);
    
    return () => {
      window.removeEventListener('refreshMatchData', handleRefreshMatchData);
    };
  }, [match]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadMatchData = async () => {
      const timeoutId = setTimeout(() => {
        toast.error('Loading timeout - please refresh the page');
      }, 10000);

      try {
        setLoading(true);
        
        // Auto-transition scheduled matches to ready_up if needed
        try {
          await SwissTournamentService.autoTransitionScheduledMatches();
        } catch (error) {

        }
        
        const matchData = await getMatch(id);
        
        if (!matchData) {
          toast.error('Match not found');
          navigate('/tournaments');
          return;
        }
        
        setMatch(matchData);

        const matchTeams: Team[] = [];
        
        if (matchData.team1Id) {
          const team1 = await getTeamById(matchData.team1Id);
          if (team1) matchTeams.push(team1);
        }
        
        if (matchData.team2Id) {
          const team2 = await getTeamById(matchData.team2Id);
          if (team2) matchTeams.push(team2);
        }
        
        setTeams(matchTeams);

        if (currentUser) {
          // Always try to get user team, regardless of admin status
          const userTeamData = await getUserTeamForMatch(currentUser.id, matchData);
          setUserTeam(userTeamData);

          if (userTeamData) {
            const players = await getTeamPlayers(userTeamData.id);
            setTeamPlayers(players); // This line is restored
          }
        }

      } catch (error) {
        toast.error('Failed to load match data');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    loadMatchData();

    const matchRef = doc(db, 'matches', id);
    const unsubscribe = onSnapshot(matchRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMatch({
          id: doc.id,
          team1Id: data.team1Id || null,
          team2Id: data.team2Id || null,
          team1Score: data.team1Score || 0,
          team2Score: data.team2Score || 0,
          winnerId: data.winnerId || null,
          isComplete: data.isComplete || false,
          round: data.round || 1,
          matchNumber: data.matchNumber || 1,
          nextMatchId: data.nextMatchId,
          tournamentType: data.tournamentType || 'single-elim',
          bracketType: data.bracketType,
          createdAt: data.createdAt?.toDate() || new Date(),
          matchState: data.matchState || 'ready_up',
          mapPool: data.mapPool || [...DEFAULT_MAP_POOL],
          bannedMaps: data.bannedMaps || { team1: [], team2: [] },
          selectedMap: data.selectedMap,
          team1Ready: data.team1Ready || false,
          team2Ready: data.team2Ready || false,
          team1MapBans: data.team1MapBans || [],
          team2MapBans: data.team2MapBans || [],
          team1MapPick: data.team1MapPick,
          team2MapPick: data.team2MapPick,
          team1Side: data.team1Side,
          team2Side: data.team2Side,
          sideSelection: data.sideSelection || {},
          resultSubmission: data.resultSubmission || {
            team1Submitted: false,
            team2Submitted: false,
            team1SubmittedScore: null,
            team2SubmittedScore: null
          },
          disputeRequested: data.disputeRequested || false,
          disputeReason: data.disputeReason,
          adminAssigned: data.adminAssigned,
          adminResolution: data.adminResolution,
          resolvedAt: data.resolvedAt?.toDate(),
          schedulingProposals: data.schedulingProposals || [],
          currentSchedulingStatus: data.currentSchedulingStatus || 'pending',
          scheduledTime: data.scheduledTime?.toDate() || null,
          // BO3 Map Banning Fields
          map1: data.map1,
          map1Side: data.map1Side,
          map2: data.map2,
          map2Side: data.map2Side,
          deciderMap: data.deciderMap,
          deciderMapSide: data.deciderMapSide,
          mapResults: data.mapResults,
          mapSubmissions: data.mapSubmissions,
          banSequence: data.banSequence,
          currentMap: data.currentMap,
          matchFormat: data.matchFormat,
          team1Roster: data.team1Roster,
          team2Roster: data.team2Roster
        });
      }
    }, (error) => {
    });

    return () => {
      unsubscribe();
    };
  }, [id, currentUser, navigate]);

  // Auto-transition scheduled matches to ready_up when they're ready
  useEffect(() => {
    if (match && (match.tournamentType === 'swiss-round') && match.matchState === 'scheduled') {
      // Check if it's time to transition to ready_up (15 minutes before scheduled time)
      const scheduledTime = match.scheduledTime instanceof Date 
        ? match.scheduledTime 
        : new Date((match.scheduledTime as any).seconds * 1000);
      
      if (scheduledTime) {
        const now = new Date();
        const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
        
        if (now >= readyUpTime) {

          SwissTournamentService.transitionScheduledToReadyUp(match.id);
        }
      }
    }
  }, [match]);

  // Listen for scheduling updates to refresh match data
  useEffect(() => {
    const handleRefreshMatchData = async () => {
      if (match) {
        try {
          const updatedMatch = await getMatch(match.id);
          if (updatedMatch) {
            // Update the match state without full page reload
            setMatch(updatedMatch);
          }
        } catch (error) {

        }
      }
    };

    window.addEventListener('refreshMatchData', handleRefreshMatchData);
    return () => window.removeEventListener('refreshMatchData', handleRefreshMatchData);
  }, [match]);

  const handleReadyUp = async () => {
    if (!match || !currentUser) return;
    
    if (currentUser.isAdmin && !userTeam) {
      setShowTeamSelectionModal(true);
      return;
    }
    
    if (!userTeam) return;
    
    setShowReadyUpModal(true);
  };

  const handleManualTransition = async () => {
    if (!match || !currentUser?.isAdmin) return;
    
    try {
      await SwissTournamentService.adminForceTransitionToReadyUp(match.id);
      toast.success('Match transitioned to ready_up state');
      // Refresh the page to show the new state
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to transition match');
    }
  };

  // Admin debug functions
  const adminSetState = async (state: string) => {
    if (!match || !currentUser?.isAdmin) return;
    try {
      await updateMatchState(match.id, { matchState: state as any });
      toast.success(`Set match state to ${state}`);
      window.location.reload();
    } catch (error: any) {
      toast.error(`Failed to set state: ${error.message}`);
    }
  };

  const adminResetMatch = async () => {
    if (!match || !currentUser?.isAdmin) return;
    try {
      await updateMatchState(match.id, {
        matchState: 'ready_up',
        team1Ready: false,
        team2Ready: false,
        bannedMaps: { team1: [], team2: [] },
        map1: deleteField(),
        map2: deleteField(),
        deciderMap: deleteField()
      } as any);
      toast.success('Match reset to ready_up');
      window.location.reload();
    } catch (error: any) {
      toast.error(`Failed to reset: ${error.message}`);
    }
  };

  const handleSchedulingReadyUp = async (teamId: string, roster: {
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }) => {
    // This will be handled by the MatchSchedulingInterface

  };

  const handleSchedulingStartMatch = async () => {
    // This will be handled by the MatchSchedulingInterface

  };

  const handleMapBanningComplete = async () => {
    if (!match) return;
    
    try {
      // Only transition to playing when ALL maps and sides are selected
      // The individual banMap/selectMap functions handle intermediate state transitions
      await updateMatchState(match.id, { matchState: 'playing' });
      toast.success('All maps and sides selected! Match ready to start!');
      // Refresh the match data
      const updatedMatch = await getMatch(match.id);
      if (updatedMatch) {
        setMatch(updatedMatch);
      }
    } catch (error) {
      toast.error('Failed to complete map banning');
    }
  };

  const getMatchProgress = () => {
    if (!match) return { step: 0, total: 7, label: 'Loading...' };
    
    // Define the correct progression of match states for Swiss system
    const stateProgression = {
      'pending_scheduling': 1,
      'scheduled': 2,
      'ready_up': 3,
      'map_banning': 4,
      'side_selection_map1': 5,
      'side_selection_map2': 5,
      'side_selection_decider': 5,
      'playing': 6,
      'waiting_results': 6,
      'completed': 7,
      'disputed': 6,
      'forfeited': 7
    };
    
    const currentStep = stateProgression[match.matchState] || 1;
    
    const labels = {
      pending_scheduling: 'Scheduling Required',
      scheduled: 'Match Scheduled',
      ready_up: 'Ready Up Phase',
      map_banning: 'Map Banning',
      side_selection_map1: 'Side Selection',
      side_selection_map2: 'Side Selection',
      side_selection_decider: 'Side Selection',
      playing: 'Match in Progress',
      completed: 'Completed',
      disputed: 'Disputed - Needs Admin',
      waiting_results: 'Results Submission',
      forfeited: 'Forfeited',
    };
    
    return {
      step: currentStep,
      total: 7,
      label: labels[match.matchState] || 'Unknown'
    };
  };

  const progress = getMatchProgress();
  const team1 = teams.find(t => t.id === match?.team1Id);
  const team2 = teams.find(t => t.id === match?.team2Id);
  
  const canReadyUp = (userTeam && match?.matchState === 'ready_up' && 
    ((userTeam.id === match.team1Id && !match.team1Ready) || 
     (userTeam.id === match.team2Id && !match.team2Ready))) ||
    (currentUser?.isAdmin && match?.matchState === 'ready_up' && 
     (!match.team1Ready || !match.team2Ready));
  
  const userTeamAlreadyReady = userTeam && 
    ((userTeam.id === match?.team1Id && match?.team1Ready) || 
     (userTeam.id === match?.team2Id && match?.team2Ready));

  // Check if user's team has already ready up
  const userTeamReady = userTeam && 
    ((userTeam.id === match?.team1Id && match?.team1Ready) || 
     (userTeam.id === match?.team2Id && match?.team2Ready));

  const getUserDisplayName = (user: User) => {
    const riot = (user as any)?.riotId;
    if (typeof riot === 'string' && riot.trim() && riot !== 'No Riot ID') return riot;
    // If Riot ID is missing, still show something (but this should be rare after getUsersByIds fallback)
    return user?.username || 'Unknown';
  };

  useEffect(() => {
    const loadTeamPlayers = async () => {
      try {
        const team1Id = match?.team1Id;
        const team2Id = match?.team2Id;
        const liveTeam1 = team1Id ? await getTeamById(team1Id) : null;
        const liveTeam2 = team2Id ? await getTeamById(team2Id) : null;

        // IMPORTANT: Only display the selected ready-up roster (not full team members).
        // If a team hasn't submitted a roster yet, keep roster list empty.
        if (team1) {
          const mainIds: string[] =
            (match?.team1Roster?.mainPlayers && match.team1Roster.mainPlayers.length > 0)
              ? match.team1Roster.mainPlayers
              : (Array.isArray((liveTeam1 as any)?.activePlayers) ? (((liveTeam1 as any).activePlayers as string[])) : []);
          const coachId = match?.team1Roster?.coach;
          const assistantCoachId = match?.team1Roster?.assistantCoach;
          const allIds = [
            ...mainIds,
            ...(coachId ? [coachId] : []),
            ...(assistantCoachId ? [assistantCoachId] : []),
          ];

          if (allIds.length > 0) {
            const uniqueIds = Array.from(new Set(allIds));
            const rosterUsers = await getUsersByIds(uniqueIds);
            const byId = new Map(rosterUsers.map(u => [u.id, u]));

            setTeam1Players(mainIds.map((id: string) => byId.get(id)).filter(Boolean) as User[]);
            setTeam1Coach(coachId ? (byId.get(coachId) as User) || null : null);
            setTeam1AssistantCoach(assistantCoachId ? (byId.get(assistantCoachId) as User) || null : null);
          } else {
            setTeam1Players([]);
            setTeam1Coach(null);
            setTeam1AssistantCoach(null);
          }
        }

        if (team2) {
          const mainIds: string[] =
            (match?.team2Roster?.mainPlayers && match.team2Roster.mainPlayers.length > 0)
              ? match.team2Roster.mainPlayers
              : (Array.isArray((liveTeam2 as any)?.activePlayers) ? (((liveTeam2 as any).activePlayers as string[])) : []);
          const coachId = match?.team2Roster?.coach;
          const assistantCoachId = match?.team2Roster?.assistantCoach;
          const allIds = [
            ...mainIds,
            ...(coachId ? [coachId] : []),
            ...(assistantCoachId ? [assistantCoachId] : []),
          ];

          if (allIds.length > 0) {
            const uniqueIds = Array.from(new Set(allIds));
            const rosterUsers = await getUsersByIds(uniqueIds);
            const byId = new Map(rosterUsers.map(u => [u.id, u]));

            setTeam2Players(mainIds.map((id: string) => byId.get(id)).filter(Boolean) as User[]);
            setTeam2Coach(coachId ? (byId.get(coachId) as User) || null : null);
            setTeam2AssistantCoach(assistantCoachId ? (byId.get(assistantCoachId) as User) || null : null);
          } else {
            setTeam2Players([]);
            setTeam2Coach(null);
            setTeam2AssistantCoach(null);
          }
        }
      } catch (error) {
        console.error('Error loading team players:', error);
        // Keep empty on error to avoid showing full team rosters by accident
        setTeam1Players([]);
        setTeam2Players([]);
        setTeam1Coach(null);
        setTeam2Coach(null);
        setTeam1AssistantCoach(null);
        setTeam2AssistantCoach(null);
      }
    };

    if (team1 || team2) {
      loadTeamPlayers();
    }
  }, [
    team1,
    team2,
    match?.team1Id,
    match?.team2Id,
    match?.matchState,
    match?.team1Roster?.mainPlayers,
    match?.team1Roster?.coach,
    match?.team1Roster?.assistantCoach,
    match?.team2Roster?.mainPlayers,
    match?.team2Roster?.coach,
    match?.team2Roster?.assistantCoach
  ]);

  const bothTeamsReady = match?.team1Ready && match?.team2Ready;
  const shouldShowSelectedRosters =
    match?.matchState !== 'ready_up' &&
    match?.matchState !== 'pending_scheduling' &&
    match?.matchState !== 'scheduled';

  const isLiveMatchView =
    match?.matchState === 'playing' ||
    match?.matchState === 'waiting_results' ||
    match?.matchState === 'disputed';

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Match not found</p>
        </div>
      </div>
    );
  }

  const isBO3Match = match.matchFormat === 'BO3' || match.bracketType === 'grand_final';



  const handleResetMatch = async () => {
    if (!match || !currentUser?.isAdmin) return;
    try {
      await updateMatchState(match.id, {
        matchState: 'pending_scheduling',
        team1Ready: false,
        team2Ready: false,
        team1MapBans: [],
        team2MapBans: [],
        selectedMap: deleteField(),
        team1Side: deleteField(),
        team2Side: deleteField(),
        sideSelection: {},
        resultSubmission: {
          team1Submitted: false,
          team2Submitted: false,
          team1SubmittedScore: 0,
          team2SubmittedScore: 0
        },
        disputeRequested: false,
        disputeReason: '',
        adminAssigned: false,
        adminResolution: '',
        resolvedAt: deleteField(),
        schedulingProposals: [],
        currentSchedulingStatus: 'pending',
        scheduledTime: deleteField()
      } as any);
      toast.success('Match data reset to pending_scheduling state');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset match data');
    }
  };

  const handleClearMapData = async () => {
    if (!match || !currentUser?.isAdmin) return;
    try {
      await updateMatchState(match.id, {
        bannedMaps: { team1: [], team2: [] },
        map1: deleteField(),
        map1Side: deleteField(),
        map2: deleteField(),
        map2Side: deleteField(),
        deciderMap: deleteField(),
        deciderMapSide: deleteField(),
        selectedMap: deleteField(),
        team1Side: deleteField(),
        team2Side: deleteField()
      } as any);
      toast.success('Map banning data cleared');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear map data');
    }
  };

  const handleResetToMapBanning = async () => {
    if (!match || !currentUser?.isAdmin) return;
    try {
      await updateMatchState(match.id, {
        matchState: 'map_banning',
        bannedMaps: { team1: [], team2: [] },
        map1: deleteField(),
        map1Side: deleteField(),
        map2: deleteField(),
        map2Side: deleteField(),
        deciderMap: deleteField(),
        deciderMapSide: deleteField(),
        selectedMap: deleteField(),
        team1Side: deleteField(),
        team2Side: deleteField(),
        team1Ready: true,
        team2Ready: true
      } as any);
      toast.success('Reset to map banning phase');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset to map banning');
    }
  };

  // Check if user is authorized to view this match
  const isUserInMatch = userTeam && (userTeam.id === match.team1Id || userTeam.id === match.team2Id);
  const isAdmin = currentUser?.isAdmin;
  
  if (!isUserInMatch && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-3 font-bodax uppercase tracking-wider">Access Denied</div>
          <div className="text-gray-400 mb-4 font-mono">You are not authorized to view this match</div>
          <div className="text-sm text-gray-500 mb-6">Only match participants and administrators can access this page</div>
          <button
            onClick={() => navigate('/tournaments')}
            className="bg-[#0a0a0a] hover:bg-white/5 text-white px-6 py-2 rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />

      <div className="bg-[#0a0a0a] border-b border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <ArrowLeft className="w-8 h-8" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                    Match #{match.matchNumber}
                  </h1>
                  <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 text-xs font-mono uppercase tracking-widest">
                    {match.tournamentType === 'qualifier' ? 'Qualifier' : 'Finals'}
                  </span>
                </div>
                <p className="text-red-500 font-mono text-sm tracking-widest uppercase mt-1">
                  Round {match.round}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-gray-900/50 border border-gray-800 px-4 py-2">
              <Trophy className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-300 font-mono uppercase tracking-wider">Tournament Match</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Swiss System Match Scheduling */}
        {(match.tournamentType === 'swiss-round') && match.matchState === 'pending_scheduling' && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <MatchSchedulingInterface 
                  match={match}
                  currentTeamId={userTeam?.id || ''}
                  teams={teams}
                  teamPlayers={teamPlayers}
                  isAdmin={currentUser?.isAdmin}
                  onSchedulingUpdate={() => {
                    // Refresh match data after scheduling update without page reload
                    if (match) {
                      // Trigger a re-fetch of the match data
                      window.dispatchEvent(new CustomEvent('refreshMatchData'));
                    }
                  }}
                  onReadyUp={handleSchedulingReadyUp}
                  onStartMatch={handleSchedulingStartMatch}
                />
              </div>
          {/* Hide chat when match is completed */}
              {!match.isComplete && (
                <div>
                  <MatchChat 
                    matchId={match.id} 
                    userTeam={userTeam} 
                    teams={teams} 
                    isAdmin={currentUser?.isAdmin}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Progress */}
        <div className={`bg-[#0a0a0a] border border-gray-800 ${isLiveMatchView ? 'p-4 mb-6' : 'p-6 mb-8'} relative group overflow-hidden`}>
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>

          <div className={`flex items-center justify-between ${isLiveMatchView ? 'mb-4' : 'mb-6'}`}>
            <h2 className={`${isLiveMatchView ? 'text-xl' : 'text-2xl'} font-bold text-white font-bodax tracking-wide uppercase flex items-center`}>
              <BarChart3 className={`${isLiveMatchView ? 'w-5 h-5' : 'w-6 h-6'} mr-3 text-red-500`} />
              Match Progress
            </h2>
            <span className="text-sm text-red-400 font-mono tracking-widest uppercase">{progress.label}</span>
          </div>
          
          <div className="w-full bg-gray-900 h-2 mb-2 overflow-hidden">
            <div 
              className="bg-red-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${(progress.step / progress.total) * 100}%` }}
            ></div>
          </div>
          
          <div className={`flex justify-between text-[10px] text-gray-600 font-mono uppercase tracking-widest mt-3 ${isLiveMatchView ? 'hidden sm:flex' : ''}`}>
            <span>Scheduling</span>
            <span>Scheduled</span>
            <span>Ready Up</span>
            <span>Map Ban</span>
            <span>Side Select</span>
            <span>Playing</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Countdown for Scheduled Matches */}
        {match.matchState === 'scheduled' && match.scheduledTime && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center justify-center">
                <Clock className="w-5 h-5 mr-2" />
                Match Scheduled
              </h3>
              <div className="text-white text-2xl font-bold mb-2">
                {countdownTime}
              </div>
              <div className="text-blue-200 text-lg font-medium mb-2">
                {match.scheduledTime instanceof Date 
                  ? match.scheduledTime.toLocaleString('en-US', { 
                      timeZone: 'Europe/Berlin',
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : new Date((match.scheduledTime as any).seconds * 1000).toLocaleString('en-US', {
                      timeZone: 'Europe/Berlin',
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                }
              </div>
              <p className="text-blue-200 text-sm">
                Ready Up phase begins 15 minutes before the scheduled match time
              </p>
              {currentUser?.isAdmin && (
                <button
                  onClick={handleManualTransition}
                  className="mt-4 px-4 py-2 bg-[#0a0a0a] hover:bg-white/5 text-white rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
                >
                  <Clock className="w-4 h-4 mr-2 inline" />
                  Admin: Start Ready Up Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Compact "Now Playing" header + sidebar rosters handle the live layout */}
        {isLiveMatchView ? (
          <div className="bg-[#0a0a0a] border border-gray-800 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Team 1</div>
                <div className="text-lg font-bodax text-white uppercase tracking-wide truncate">
                  {team1?.name || 'Team 1'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center px-3 py-1 bg-[#050505] border border-gray-800 text-gray-200 font-mono uppercase tracking-widest text-[10px]">
                  {match.matchState.replace(/_/g, ' ')}
                </span>
                {(match.selectedMap || match.map1 || match.map2 || (match as any).deciderMap) && (
                  <span className="inline-flex items-center px-3 py-1 bg-[#050505] border border-gray-800 text-gray-300 font-mono uppercase tracking-widest text-[10px]">
                    Map: {match.selectedMap || match.map1 || match.map2 || (match as any).deciderMap}
                  </span>
                )}
                {match.team1Side && match.team2Side && (
                  <span className="inline-flex items-center px-3 py-1 bg-[#050505] border border-gray-800 text-gray-300 font-mono uppercase tracking-widest text-[10px]">
                    Sides set
                  </span>
                )}
              </div>

              <div className="min-w-0 lg:text-right">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Team 2</div>
                <div className="text-lg font-bodax text-white uppercase tracking-wide truncate">
                  {team2?.name || 'Team 2'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Team 1 Card */}
          <div className="bg-[#0a0a0a] border border-gray-800 p-8 flex flex-col items-center relative hover:border-red-900/50 transition-colors group">
            <div className="text-center w-full">
              <h3 className="text-3xl font-bold text-white mb-2 font-bodax tracking-wide uppercase">{team1?.name || 'Team 1'}</h3>
              <div className="h-px w-16 bg-gray-800 mx-auto mb-6 group-hover:bg-red-900 transition-colors"></div>
              
              <div className="flex items-center justify-center mb-6">
                <div className={`flex items-center space-x-2 px-4 py-2 border ${
                  match.team1Ready 
                    ? 'border-green-900 bg-green-900/10 text-green-500' 
                    : 'border-gray-800 bg-gray-900/50 text-gray-500'
                }`}>
                  {match.team1Ready ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span className="font-mono text-xs uppercase tracking-widest font-bold">
                    {match.team1Ready ? 'READY' : 'NOT READY'}
                  </span>
                </div>
              </div>

              {currentUser?.isAdmin && team1 && (
                <button
                  className="mb-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 font-mono text-xs uppercase tracking-wider transition-colors w-full"
                  onClick={() => {
                    setShowReadyUpModal(true);
                    setAdminReadyUpTeam(team1);
                  }}
                >
                  Admin: Force Ready Up
                </button>
              )}
              
              {shouldShowSelectedRosters && team1Players.length > 0 && (
                <div className="mt-6 w-full text-left">
                  <h4 className="text-xs font-bold text-red-500 mb-3 font-mono uppercase tracking-widest flex items-center border-b border-gray-900 pb-2">
                    <UserIcon className="w-3 h-3 mr-2" />
                    Selected Roster
                  </h4>
                  <div className="space-y-2">
                    {team1Players.map((player, index) => (
                      <div key={index} className="text-sm text-gray-400 font-mono bg-gray-900/30 px-3 py-2 border-l-2 border-gray-800 hover:border-red-900 hover:text-white transition-colors">
                        {getUserDisplayName(player)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Status */}
          <div className="bg-[#0a0a0a] border border-gray-800 p-6 flex flex-col justify-center relative">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-4 font-bodax tracking-wide uppercase border-b border-gray-800 pb-4">Match Status</h3>
              
              <div className="mb-6">
                <span className={`inline-block px-4 py-2 text-sm font-bold font-mono uppercase tracking-widest border ${
                  match.matchState === 'playing' ? 'text-green-500 border-green-900 bg-green-900/10' :
                  match.matchState === 'completed' ? 'text-gray-400 border-gray-700 bg-gray-800' :
                  match.matchState === 'disputed' ? 'text-red-500 border-red-900 bg-red-900/10' :
                  'text-yellow-500 border-yellow-900 bg-yellow-900/10'
                }`}>
                  {match.matchState.replace(/_/g, ' ')}
                </span>
              </div>
              
              {/* Dispute Ticket Creation Button */}
              {match.matchState === 'disputed' && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowDisputeTicketModal(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors flex items-center mx-auto"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Create Dispute Ticket
                  </button>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Report this dispute to support staff
                  </p>
                  <div className="mt-2 text-center">
                    <a 
                      href="https://discord.gg/ewAk7wBgHT" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Need help? Join our Discord
                    </a>
                  </div>
                </div>
              )}
              
              {/* Admin: Manual Transition Button */}
              {currentUser?.isAdmin && match.matchState === 'scheduled' && match.scheduledTime && (
                <div className="mb-4">
                  <button
                    onClick={handleManualTransition}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors flex items-center mx-auto"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Admin: Start Ready Up Phase
                  </button>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Force transition to ready-up phase
                  </p>
                </div>
              )}
              
              {match.selectedMap && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Selected Map</h4>
                  <span className="text-lg font-semibold text-green-400">{match.selectedMap}</span>
                </div>
              )}
              
              {match.team1Side && match.team2Side && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center justify-center">
                    <Target className="w-4 h-4 mr-2" />
                    Match Sides
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-red-900/20 border border-red-500/30 rounded">
                      <div className="text-sm text-red-300 font-medium">{team1?.name}</div>
                      <div className={`text-lg font-bold ${match.team1Side === 'attack' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {match.team1Side === 'attack' ? 'ATTACK' : 'DEFENSE'}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-blue-900/20 border border-blue-500/30 rounded">
                      <div className="text-sm text-blue-300 font-medium">{team2?.name}</div>
                      <div className={`text-lg font-bold ${match.team2Side === 'attack' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {match.team2Side === 'attack' ? 'ATTACK' : 'DEFENSE'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Team 2 Card */}
          <div className="bg-[#0a0a0a] border border-gray-800 p-8 flex flex-col items-center relative hover:border-red-900/50 transition-colors group">
            <div className="text-center w-full">
              <h3 className="text-3xl font-bold text-white mb-2 font-bodax tracking-wide uppercase">{team2?.name || 'Team 2'}</h3>
              <div className="h-px w-16 bg-gray-800 mx-auto mb-6 group-hover:bg-red-900 transition-colors"></div>
              
              <div className="flex items-center justify-center mb-6">
                <div className={`flex items-center space-x-2 px-4 py-2 border ${
                  match.team2Ready 
                    ? 'border-green-900 bg-green-900/10 text-green-500' 
                    : 'border-gray-800 bg-gray-900/50 text-gray-500'
                }`}>
                  {match.team2Ready ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span className="font-mono text-xs uppercase tracking-widest font-bold">
                    {match.team2Ready ? 'READY' : 'NOT READY'}
                  </span>
                </div>
              </div>

              {currentUser?.isAdmin && team2 && (
                <button
                  className="mb-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 font-mono text-xs uppercase tracking-wider transition-colors w-full"
                  onClick={() => {
                    setShowReadyUpModal(true);
                    setAdminReadyUpTeam(team2);
                  }}
                >
                  Admin: Force Ready Up
                </button>
              )}
              
              {shouldShowSelectedRosters && team2Players.length > 0 && (
                <div className="mt-6 w-full text-left">
                  <h4 className="text-xs font-bold text-red-500 mb-3 font-mono uppercase tracking-widest flex items-center border-b border-gray-900 pb-2">
                    <UserIcon className="w-3 h-3 mr-2" />
                    Selected Roster
                  </h4>
                  <div className="space-y-2">
                    {team2Players.map((player, index) => (
                      <div key={index} className="text-sm text-gray-400 font-mono bg-gray-900/30 px-3 py-2 border-l-2 border-gray-800 hover:border-red-900 hover:text-white transition-colors">
                        {getUserDisplayName(player)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {match.matchState === 'ready_up' && (
          <div className="bg-[#050505] border border-gray-800 rounded-lg p-8 mb-6">
            <div className="text-center">
              <h2 className="text-3xl font-bodax text-white uppercase tracking-wider mb-3">Ready Up</h2>
              <p className="text-gray-400 font-mono text-sm mb-6">
                Both teams need to ready up before the match can begin. 
                Select your 5 active players and ready up to start the match.
              </p>
              
              {canReadyUp && !userTeamReady ? (
                <button
                  onClick={handleReadyUp}
                  disabled={readyingUp}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 px-8 py-3 rounded text-white font-mono uppercase tracking-widest text-xs transition-colors inline-flex items-center justify-center border border-green-900 disabled:border-gray-700"
                >
                  {readyingUp ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Ready Up...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {currentUser?.isAdmin && !userTeam ? 'Admin: Select Team & Ready Up' : 'Select Players & Ready Up'}
                    </>
                  )}
                </button>
              ) : userTeamAlreadyReady ? (
                <div className="flex items-center justify-center text-green-400">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  <span className="font-semibold">You are ready!</span>
                </div>
              ) : !userTeam && !currentUser?.isAdmin ? (
                <p className="text-gray-400">Your team is not in this match</p>
              ) : currentUser?.isAdmin && !userTeam ? (
                <div className="space-y-4">
                  <p className="text-blue-400 font-medium">Admin Controls</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {team1 && !match.team1Ready && (
                      <button
                        onClick={async () => {
                          try {
                            setAdminReadyUpTeam(team1);
                            setShowReadyUpModal(true);
                          } catch (error) {
                            toast.error('Failed to load team players');
                          }
                        }}
                        className="px-4 py-2 bg-[#0a0a0a] hover:bg-white/5 text-white rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
                      >
                        Admin: Ready Up {team1.name}
                      </button>
                    )}
                    {team2 && !match.team2Ready && (
                      <button
                        onClick={async () => {
                          try {
                            setAdminReadyUpTeam(team2);
                            setShowReadyUpModal(true);
                          } catch (error) {
                            toast.error('Failed to load team players');
                          }
                        }}
                        className="px-4 py-2 bg-[#0a0a0a] hover:bg-white/5 text-white rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
                      >
                        Admin: Ready Up {team2.name}
                      </button>
                    )}
                  </div>
                  {match.team1Ready && match.team2Ready && (
                    <p className="text-green-400 text-sm">Both teams are ready!</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Waiting for both teams to ready up...</p>
              )}
            </div>
          </div>
        )}

        {/* Main Grid - Show for all states except pending_scheduling */}
        {!(match.tournamentType === 'swiss-round' && match.matchState === 'pending_scheduling') && (
          <div
            className={`grid grid-cols-1 gap-6 mb-6 ${
              match.matchState === 'completed' && match.isComplete
                ? 'lg:grid-cols-1'
                : isLiveMatchView
                ? 'lg:grid-cols-12'
                : 'lg:grid-cols-4'
            }`}
          >
            {isLiveMatchView ? (
              <>
                {/* Live match: main actions + chat on the left */}
                <div className="lg:col-span-8 space-y-6">
                  {(match.matchState === 'playing' || match.matchState === 'waiting_results' || match.matchState === 'disputed') && (
                    <div className="bg-[#050505] border border-gray-800 rounded-lg p-4">
                      <MatchInProgress
                        match={match}
                        teams={teams}
                        currentUserTeamId={userTeam?.id}
                      />
                    </div>
                  )}

                  {/* Chat belongs to the live match flow */}
                  {!(match.matchState === 'completed' && match.isComplete) && (
                    <div className="bg-[#050505] border border-gray-800 rounded-lg p-4">
                      <MatchChat 
                        matchId={match.id} 
                        userTeam={userTeam} 
                        teams={teams} 
                        isAdmin={currentUser?.isAdmin}
                      />
                    </div>
                  )}
                </div>

                {/* Live match: rosters on the right */}
                {!(match.matchState === 'completed' && match.isComplete) && (
                  <div className="lg:col-span-4">
                    <div className="bg-[#050505] border border-gray-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Match Rosters</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-gray-600">5 + Coach</div>
                      </div>

                      <div className="p-3 space-y-3">
                        {[
                          {
                            teamName: team1?.name || 'Team 1',
                            players: team1Players.slice(0, 5),
                            coach: team1Coach,
                            assistant: team1AssistantCoach
                          },
                          {
                            teamName: team2?.name || 'Team 2',
                            players: team2Players.slice(0, 5),
                            coach: team2Coach,
                            assistant: team2AssistantCoach
                          }
                        ].map((block, blockIdx) => (
                          <div key={blockIdx} className="bg-black/20 border border-gray-800 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 border-b border-gray-800">
                              <div className="text-white font-bodax uppercase tracking-wide text-sm truncate">
                                {block.teamName}
                              </div>
                            </div>

                            <div className="p-3">
                              {block.players.length > 0 ? (
                                <div className="space-y-1">
                                  {block.players.map((p, idx) => (
                                    <div
                                      key={p.id || idx}
                                      className="grid grid-cols-[18px,1fr] items-center gap-2 px-2 py-1 rounded bg-[#0a0a0a]/60 border border-gray-900 hover:border-gray-700 transition-colors"
                                    >
                                      <div className="text-gray-600 font-mono text-xs">{idx + 1}</div>
                                      <div className="min-w-0 text-gray-200 font-mono text-xs truncate">
                                        {getUserDisplayName(p)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs font-mono text-gray-500">No roster submitted yet</div>
                              )}

                              {(block.coach || block.assistant) && (
                                <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
                                  {block.coach && (
                                    <div className="grid grid-cols-[52px,1fr] items-center gap-2">
                                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Coach</div>
                                      <div className="min-w-0 text-gray-300 font-mono text-xs truncate">
                                        {getUserDisplayName(block.coach)}
                                      </div>
                                    </div>
                                  )}
                                  {block.assistant && (
                                    <div className="grid grid-cols-[52px,1fr] items-center gap-2">
                                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Asst</div>
                                      <div className="min-w-0 text-gray-300 font-mono text-xs truncate">
                                        {getUserDisplayName(block.assistant)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Non-live match states: keep existing layout with chat on the right */}
                <div
                  className={
                    match.matchState === 'completed' && match.isComplete
                      ? 'lg:col-span-1'
                      : 'lg:col-span-3'
                  }
                >
                  {(match.matchState === 'completed' && match.isComplete) && (
                    <div className="bg-[#050505] border border-gray-800 rounded-lg p-4">
                      <MatchInProgress
                        match={match}
                        teams={teams}
                        currentUserTeamId={userTeam?.id}
                      />
                    </div>
                  )}

                  {match.matchState === 'map_banning' && (
                    <div className="bg-[#050505] border border-gray-800 rounded-lg p-6">
                      <MapBanning
                        match={match}
                        userTeam={userTeam}
                        team1={team1}
                        team2={team2}
                        isAdmin={!!currentUser?.isAdmin}
                        currentUserId={currentUser?.id}
                        onMapBanningComplete={handleMapBanningComplete}
                      />
                    </div>
                  )}

                  {(match.matchState === 'side_selection_map1' || match.matchState === 'side_selection_map2' || match.matchState === 'side_selection_decider') && (
                    <div className="bg-[#050505] border border-gray-800 rounded-lg p-6">
                      <SideSelection
                        match={match}
                        teams={teams}
                        currentUserTeamId={userTeam?.id}
                        onSideSelectionComplete={async () => {
                          try {
                            const updatedMatch = await getMatch(match.id);
                            if (updatedMatch) {
                              setMatch(updatedMatch);
                              toast.success('Match is now starting!');
                            }
                          } catch (error) {}
                        }}
                      />
                    </div>
                  )}

                  {/* Post-match analytics removed (Riot API testing disabled) */}
                </div>

                {!(match.matchState === 'completed' && match.isComplete) && (
                  <div className="lg:col-span-1">
                    <MatchChat 
                      matchId={match.id} 
                      userTeam={userTeam} 
                      teams={teams} 
                      isAdmin={currentUser?.isAdmin}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {showReadyUpModal && (adminReadyUpTeam || userTeam) && (
        <EnhancedReadyUpModal
          isOpen={true}
          onClose={() => {
            setShowReadyUpModal(false);
            setAdminReadyUpTeam(null);
          }}
          match={match}
          team={adminReadyUpTeam || userTeam!}
          currentUser={currentUser!}
          onReadyUp={async (roster) => {
            try {
              setReadyingUp(true);
              console.log('[MatchPage][ReadyUp] start', {
                matchId: match?.id,
                matchState: match?.matchState,
                userId: currentUser?.id,
                isAdmin: !!currentUser?.isAdmin,
                roster: {
                  mainPlayersCount: roster?.mainPlayers?.length,
                  coach: roster?.coach,
                  assistantCoach: roster?.assistantCoach
                }
              });
              
              let targetTeam: Team | null = userTeam;
              
              if (currentUser?.isAdmin && adminReadyUpTeam) {
                targetTeam = adminReadyUpTeam;
              }
              
              if (!targetTeam) {
                toast.error('No team selected for ready-up');
                return;
              }
              
              // Persist the exact selected roster (5 mains + optional coach/assistant coach) onto the match.
              // This is what the live match page uses to display rosters.
              try {
                const rosterPatch: any = {
                  mainPlayers: roster.mainPlayers
                };
                rosterPatch.coach = roster.coach ? roster.coach : deleteField();
                rosterPatch.assistantCoach = roster.assistantCoach ? roster.assistantCoach : deleteField();

                if (match!.team1Id === targetTeam.id) {
                  console.log('[MatchPage][ReadyUp] writing team1Roster', rosterPatch);
                  await updateMatchState(match!.id, { team1Roster: rosterPatch } as any);
                } else if (match!.team2Id === targetTeam.id) {
                  console.log('[MatchPage][ReadyUp] writing team2Roster', rosterPatch);
                  await updateMatchState(match!.id, { team2Roster: rosterPatch } as any);
                } else {
                  console.warn('[MatchPage][ReadyUp] targetTeam is not team1/team2 for this match', {
                    targetTeamId: targetTeam.id,
                    team1Id: match?.team1Id,
                    team2Id: match?.team2Id
                  });
                }
              } catch (e: any) {
                // Don't block ready-up if roster write is blocked by rules; we can still display via team.activePlayers fallback.
                console.warn('[MatchPage][ReadyUp] roster write failed (continuing)', e);
              }

              console.log('[MatchPage][ReadyUp] updateTeamActivePlayers', { teamId: targetTeam.id, mains: roster.mainPlayers });
              await updateTeamActivePlayers(targetTeam.id, roster.mainPlayers);

              console.log('[MatchPage][ReadyUp] handleTeamReadyUp', { matchId: match!.id, teamId: targetTeam.id });
              await handleTeamReadyUp(match!.id, targetTeam.id);

              // Optimistic local update so roster sidebar populates immediately without waiting for a refetch.
              setTeams(prev =>
                prev.map(t => (t.id === targetTeam!.id ? ({ ...t, activePlayers: roster.mainPlayers } as any) : t))
              );
              
              setActivePlayers(roster.mainPlayers);
              setShowReadyUpModal(false);
              setAdminReadyUpTeam(null);
              toast.success('Team is ready!');
              
            } catch (error: any) {
              console.error('[MatchPage][ReadyUp] failed', error);
              const msg =
                error?.message ||
                error?.code ||
                (typeof error === 'string' ? error : null) ||
                'Failed to ready up';
              toast.error(msg);
            } finally {
              setReadyingUp(false);
            }
          }}
        />
      )}

      {showTeamSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#050505] border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-2xl font-bodax text-white uppercase tracking-wider mb-2">Select Team</h3>
              <p className="text-gray-400 font-mono text-sm mb-6">Choose which team you want to ready up as admin.</p>
              
              <div className="space-y-3">
                {team1 && !match.team1Ready && (
                  <button
                    onClick={async () => {
                      try {
                        setShowTeamSelectionModal(false);
                        setAdminReadyUpTeam(team1);
                        setShowReadyUpModal(true);
                      } catch (error) {
                        toast.error('Failed to load team players');
                      }
                    }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] hover:bg-white/5 text-white rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
                  >
                    Ready Up {team1.name}
                  </button>
                )}
                
                {team2 && !match.team2Ready && (
                  <button
                    onClick={async () => {
                      try {
                        setShowTeamSelectionModal(false);
                        setAdminReadyUpTeam(team2);
                        setShowReadyUpModal(true);
                      } catch (error) {
                        toast.error('Failed to load team players');
                      }
                    }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] hover:bg-white/5 text-white rounded font-mono uppercase tracking-widest text-xs transition-colors border border-gray-700 hover:border-gray-500"
                  >
                    Ready Up {team2.name}
                  </button>
                )}
                
                {match.team1Ready && match.team2Ready && (
                  <p className="text-gray-400">Both teams are already ready!</p>
                )}
              </div>
              
              <button
                onClick={() => setShowTeamSelectionModal(false)}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Debug Controls */}
      {currentUser?.isAdmin && match && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center">
            🔧 Admin Debug Controls
          </h3>
          <p className="text-red-200 text-sm mb-4">
            Use these buttons to manually transition between match states for testing purposes.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => adminSetState('pending_scheduling')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'pending_scheduling' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Scheduling
            </button>
            
            <button
              onClick={() => adminSetState('scheduled')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'scheduled' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Scheduled
            </button>
            
            <button
              onClick={() => adminSetState('ready_up')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'ready_up' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Ready Up
            </button>
            
            <button
              onClick={() => adminSetState('map_banning')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'map_banning' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Map Banning
            </button>
            
            <button
              onClick={() => adminSetState('side_selection_map1')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'side_selection_map1' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Side Select 1
            </button>
            
            <button
              onClick={() => adminSetState('side_selection_map2')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'side_selection_map2' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Side Select 2
            </button>
            
            <button
              onClick={() => adminSetState('side_selection_decider')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'side_selection_decider' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Side Select Decider
            </button>
            
            <button
              onClick={() => adminSetState('playing')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'playing' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Playing
            </button>
            
            <button
              onClick={() => adminSetState('waiting_results')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'waiting_results' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Waiting Results
            </button>
            
            <button
              onClick={() => adminSetState('disputed')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'disputed' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Disputed
            </button>
            
            <button
              onClick={() => adminSetState('completed')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'completed' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Completed
            </button>
            
            <button
              onClick={() => adminSetState('forfeited')}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                match.matchState === 'forfeited' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Forfeited
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-red-700">
            <h4 className="text-red-300 font-medium mb-2">Quick Actions:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetMatch}
                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs transition-colors"
              >
                🔄 Reset Match Data
              </button>
              
              <button
                onClick={handleClearMapData}
                className="px-3 py-1 bg-[#0a0a0a] hover:bg-white/5 text-white rounded text-xs transition-colors border border-red-700/40 hover:border-red-600"
              >
                🗺️ Clear Map Data
              </button>

              <button
                onClick={handleResetToMapBanning}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs transition-colors"
              >
                🔄 Reset to Map Banning
              </button>
              
              <button
                onClick={() => {

                  toast.success('Match data logged to console');
                }}
                className="px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs transition-colors"
              >
                📝 Log Match Data
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Dispute Ticket Creation Modal */}
      {match && (
        <TicketCreationModal
          isOpen={showDisputeTicketModal}
          onClose={() => setShowDisputeTicketModal(false)}
          currentUser={currentUser}
          matchInfo={{
            team1: teams.find(t => t.id === match.team1Id)?.name || 'Team 1',
            team2: teams.find(t => t.id === match.team2Id)?.name || 'Team 2',
            map: match.selectedMap,
            phase: match.matchState
          }}
          initialType="dispute"
        />
      )}
    </div>
  );
};

export default MatchPage; 