
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeams, getTeamById, getPublicUserData } from '../services/firebaseService';
import type { Match, Team, User } from '../types/tournament';
import { Clock, Shield, Sword, Target, Trophy, Users, MapPin, AlertCircle, CheckCircle, XCircle, User as UserIcon, Crown, Zap } from 'lucide-react';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

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
  const maps = [...DEFAULT_MAP_POOL];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
             style={{
               backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }} />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white font-bodax uppercase tracking-wide">Loading Stream Overlay...</h2>
          <p className="text-gray-300 mt-2 font-mono text-sm">Match ID: {matchId}</p>
          <p className="text-gray-400 text-sm mt-1 font-mono">If this persists, check OBS browser source settings</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
             style={{
               backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }} />
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4 font-bodax uppercase tracking-wide">Match Not Found</h2>
          <p className="text-gray-300 font-mono">The specified match could not be found.</p>
        </div>
      </div>
    );
  }

  const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  const selectedMaps = [match.map1, match.map2, match.deciderMap].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} />

      {/* Action Notification */}
      {showActionNotification && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-green-500 animate-bounce">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold font-bodax uppercase tracking-wide">{lastAction}!</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Section - Tournament Info */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-[#0a0a0a] border-b border-gray-800 relative z-10">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Trophy className="w-8 h-8 text-red-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-bodax uppercase tracking-wide">
                UNITY LEAGUE
              </h1>
              <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">Tournament Stream</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-red-500 font-bodax uppercase tracking-wide">
              {currentPhase}
            </div>
            <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Match #{match.matchNumber}</div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-red-500" />
            <span className="text-sm font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-24 px-8 pb-20 h-screen">
        <div className="grid grid-cols-12 gap-8 h-full">
          {/* Left Section - Team 1 Details */}
          <div className="col-span-4">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden h-full">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-900 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-red-500 font-bodax">1</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white font-bodax uppercase tracking-wide">{team1?.name || 'Team 1'}</h3>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                    <Users className="w-4 h-4" />
                    <span>{team1?.members?.length || 0} Players</span>
                  </div>
                </div>

                {/* Team 1 Players */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center font-mono uppercase tracking-widest">
                    <UserIcon className="w-4 h-4 mr-2 text-red-500" />
                    Players
                  </h4>
                  {team1?.members?.map((member, index) => {
                    const user = team1Users[member.userId];
                    return (
                      <div key={member.userId} className="flex items-center justify-between p-2 bg-black/30 border border-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gray-900 border border-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-red-500 font-bodax">{index + 1}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium font-bodax">
                              {user?.username || `Player ${index + 1}`}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {user?.riotId || member.userId.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                        {member.role === 'captain' && (
                          <Crown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    );
                  }) || (
                    <div className="text-center text-gray-400 text-sm py-4 font-mono">
                      No players loaded
                    </div>
                  )}
                </div>

                {/* Team 1 Bans */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-red-500 mb-3 flex items-center font-mono uppercase tracking-widest">
                    <XCircle className="w-4 h-4 mr-2" />
                    Banned Maps
                  </h4>
                  <div className="space-y-2">
                    {bannedMaps.team1.map((mapName, index) => (
                      <div key={mapName} className="flex items-center space-x-2 p-2 bg-red-900/30 border border-red-700 rounded-lg">
                        <span className="text-xs font-bold text-red-500 font-mono">#{index + 1}</span>
                        <span className="text-sm text-red-300 font-bodax uppercase">{mapName}</span>
                      </div>
                    ))}
                    {bannedMaps.team1.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-2 font-mono">
                        No bans yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Map Pool & Match Info */}
          <div className="col-span-4">
            {/* Map Pool Section */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 mb-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h3 className="text-xl font-bold mb-4 text-center text-white font-bodax uppercase tracking-wide">
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
                  let bgColor = 'bg-black/30';
                  let borderColor = 'border-gray-800';
                  let textColor = 'text-white';
                  let iconColor = 'text-gray-400';
                  let animation = '';
                  
                  if (isBanned) {
                    status = 'banned';
                    bgColor = 'bg-red-900/30';
                    borderColor = 'border-red-700';
                    textColor = 'text-red-300';
                    iconColor = 'text-red-500';
                  } else if (isSelected) {
                    if (isMap1) {
                      status = 'map1';
                      bgColor = 'bg-blue-900/30';
                      borderColor = 'border-blue-600';
                      textColor = 'text-blue-300';
                      iconColor = 'text-blue-500';
                      animation = 'animate-pulse';
                    } else if (isMap2) {
                      status = 'map2';
                      bgColor = 'bg-blue-900/30';
                      borderColor = 'border-blue-600';
                      textColor = 'text-blue-300';
                      iconColor = 'text-blue-500';
                      animation = 'animate-pulse';
                    } else if (isDecider) {
                      status = 'decider';
                      bgColor = 'bg-yellow-900/30';
                      borderColor = 'border-yellow-600';
                      textColor = 'text-yellow-300';
                      iconColor = 'text-yellow-500';
                      animation = 'animate-pulse';
                    }
                  }
                  
                  return (
                    <div
                      key={mapName}
                      className={`${bgColor} ${borderColor} border-2 rounded-lg p-3 text-center transition-all duration-300 ${animation}`}
                    >
                      <MapPin className={`w-6 h-6 mx-auto mb-1 ${iconColor}`} />
                      <h4 className={`font-bold text-sm ${textColor} font-bodax uppercase tracking-wide`}>{mapName}</h4>
                      <div className="text-xs mt-1 font-semibold font-mono uppercase tracking-widest">
                        {status === 'banned' && (
                          <span className="text-red-500 flex items-center justify-center">
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
                          <span className="text-blue-400 flex items-center justify-center">
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
                          <span className="text-gray-400 flex items-center justify-center">
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
            </div>

            {/* Match Details */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <h3 className="text-lg font-bold mb-4 text-center text-white font-bodax uppercase tracking-wide">
                  Match Details
                </h3>
                
                {/* Map 1 */}
                {match.map1 && (
                  <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-300 font-semibold font-bodax uppercase tracking-wide">Map 1: {match.map1}</span>
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded font-mono uppercase tracking-widest">SELECTED</span>
                    </div>
                    {match.map1Side && (
                      <div className="flex items-center space-x-2 text-sm font-mono">
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
                  <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-300 font-semibold font-bodax uppercase tracking-wide">Map 2: {match.map2}</span>
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded font-mono uppercase tracking-widest">SELECTED</span>
                    </div>
                    {match.map2Side && (
                      <div className="flex items-center space-x-2 text-sm font-mono">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-200">
                          {match.map2Side === 'defense' ? team1?.name : team2?.name} DEF
                        </span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-blue-200">
                          {match.map2Side === 'attack' ? team1?.name : team2?.name} ATT
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Decider Map */}
                {match.deciderMap && (
                  <div className="p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-yellow-300 font-semibold font-bodax uppercase tracking-wide">Decider: {match.deciderMap}</span>
                      <span className="text-xs bg-yellow-600 px-2 py-1 rounded font-mono uppercase tracking-widest">DECIDER</span>
                    </div>
                    {match.deciderMapSide && (
                      <div className="flex items-center space-x-2 text-sm font-mono">
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
                  <div className="text-center text-gray-400 text-sm py-4 font-mono">
                    No maps selected yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Team 2 Details */}
          <div className="col-span-4">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 relative overflow-hidden h-full">
              {/* Grid Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                   style={{
                     backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }} />
              <div className="relative">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-900 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-red-500 font-bodax">2</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white font-bodax uppercase tracking-wide">{team2?.name || 'Team 2'}</h3>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                    <Users className="w-4 h-4" />
                    <span>{team2?.members?.length || 0} Players</span>
                  </div>
                </div>

                {/* Team 2 Players */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center font-mono uppercase tracking-widest">
                    <UserIcon className="w-4 h-4 mr-2 text-red-500" />
                    Players
                  </h4>
                  {team2?.members?.map((member, index) => {
                    const user = team2Users[member.userId];
                    return (
                      <div key={member.userId} className="flex items-center justify-between p-2 bg-black/30 border border-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gray-900 border border-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-red-500 font-bodax">{index + 1}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium font-bodax">
                              {user?.username || `Player ${index + 1}`}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {user?.riotId || member.userId.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                        {member.role === 'captain' && (
                          <Crown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    );
                  }) || (
                    <div className="text-center text-gray-400 text-sm py-4 font-mono">
                      No players loaded
                    </div>
                  )}
                </div>

                {/* Team 2 Bans */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-red-500 mb-3 flex items-center font-mono uppercase tracking-widest">
                    <XCircle className="w-4 h-4 mr-2" />
                    Banned Maps
                  </h4>
                  <div className="space-y-2">
                    {bannedMaps.team2.map((mapName, index) => (
                      <div key={mapName} className="flex items-center space-x-2 p-2 bg-red-900/30 border border-red-700 rounded-lg">
                        <span className="text-xs font-bold text-red-500 font-mono">#{index + 1}</span>
                        <span className="text-sm text-red-300 font-bodax uppercase">{mapName}</span>
                      </div>
                    ))}
                    {bannedMaps.team2.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-2 font-mono">
                        No bans yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Status and Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-gray-800 relative z-10">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-red-500" />
              <span className="text-sm font-mono uppercase tracking-widest">Match Status: {match.matchState}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Tournament</div>
              <div className="font-semibold text-red-500 font-bodax uppercase tracking-wide">Unity League</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">Format</div>
              <div className="font-semibold text-red-500 font-bodax uppercase tracking-wide">
                {match.matchFormat === 'BO3' ? 'Best of 3' : match.matchFormat === 'BO1' ? 'Best of 1' : match.matchFormat || 'Best of 3'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="text-sm font-mono uppercase tracking-widest">Live Stream Overlay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingOverlay;
