
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeams, getTeamById, getPublicUserData } from '../services/firebaseService';
import type { Match, Team, User } from '../types/tournament';
import { Clock, Shield, Sword, Target, Trophy, Users, MapPin, AlertCircle, CheckCircle, XCircle, User as UserIcon, Crown, Zap } from 'lucide-react';

const StreamingOverlay = () => {
  const params = useParams<{ matchId: string }>();
  const { matchId } = params;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [team1Users, setTeam1Users] = useState<{[key: string]: {username: string, riotId: string, discordUsername: string}}>({});
  const [team2Users, setTeam2Users] = useState<{[key: string]: {username: string, riotId: string, discordUsername: string}}>({});
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lastAction, setLastAction] = useState<string>('');
  const [showActionNotification, setShowActionNotification] = useState(false);

  // Real-time match data listener
  useEffect(() => {
    if (!matchId) return;



    const matchRef = doc(db, 'matches', matchId);
    const unsubscribe = onSnapshot(matchRef, async (docSnap) => {

      
      if (docSnap.exists()) {
        const matchData = { ...docSnap.data(), id: docSnap.id } as Match;

        
        // Check for changes to trigger notifications
        if (match && matchData.bannedMaps !== match.bannedMaps) {
          const oldBans = match.bannedMaps || { team1: [], team2: [] };
          const newBans = matchData.bannedMaps || { team1: [], team2: [] };
          const oldTotal = oldBans.team1.length + oldBans.team2.length;
          const newTotal = newBans.team1.length + newBans.team2.length;
          
          if (newTotal > oldTotal) {
            setLastAction('Map Banned');
            setShowActionNotification(true);
            setTimeout(() => setShowActionNotification(false), 3000);
          }
        }
        
        if (match && (matchData.map1 !== match.map1 || matchData.map2 !== match.map2 || matchData.deciderMap !== match.deciderMap)) {
          setLastAction('Map Selected');
          setShowActionNotification(true);
          setTimeout(() => setShowActionNotification(false), 3000);
        }
        
        setMatch(matchData);
        
        // Load team data
        if (matchData.team1Id && matchData.team2Id) {
          try {

            const [team1Data, team2Data] = await Promise.all([
              getTeamById(matchData.team1Id),
              getTeamById(matchData.team2Id)
            ]);
            


            
            setTeam1(team1Data);
            setTeam2(team2Data);
            
            // Load user data for team members with retry logic
            if (team1Data?.members) {

              const team1UserData: {[key: string]: {username: string, riotId: string, discordUsername: string}} = {};
              
              // Use Promise.allSettled for better error handling
              const userPromises = team1Data.members.map(async (member) => {
                try {

                  const userData = await getPublicUserData(member.userId);
                  if (userData) {

                    return { userId: member.userId, user: userData };
                  } else {

                    return { userId: member.userId, user: null };
                  }
                } catch (error) {

                  return { userId: member.userId, user: null };
                }
              });
              
              const results = await Promise.allSettled(userPromises);
              results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.user) {
                  team1UserData[result.value.userId] = result.value.user;
                }
              });
              

              setTeam1Users(team1UserData);
            }
            
            if (team2Data?.members) {

              const team2UserData: {[key: string]: {username: string, riotId: string, discordUsername: string}} = {};
              
              // Use Promise.allSettled for better error handling
              const userPromises = team2Data.members.map(async (member) => {
                try {

                  const userData = await getPublicUserData(member.userId);
                  if (userData) {

                    return { userId: member.userId, user: userData };
                  } else {

                    return { userId: member.userId, user: null };
                  }
                } catch (error) {

                  return { userId: member.userId, user: null };
                }
              });
              
              const results = await Promise.allSettled(userPromises);
              results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.user) {
                  team2UserData[result.value.userId] = result.value.user;
                }
              });
              

              setTeam2Users(team2UserData);
            }
          } catch (error) {

          }
        }
        
        setLoading(false);
      } else {

        setLoading(false);
      }
    }, (error) => {

      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId, match]);

  // Add a retry mechanism for OBS compatibility
  useEffect(() => {
    if (!matchId) return;

    // Retry loading data every 5 seconds if teams are not loaded
    const retryInterval = setInterval(() => {
      if (!team1 || !team2) {

        // Force a re-render by updating a state
        setLoading(prev => !prev);
      }
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [matchId, team1, team2]);

  // Add error boundary for OBS
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {

    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  useEffect(() => {
    if (!match) return;

    const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
    const totalBans = bannedMaps.team1.length + bannedMaps.team2.length;
    
    let phase = '';
    let isTeam1Turn = false;
    
    if (totalBans < 2) {
      // Phase 1: Initial bans
      phase = `Ban Phase ${totalBans + 1}/2`;
      isTeam1Turn = totalBans === 0;
    } else if (!match.map1) {
      // Map 1 selection
      phase = 'Map 1 Selection';
      isTeam1Turn = true;
    } else if (match.map1 && !match.map1Side) {
      // Map 1 side selection
      phase = 'Map 1 Side Selection';
      isTeam1Turn = false;
    } else if (!match.map2) {
      // Map 2 selection
      phase = 'Map 2 Selection';
      isTeam1Turn = false;
    } else if (match.map2 && !match.map2Side) {
      // Map 2 side selection
      phase = 'Map 2 Side Selection';
      isTeam1Turn = true;
    } else if (totalBans < 4) {
      // Phase 2: Additional bans for decider
      phase = `Decider Ban Phase ${totalBans - 1}/2`;
      isTeam1Turn = totalBans === 2;
    } else if (!match.deciderMapSide) {
      // Decider side selection
      phase = 'Decider Side Selection';
      isTeam1Turn = true;
    } else {
      phase = 'Map Selection Complete';
      isTeam1Turn = false;
    }
    
    setCurrentPhase(phase);
  }, [match]);

  // Map pool
  const maps = ['Abyss', 'Bind', 'Haven', 'Ascent', 'Sunset', 'Corrode', 'Lotus'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Loading Stream Overlay...</h2>
          <p className="text-gray-300 mt-2">Match ID: {matchId}</p>
          <p className="text-gray-400 text-sm mt-1">If this persists, check OBS browser source settings</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Match Not Found</h2>
          <p className="text-gray-300">The specified match could not be found.</p>
        </div>
      </div>
    );
  }

  const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  const selectedMaps = [match.map1, match.map2, match.deciderMap].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-20"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-25"></div>
      </div>

      {/* Action Notification */}
      {showActionNotification && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-green-400/50 animate-bounce">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{lastAction}!</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Section - Tournament Info */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-black/40 backdrop-blur-sm border-b border-white/20">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                UNITY LEAGUE
              </h1>
              <p className="text-sm text-gray-300">Tournament Stream</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {currentPhase}
            </div>
            <div className="text-sm text-gray-300">Match #{match.matchNumber}</div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-24 px-8 pb-20 h-screen">
        <div className="grid grid-cols-12 gap-8 h-full">
          {/* Left Section - Team 1 Details */}
          <div className="col-span-4">
            <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 rounded-lg border border-blue-500/30 p-6 backdrop-blur-sm h-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-100">{team1?.name || 'Team 1'}</h3>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
                  <Users className="w-4 h-4" />
                  <span>{team1?.members?.length || 0} Players</span>
                </div>
              </div>

              {/* Team 1 Players */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Players
                </h4>
                {team1?.members?.map((member, index) => {
                  const user = team1Users[member.userId];
                  return (
                    <div key={member.userId} className="flex items-center justify-between p-2 bg-blue-900/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-blue-100 font-medium">
                            {user?.username || `Player ${index + 1}`}
                          </span>
                          <span className="text-xs text-blue-300">
                            {user?.riotId || member.userId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                      {member.role === 'captain' && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No players loaded
                  </div>
                )}
              </div>

              {/* Team 1 Bans */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Banned Maps
                </h4>
                <div className="space-y-2">
                  {bannedMaps.team1.map((mapName, index) => (
                    <div key={mapName} className="flex items-center space-x-2 p-2 bg-red-900/30 rounded-lg">
                      <span className="text-xs font-bold text-red-400">#{index + 1}</span>
                      <span className="text-sm text-red-200">{mapName}</span>
                    </div>
                  ))}
                  {bannedMaps.team1.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      No bans yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Map Pool & Match Info */}
          <div className="col-span-4">
            {/* Map Pool Section */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-6">
              <h3 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Map Pool
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {maps.map((mapName) => {
                  const isBanned = allBannedMaps.includes(mapName);
                  const isSelected = selectedMaps.includes(mapName);
                  const isMap1 = match.map1 === mapName;
                  const isMap2 = match.map2 === mapName;
                  const isDecider = match.deciderMap === mapName;
                  
                  let status = 'available';
                  let bgColor = 'bg-gray-700/50';
                  let borderColor = 'border-gray-600';
                  let textColor = 'text-white';
                  let iconColor = 'text-gray-400';
                  let animation = '';
                  
                  if (isBanned) {
                    status = 'banned';
                    bgColor = 'bg-red-900/50';
                    borderColor = 'border-red-500';
                    textColor = 'text-red-300';
                    iconColor = 'text-red-400';
                  } else if (isSelected) {
                    if (isMap1) {
                      status = 'map1';
                      bgColor = 'bg-blue-900/50';
                      borderColor = 'border-blue-500';
                      textColor = 'text-blue-300';
                      iconColor = 'text-blue-400';
                      animation = 'animate-pulse';
                    } else if (isMap2) {
                      status = 'map2';
                      bgColor = 'bg-purple-900/50';
                      borderColor = 'border-purple-500';
                      textColor = 'text-purple-300';
                      iconColor = 'text-purple-400';
                      animation = 'animate-pulse';
                    } else if (isDecider) {
                      status = 'decider';
                      bgColor = 'bg-yellow-900/50';
                      borderColor = 'border-yellow-500';
                      textColor = 'text-yellow-300';
                      iconColor = 'text-yellow-400';
                      animation = 'animate-pulse';
                    }
                  }
                  
                  return (
                    <div
                      key={mapName}
                      className={`${bgColor} ${borderColor} border-2 rounded-lg p-3 text-center transition-all duration-300 hover:scale-105 ${animation} backdrop-blur-sm`}
                    >
                      <MapPin className={`w-6 h-6 mx-auto mb-1 ${iconColor}`} />
                      <h4 className={`font-bold text-sm ${textColor}`}>{mapName}</h4>
                      <div className="text-xs mt-1 font-semibold">
                        {status === 'banned' && (
                          <span className="text-red-400 flex items-center justify-center">
                            <XCircle className="w-3 h-3 mr-1" />
                            BANNED
                          </span>
                        )}
                        {status === 'map1' && (
                          <span className="text-blue-400 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            MAP 1
                          </span>
                        )}
                        {status === 'map2' && (
                          <span className="text-purple-400 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            MAP 2
                          </span>
                        )}
                        {status === 'decider' && (
                          <span className="text-yellow-400 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            DECIDER
                          </span>
                        )}
                        {status === 'available' && (
                          <span className="text-green-400 flex items-center justify-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Match Details */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="text-lg font-bold mb-4 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Match Details
              </h3>
              
              {/* Map 1 */}
              {match.map1 && (
                <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300 font-semibold">Map 1: {match.map1}</span>
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded">SELECTED</span>
                  </div>
                  {match.map1Side && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-200">
                        {match.map1Side === 'defense' ? team1?.name : team2?.name} DEF
                      </span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-blue-200">
                        {match.map1Side === 'attack' ? team1?.name : team2?.name} ATT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Map 2 */}
              {match.map2 && (
                <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 font-semibold">Map 2: {match.map2}</span>
                    <span className="text-xs bg-purple-600 px-2 py-1 rounded">SELECTED</span>
                  </div>
                  {match.map2Side && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-200">
                        {match.map2Side === 'defense' ? team1?.name : team2?.name} DEF
                      </span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-purple-200">
                        {match.map2Side === 'attack' ? team1?.name : team2?.name} ATT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Decider Map */}
              {match.deciderMap && (
                <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-300 font-semibold">Decider: {match.deciderMap}</span>
                    <span className="text-xs bg-yellow-600 px-2 py-1 rounded">DECIDER</span>
                  </div>
                  {match.deciderMapSide && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-200">
                        {match.deciderMapSide === 'defense' ? team1?.name : team2?.name} DEF
                      </span>
                      <span className="text-gray-400">vs</span>
                      <span className="text-yellow-200">
                        {match.deciderMapSide === 'attack' ? team1?.name : team2?.name} ATT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!match.map1 && !match.map2 && !match.deciderMap && (
                <div className="text-center text-gray-400 text-sm py-4">
                  No maps selected yet
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Team 2 Details */}
          <div className="col-span-4">
            <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 rounded-lg border border-red-500/30 p-6 backdrop-blur-sm h-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-red-100">{team2?.name || 'Team 2'}</h3>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
                  <Users className="w-4 h-4" />
                  <span>{team2?.members?.length || 0} Players</span>
                </div>
              </div>

              {/* Team 2 Players */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Players
                </h4>
                {team2?.members?.map((member, index) => {
                  const user = team2Users[member.userId];
                  return (
                    <div key={member.userId} className="flex items-center justify-between p-2 bg-red-900/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-red-100 font-medium">
                            {user?.username || `Player ${index + 1}`}
                          </span>
                          <span className="text-xs text-red-300">
                            {user?.riotId || member.userId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                      {member.role === 'captain' && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  );
                }) || (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No players loaded
                  </div>
                )}
              </div>

              {/* Team 2 Bans */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Banned Maps
                </h4>
                <div className="space-y-2">
                  {bannedMaps.team2.map((mapName, index) => (
                    <div key={mapName} className="flex items-center space-x-2 p-2 bg-red-900/30 rounded-lg">
                      <span className="text-xs font-bold text-red-400">#{index + 1}</span>
                      <span className="text-sm text-red-200">{mapName}</span>
                    </div>
                  ))}
                  {bannedMaps.team2.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      No bans yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Status and Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-sm border-t border-white/20">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-sm">Match Status: {match.matchState}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm text-gray-300">Tournament</div>
              <div className="font-semibold text-yellow-400">Unity League</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-300">Format</div>
              <div className="font-semibold text-blue-400">Best of 3</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm">Live Stream Overlay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingOverlay;
