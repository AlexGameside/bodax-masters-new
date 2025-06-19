import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { handleTeamReadyUp, getMatch, getTeams, getUserTeamForMatch, selectMap, getTeamPlayers, updateTeamActivePlayers, getTeamById } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import type { Match, Team, User } from '../types/tournament';
import ReadyUpModal from '../components/ReadyUpModal';
import MapBanning from '../components/MapBanning';
import SideSelection from '../components/SideSelection';
import MatchInProgress from '../components/MatchInProgress';
import MatchChat from '../components/MatchChat';
import { ArrowLeft, Trophy, Clock, CheckCircle, User as UserIcon, BarChart3 } from 'lucide-react';

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
          if (currentUser.isAdmin) {
            setUserTeam(null);
          } else {
            const userTeamData = await getUserTeamForMatch(currentUser.id, matchData);
            console.log('MatchPage Debug - getUserTeamForMatch result:', {
              userId: currentUser.id,
              matchId: matchData.id,
              team1Id: matchData.team1Id,
              team2Id: matchData.team2Id,
              userTeamData: userTeamData ? { id: userTeamData.id, name: userTeamData.name } : null
            });
            setUserTeam(userTeamData);

            if (userTeamData) {
              const players = await getTeamPlayers(userTeamData.id);
              setTeamPlayers(players);
            }
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
          mapPool: data.mapPool || ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'],
          bannedMaps: data.bannedMaps || { team1: [], team2: [] },
          selectedMap: data.selectedMap,
          team1Ready: data.team1Ready || false,
          team2Ready: data.team2Ready || false,
          team1MapBans: data.team1MapBans || [],
          team2MapBans: data.team2MapBans || [],
          team1MapPick: data.team1MapPick,
          team2MapPick: data.team2MapPick,
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
          resolvedAt: data.resolvedAt?.toDate()
        });
      }
    }, (error) => {
    });

    return () => {
      unsubscribe();
    };
  }, [id, currentUser, navigate]);

  const handleReadyUp = async () => {
    if (!match || !currentUser) return;
    
    if (currentUser.isAdmin && !userTeam) {
      setShowTeamSelectionModal(true);
      return;
    }
    
    if (!userTeam) return;
    
    setShowReadyUpModal(true);
  };

  const handleSetActivePlayers = async (selectedPlayers: string[]) => {
    if (!currentUser) return;
    
    try {
      setReadyingUp(true);
      
      let targetTeam: Team | null = userTeam;
      
      if (currentUser.isAdmin && adminReadyUpTeam) {
        targetTeam = adminReadyUpTeam;
      }
      
      if (!targetTeam) {
        toast.error('No team selected for ready-up');
        return;
      }
      
      await updateTeamActivePlayers(targetTeam.id, selectedPlayers);
      
      await handleTeamReadyUp(match!.id, targetTeam.id);
      
      setActivePlayers(selectedPlayers);
      setShowReadyUpModal(false);
      setAdminReadyUpTeam(null);
      toast.success('Team is ready!');
      
    } catch (error) {
      toast.error('Failed to ready up');
    } finally {
      setReadyingUp(false);
    }
  };

  const handleMapBanningComplete = async () => {
    if (!match) return;
    
    try {
      await handleMapBanningComplete();
      toast.success('Map banning completed!');
    } catch (error) {
      toast.error('Failed to complete map banning');
    }
  };

  const getMatchProgress = () => {
    if (!match) return { step: 0, total: 6, label: 'Loading...' };
    
    const states = ['ready_up', 'map_banning', 'side_selection', 'playing', 'waiting_results', 'completed'];
    const currentStep = states.indexOf(match.matchState) + 1;
    
    const actualStep = match.matchState === 'disputed' ? 5 : currentStep;
    
    const labels = {
      ready_up: 'Ready Up',
      map_banning: 'Map Banning',
      side_selection: 'Side Selection',
      playing: 'Playing',
      waiting_results: 'Waiting Results',
      disputed: 'Disputed',
      completed: 'Completed',
      scheduled: 'Scheduled',
    };
    
    return {
      step: actualStep,
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

  const [team1Players, setTeam1Players] = useState<User[]>([]);
  const [team2Players, setTeam2Players] = useState<User[]>([]);

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
                    setTeamPlayers(team1Players);
                    setActivePlayers((team1 as any).activePlayers || []);
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
                  match.matchState === 'ready_up' ? 'bg-yellow-900 text-yellow-200' :
                  match.matchState === 'map_banning' ? 'bg-blue-900 text-blue-200' :
                  match.matchState === 'side_selection' ? 'bg-purple-900 text-purple-200' :
                  match.matchState === 'playing' ? 'bg-green-900 text-green-200' :
                  match.matchState === 'waiting_results' ? 'bg-yellow-900 text-yellow-200' :
                  match.matchState === 'disputed' ? 'bg-red-900 text-red-200' :
                  'bg-gray-700 text-gray-200'
                }`}>
                  {match.matchState === 'ready_up' ? 'Ready Up Phase' :
                   match.matchState === 'map_banning' ? 'Map Banning' :
                   match.matchState === 'side_selection' ? 'Side Selection' :
                   match.matchState === 'playing' ? 'Match in Progress' :
                   match.matchState === 'waiting_results' ? 'Results Submission' :
                   match.matchState === 'disputed' ? 'Disputed - Needs Admin' :
                   'Completed'}
                </span>
              </div>
              
              {match.selectedMap && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Selected Map</h4>
                  <span className="text-lg font-semibold text-green-400">{match.selectedMap}</span>
                </div>
              )}
              
              {match.team1Side && match.team2Side && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Sides</h4>
                  <div className="text-sm">
                    <div className="text-red-400">{team1?.name}: {match.team1Side}</div>
                    <div className="text-blue-400">{team2?.name}: {match.team2Side}</div>
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
                    setTeamPlayers(team2Players);
                    setActivePlayers((team2 as any).activePlayers || []);
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
                            const players = await getTeamPlayers(team1.id);
                            setTeamPlayers(players);
                            setActivePlayers((team1 as any).activePlayers || []);
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
                            const players = await getTeamPlayers(team2.id);
                            setTeamPlayers(players);
                            setActivePlayers((team2 as any).activePlayers || []);
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
                  onMapBanningComplete={handleMapBanningComplete}
                />
              </div>
            )}

            {match.matchState === 'side_selection' && (
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
          </div>

          {bothTeamsReady && (
            <div className="lg:col-span-1">
              <MatchChat 
                matchId={match.id} 
                userTeam={userTeam} 
                teams={teams} 
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
        <ReadyUpModal
          isOpen={true}
          onClose={() => {
            setShowReadyUpModal(false);
            setAdminReadyUpTeam(null);
          }}
          team={adminReadyUpTeam || userTeam!}
          teamPlayers={teamPlayers}
          currentActivePlayers={activePlayers}
          onSetActivePlayers={handleSetActivePlayers}
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
                        const players = await getTeamPlayers(team1.id);
                        setTeamPlayers(players);
                        setActivePlayers((team1 as any).activePlayers || []);
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
                        const players = await getTeamPlayers(team2.id);
                        setTeamPlayers(players);
                        setActivePlayers((team2 as any).activePlayers || []);
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
    </div>
  );
};

export default MatchPage; 