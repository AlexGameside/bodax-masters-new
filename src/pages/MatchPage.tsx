import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, collection, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { handleTeamReadyUp, getMatch, getTeams, getUserTeamForMatch, selectMap, getTeamPlayers, updateTeamActivePlayers, getTeamById, updateMatchState } from '../services/firebaseService';
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
import { ArrowLeft, Trophy, Clock, CheckCircle, User as UserIcon, BarChart3, Target, AlertTriangle } from 'lucide-react';

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
          console.warn('Failed to refresh match data:', error);
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
          console.warn('Failed to auto-transition matches:', error);
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
          console.log('MatchPage Debug - getUserTeamForMatch result:', {
            userId: currentUser.id,
            matchId: matchData.id,
            team1Id: matchData.team1Id,
            team2Id: matchData.team2Id,
            userTeamData: userTeamData ? { id: userTeamData.id, name: userTeamData.name } : null,
            isAdmin: currentUser.isAdmin
          });
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
          mapPool: data.mapPool || ['Corrode', 'Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset'],
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
          scheduledTime: data.scheduledTime?.toDate() || null
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
    if (match && match.tournamentType === 'swiss-round' && match.matchState === 'scheduled') {
      // Check if it's time to transition to ready_up (15 minutes before scheduled time)
      const scheduledTime = match.scheduledTime instanceof Date 
        ? match.scheduledTime 
        : new Date((match.scheduledTime as any).seconds * 1000);
      
      if (scheduledTime) {
        const now = new Date();
        const readyUpTime = new Date(scheduledTime.getTime() - (15 * 60 * 1000));
        
        if (now >= readyUpTime) {
          console.log('⏰ Match ready to transition to ready_up');
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
          console.error('Failed to refresh match data:', error);
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
    console.log('Ready up from scheduling:', teamId, roster);
  };

  const handleSchedulingStartMatch = async () => {
    // This will be handled by the MatchSchedulingInterface
    console.log('Start match from scheduling');
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
    if (!match) return { step: 0, total: 6, label: 'Loading...' };
    
    // Define the correct progression of match states
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
      'completed': 6,
      'disputed': 5,
      'forfeited': 6
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
      total: 6,
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

  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (team1) {
        const players = await getTeamPlayers(team1.id);
        setTeam1Players(players);
      }
      if (team2) {
        const players = await getTeamPlayers(team2.id);
        setTeam2Players(players);
      }
    };

    if (team1 || team2) {
      loadTeamPlayers();
    }
  }, [team1, team2]);

  const bothTeamsReady = match?.team1Ready && match?.team2Ready;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Match not found</p>
        </div>
      </div>
    );
  }



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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Match #{match.matchNumber}</h1>
                <p className="text-sm text-gray-400">
                  Round {match.round} • {match.tournamentType === 'qualifier' ? 'Qualifier' : 'Final Event'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-300">Tournament Match</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Swiss System Match Scheduling */}
        {match.tournamentType === 'swiss-round' && match.matchState === 'pending_scheduling' && (
          <div className="unity-card-cyan mb-8">
            <div className="text-cyan-400 font-bold text-xl mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3" />
              MATCH SCHEDULING REQUIRED
            </div>
            <div className="text-cyan-200 text-base mb-6 leading-relaxed">
              This Swiss system match needs to be scheduled before it can begin. Teams must agree on a match time within the allowed timeframe.
            </div>
            
            {/* Timeframe Information */}
            <div className="bg-black/40 border border-cyan-400/30 rounded-xl p-6 mb-6 backdrop-blur-sm">
              <div className="text-cyan-300 font-bold text-lg mb-3 flex items-center">
                ⏰ SCHEDULING TIMEFRAME
              </div>
              <div className="text-cyan-200 text-sm space-y-2">
                <div>• Matchday {match.matchday} runs for 7 days</div>
                <div>• Teams must schedule within this timeframe</div>
                <div>• After scheduling deadline, admin can auto-schedule</div>
                <div>• Once scheduled, match can proceed to Ready Up phase</div>
              </div>
            </div>
            
            <div className="bg-black/40 border border-cyan-400/30 rounded-xl p-6 backdrop-blur-sm">
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
          </div>
        )}

        {/* Match Progress */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
              Match Progress
            </h2>
            <span className="text-sm text-gray-300">{progress.label}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(progress.step / progress.total) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Ready Up</span>
            <span>Map Banning</span>
            <span>Side Selection</span>
            <span>Playing</span>
            <span>Results</span>
            <span>Completed</span>
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
              <p className="text-blue-200 text-sm">
                Ready Up phase begins 15 minutes before the scheduled match time
              </p>
              {currentUser?.isAdmin && (
                <button
                  onClick={handleManualTransition}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Clock className="w-4 h-4 mr-2 inline" />
                  Admin: Start Ready Up Now
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">{team1?.name || 'Team 1'}</h3>
              <div className="flex items-center justify-center mb-3">
                {match.team1Ready ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-500 mr-2" />
                )}
                <span className={`text-sm ${match.team1Ready ? 'text-green-400' : 'text-gray-400'}`}>
                  {match.team1Ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
              {currentUser?.isAdmin && team1 && team1Players.length > 0 && (
                <button
                  className="mt-2 mb-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                  onClick={() => {
                    setShowReadyUpModal(true);
                    setAdminReadyUpTeam(team1);
                  }}
                >
                  Admin: Force Ready Up & Select Players
                </button>
              )}
              
              {bothTeamsReady && team1Players.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    Riot Names
                  </h4>
                  <div className="space-y-1">
                    {team1Players.map((player, index) => (
                      <div key={index} className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded">
                        {player.riotId || player.username}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Match Status</h3>
              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  match.matchState === 'pending_scheduling' ? 'bg-yellow-900 text-yellow-200' :
                  match.matchState === 'scheduled' ? 'bg-blue-900 text-blue-200' :
                  match.matchState === 'ready_up' ? 'bg-yellow-900 text-yellow-200' :
                  match.matchState === 'map_banning' ? 'bg-blue-900 text-blue-200' :
                  match.matchState === 'side_selection_map1' ? 'bg-purple-900 text-purple-200' :
                  match.matchState === 'side_selection_map2' ? 'bg-purple-900 text-purple-200' :
                  match.matchState === 'side_selection_decider' ? 'bg-purple-900 text-purple-200' :
                  match.matchState === 'playing' ? 'bg-green-900 text-green-200' :
                  match.matchState === 'waiting_results' ? 'bg-yellow-900 text-yellow-200' :
                  match.matchState === 'disputed' ? 'bg-red-900 text-red-200' :
                  'bg-gray-700 text-gray-200'
                }`}>
                  {match.matchState === 'pending_scheduling' ? 'Scheduling Required' :
                   match.matchState === 'scheduled' ? 'Match Scheduled' :
                   match.matchState === 'ready_up' ? 'Ready Up Phase' :
                   match.matchState === 'map_banning' ? 'Map Banning' :
                   match.matchState === 'side_selection_map1' ? 'Map 1 Side Selection' :
                   match.matchState === 'side_selection_map2' ? 'Map 2 Side Selection' :
                   match.matchState === 'side_selection_decider' ? 'Decider Side Selection' :
                   match.matchState === 'playing' ? 'Match in Progress' :
                   match.matchState === 'waiting_results' ? 'Results Submission' :
                   match.matchState === 'disputed' ? 'Disputed - Needs Admin' :
                   'Completed'}
                </span>
              </div>
              
              {/* Dispute Ticket Creation Button */}
              {match.matchState === 'disputed' && currentUser?.discordLinked && (
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

          <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">{team2?.name || 'Team 2'}</h3>
              <div className="flex items-center justify-center mb-3">
                {match.team2Ready ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-500 mr-2" />
                )}
                <span className={`text-sm ${match.team2Ready ? 'text-green-400' : 'text-gray-400'}`}>
                  {match.team2Ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
              {currentUser?.isAdmin && team2 && team2Players.length > 0 && (
                <button
                  className="mt-2 mb-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                  onClick={() => {
                    setShowReadyUpModal(true);
                    setAdminReadyUpTeam(team2);
                  }}
                >
                  Admin: Force Ready Up & Select Players
                </button>
              )}
              
              {bothTeamsReady && team2Players.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    Riot Names
                  </h4>
                  <div className="space-y-1">
                    {team2Players.map((player, index) => (
                      <div key={index} className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded">
                        {player.riotId || player.username}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {match.matchState === 'ready_up' && (
          <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">Ready Up</h2>
              <p className="text-gray-300 mb-6">
                Both teams need to ready up before the match can begin. 
                Select your 5 active players and ready up to start the match.
              </p>
              
              {canReadyUp ? (
                <button
                  onClick={handleReadyUp}
                  disabled={readyingUp}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 px-8 py-3 rounded-lg text-white font-semibold transition-colors flex items-center mx-auto"
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
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors text-sm"
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
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors text-sm"
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            {match.matchState === 'map_banning' && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
                <MapBanning
                  match={match}
                  userTeam={userTeam}
                  team1={team1}
                  team2={team2}
                  onMapBanningComplete={handleMapBanningComplete}
                />
              </div>
            )}

            {(match.matchState === 'side_selection_map1' || match.matchState === 'side_selection_map2' || match.matchState === 'side_selection_decider') && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
                <SideSelection
                  match={match}
                  teams={teams}
                  currentUserTeamId={userTeam?.id}
                />
              </div>
            )}

            {(match.matchState === 'playing' || match.matchState === 'waiting_results' || match.matchState === 'disputed') && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
                <MatchInProgress
                  match={match}
                  teams={teams}
                  currentUserTeamId={userTeam?.id}
                />
              </div>
            )}

            {(match.matchState === 'completed' || match.matchState === 'forfeited') && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
                {/* Match Completed Status */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="bg-green-500 p-3 rounded-lg">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {match.matchState === 'completed' ? 'Match Completed' : 'Match Forfeited'}
                      </h3>
                      <p className="text-gray-300">
                        {match.matchState === 'completed' ? 'Results have been submitted and confirmed' : 'Match ended due to forfeit'}
                      </p>
                    </div>
                  </div>

                  {/* Final Score Display */}
                  {match.isComplete && (
                    <div className="bg-gray-700/40 rounded-lg p-4 mb-6">
                      <h4 className="text-white font-bold mb-3">Final Score</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="text-lg">
                          <div className="text-gray-300">{team1?.name}</div>
                          <div className="text-2xl font-bold text-white">{match.team1Score}</div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="text-2xl font-bold text-gray-400">-</div>
                        </div>
                        <div className="text-lg">
                          <div className="text-gray-300">{team2?.name}</div>
                          <div className="text-2xl font-bold text-white">{match.team2Score}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BO3 Maps & Sides Display for Completed Match */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h4 className="text-white font-bold mb-4 text-center flex items-center justify-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>🗺️ BO3 Maps & Sides</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Map 1 */}
                    <div className={`p-4 rounded-lg border ${
                      match.map1 && match.map1Side 
                        ? 'bg-green-600/10 border-green-500/30' 
                        : 'bg-gray-700/20 border-gray-600/30'
                    }`}>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-2">Map 1</div>
                        <div className="text-white font-bold text-lg mb-2">
                          {match.map1 || 'Not Selected'}
                        </div>
                        {match.map1Side && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-300 mb-1">Team B picked side:</div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              match.map1Side === 'attack' 
                                ? 'bg-red-500/20 text-red-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {match.map1Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Map 2 */}
                    <div className={`p-4 rounded-lg border ${
                      match.map2 && match.map2Side 
                        ? 'bg-green-600/10 border-green-500/30' 
                        : 'bg-gray-700/20 border-gray-600/30'
                    }`}>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-2">Map 2</div>
                        <div className="text-white font-bold text-lg mb-2">
                          {match.map2 || 'Not Selected'}
                        </div>
                        {match.map2Side && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-300 mb-1">Team A picked side:</div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              match.map2Side === 'attack' 
                                ? 'bg-red-500/20 text-red-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {match.map2Side === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decider Map */}
                    <div className={`p-4 rounded-lg border ${
                      match.deciderMap && match.deciderMapSide 
                        ? 'bg-green-600/10 border-green-500/30' 
                        : 'bg-gray-700/20 border-gray-600/30'
                    }`}>
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-2">Decider</div>
                        <div className="text-white font-bold text-lg mb-2">
                          {match.deciderMap || 'Not Selected'}
                        </div>
                        {match.deciderMapSide && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-300 mb-1">Team A picked side:</div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              match.deciderMapSide === 'attack' 
                                ? 'bg-red-500/20 text-red-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {match.deciderMapSide === 'attack' ? '⚔️ ATTACK' : '🛡️ DEFENSE'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team Names Legend */}
                  {(match.map1Side || match.map2Side || match.deciderMapSide) && (
                    <div className="mt-4 pt-3 border-t border-gray-700/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-700/40 p-3 rounded-lg text-center">
                          <div className="font-semibold text-white mb-1">Team A</div>
                          <div className="text-gray-300">{team1?.name}</div>
                        </div>
                        <div className="bg-gray-700/40 p-3 rounded-lg text-center">
                          <div className="font-semibold text-white mb-1">Team B</div>
                          <div className="text-gray-300">{team2?.name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(bothTeamsReady || currentUser?.isAdmin) && (
            <div className="lg:col-span-1">
              <MatchChat 
                matchId={match.id} 
                userTeam={userTeam} 
                teams={teams} 
                isAdmin={currentUser?.isAdmin}
              />
            </div>
          )}
        </div>

        {/* Match Header */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Match #{match.matchNumber}</h2>
            <span className="text-sm text-gray-300">
              Round {match.round} • {match.tournamentType === 'qualifier' ? 'Qualifier' : 'Final Event'}
            </span>
          </div>
        </div>
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
              
              let targetTeam: Team | null = userTeam;
              
              if (currentUser?.isAdmin && adminReadyUpTeam) {
                targetTeam = adminReadyUpTeam;
              }
              
              if (!targetTeam) {
                toast.error('No team selected for ready-up');
                return;
              }
              
              await updateTeamActivePlayers(targetTeam.id, roster.mainPlayers);
              await handleTeamReadyUp(match!.id, targetTeam.id);
              
              setActivePlayers(roster.mainPlayers);
              setShowReadyUpModal(false);
              setAdminReadyUpTeam(null);
              toast.success('Team is ready!');
              
            } catch (error) {
              toast.error('Failed to ready up');
            } finally {
              setReadyingUp(false);
            }
          }}
        />
      )}

      {showTeamSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">Select Team to Ready Up</h3>
              <p className="text-gray-300 mb-6">Choose which team you want to ready up as an admin:</p>
              
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
                    className="w-full px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
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
                    className="w-full px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
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
                  ? 'bg-blue-600 text-white' 
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
                 className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs transition-colors"
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
                  console.log('Match State:', match);
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