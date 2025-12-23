import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  XCircle, 
  Sword, 
  Shield,
  Crown
} from 'lucide-react';
import { DEFAULT_MAP_POOL } from '../constants/mapPool';

interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  matchState: string;
  bannedMaps?: {
    team1: string[];
    team2: string[];
  };
  map1?: string;
  map2?: string;
  deciderMap?: string;
  map1Side?: string;
  map2Side?: string;
  deciderMapSide?: string;
  round?: number;
  matchNumber?: number;
}

interface Team {
  id: string;
  name: string;
  members?: Array<{
    userId: string;
    role: string;
  }>;
}

interface User {
  username: string;
  riotId?: string;
}

const PlayoffStreamingOverlay: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [team1Users, setTeam1Users] = useState<Record<string, User>>({});
  const [team2Users, setTeam2Users] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedTeamIds = useRef<{ team1?: string; team2?: string }>({});

  const maps = [...DEFAULT_MAP_POOL];

  useEffect(() => {
    if (!matchId) {
      setError('No match ID provided');
      setLoading(false);
      return;
    }

    const matchRef = doc(db, 'matches', matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (matchSnapshot) => {
        if (!matchSnapshot.exists()) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        const matchData = { id: matchSnapshot.id, ...matchSnapshot.data() } as Match;
        setMatch(matchData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching match:', error);
        setError('Failed to load match data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  // Fetch team data separately to avoid infinite loops
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!match) return;

      // Fetch team1 data if not already loaded
      if (match.team1Id && match.team1Id !== loadedTeamIds.current.team1) {
        const team1Snapshot = await getDoc(doc(db, 'teams', match.team1Id));
        if (team1Snapshot.exists()) {
          const team1Data = { id: team1Snapshot.id, ...team1Snapshot.data() } as Team;
          setTeam1(team1Data);

          // Fetch team1 users
          if (team1Data.members) {
            const usersData: Record<string, User> = {};
            for (const member of team1Data.members) {
              const userSnapshot = await getDoc(doc(db, 'users', member.userId));
              if (userSnapshot.exists()) {
                usersData[member.userId] = userSnapshot.data() as User;
              }
            }
            setTeam1Users(usersData);
          }
          loadedTeamIds.current.team1 = match.team1Id;
        }
      }

      // Fetch team2 data if not already loaded
      if (match.team2Id && match.team2Id !== loadedTeamIds.current.team2) {
        const team2Snapshot = await getDoc(doc(db, 'teams', match.team2Id));
        if (team2Snapshot.exists()) {
          const team2Data = { id: team2Snapshot.id, ...team2Snapshot.data() } as Team;
          setTeam2(team2Data);

          // Fetch team2 users
          if (team2Data.members) {
            const usersData: Record<string, User> = {};
            for (const member of team2Data.members) {
              const userSnapshot = await getDoc(doc(db, 'users', member.userId));
              if (userSnapshot.exists()) {
                usersData[member.userId] = userSnapshot.data() as User;
              }
            }
            setTeam2Users(usersData);
          }
          loadedTeamIds.current.team2 = match.team2Id;
        }
      }
    };

    fetchTeamData();
  }, [match?.team1Id, match?.team2Id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">Loading Match Data...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-400">{error || 'Match not found'}</p>
        </div>
      </div>
    );
  }

  const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
  const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
  const selectedMaps = [match.map1, match.map2, match.deciderMap].filter(Boolean) as string[];

  const getSideDisplay = (side: string, team1Name: string, team2Name: string) => {
    if (side === 'attack') {
      return { attacker: team1Name, defender: team2Name };
    } else {
      return { attacker: team2Name, defender: team1Name };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)`,
        }}></div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-b border-blue-500/30">
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">UL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">UNITY LEAGUE PLAYOFFS</h1>
              <p className="text-xs text-blue-200">
                {match.round === 1 ? 'Quarter Final' : 
                 match.round === 2 ? 'Semi Final' : 
                 match.round === 3 ? 'Grand Final' : 
                 `Round ${match.round}`}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-mono text-gray-300">{new Date().toLocaleTimeString()}</div>
            <div className="text-xs text-gray-400">Live Stream</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-14 h-screen flex flex-col">
        {/* Team VS Header */}
        <div className="h-20 flex items-center justify-between px-8 bg-gradient-to-r from-blue-600/10 via-transparent to-red-600/10 border-b border-white/10">
          <div className="flex-1">
            <div className="text-2xl font-bold text-blue-300">{team1?.name || 'Team 1'}</div>
            <div className="text-sm text-blue-200">{team1?.members?.length || 0} Players</div>
          </div>
          
          <div className="px-12">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">VS</div>
          </div>
          
          <div className="flex-1 text-right">
            <div className="text-2xl font-bold text-red-300">{team2?.name || 'Team 2'}</div>
            <div className="text-sm text-red-200">{team2?.members?.length || 0} Players</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-12 gap-6 p-6">
          {/* Left Column - Team 1 */}
          <div className="col-span-3 space-y-4">
            {/* Team 1 Roster */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30 backdrop-blur-sm">
              <div className="text-sm font-bold text-blue-200 mb-3 flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                TEAM 1 ROSTER
              </div>
              <div className="space-y-2">
                {team1?.members?.map((member, index) => {
                  const user = team1Users[member.userId];
                  return (
                    <div key={member.userId} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg bg-blue-900/20">
                      <span className="text-blue-100 truncate">
                        {user?.username || `Player ${index + 1}`}
                      </span>
                      {member.role === 'captain' && (
                        <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                }) || (
                  <div className="text-center text-blue-300 text-sm py-4">
                    No players loaded
                  </div>
                )}
              </div>
            </div>

            {/* Team 1 Bans */}
            <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30 backdrop-blur-sm">
              <div className="text-sm font-bold text-red-200 mb-3 flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                BANNED MAPS
              </div>
              <div className="space-y-1">
                {bannedMaps.team1.map((mapName) => (
                  <div key={mapName} className="text-sm text-red-200 py-1 px-2 rounded bg-red-900/30">
                    ✕ {mapName}
                  </div>
                ))}
                {bannedMaps.team1.length === 0 && (
                  <div className="text-center text-red-300 text-sm py-2">
                    No bans yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Main Content */}
          <div className="col-span-6 space-y-4">
            {/* Map Pool */}
            <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-5 border border-gray-600/30 backdrop-blur-sm">
              <div className="text-lg font-bold text-white mb-4 text-center">MAP POOL</div>
              <div className="grid grid-cols-7 gap-3">
                {maps.map((mapName) => {
                  const isBanned = allBannedMaps.includes(mapName);
                  const isSelected = selectedMaps.includes(mapName);
                  
                  let bgColor = 'bg-gray-600/50';
                  let textColor = 'text-gray-200';
                  let borderColor = 'border-gray-500/50';
                  
                  if (isBanned) {
                    bgColor = 'bg-red-600/40';
                    textColor = 'text-red-200';
                    borderColor = 'border-red-500/50';
                  } else if (isSelected) {
                    bgColor = 'bg-green-600/40';
                    textColor = 'text-green-200';
                    borderColor = 'border-green-500/50';
                  }
                  
                  return (
                    <div
                      key={mapName}
                      className={`${bgColor} ${borderColor} border-2 rounded-lg p-3 text-center transition-all hover:scale-105`}
                    >
                      <div className={`text-sm font-bold ${textColor}`}>
                        {mapName}
                      </div>
                      {isBanned && (
                        <div className="text-red-400 text-xs mt-1">✕</div>
                      )}
                      {isSelected && !isBanned && (
                        <div className="text-green-400 text-xs mt-1">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Show remaining maps when most are banned */}
              {allBannedMaps.length >= 5 && (
                <div className="mt-4 p-3 bg-yellow-600/20 rounded-lg border border-yellow-500/30">
                  <div className="text-yellow-200 text-sm font-semibold text-center">
                    {maps.length - allBannedMaps.length} maps remaining
                  </div>
                  <div className="text-yellow-300 text-xs text-center mt-1">
                    {maps.filter(map => !allBannedMaps.includes(map)).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Match Details */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30 backdrop-blur-sm">
              <div className="text-lg font-bold text-purple-200 mb-4 text-center">MATCH DETAILS</div>
              
              <div className="space-y-3">
                {match.map1 && (
                  <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-blue-200 font-semibold">MAP 1: {match.map1}</div>
                      <div className="text-xs bg-blue-500 px-2 py-1 rounded text-blue-100">
                        PICKED BY {match.map1Side === 'attack' ? team1?.name?.toUpperCase() : team2?.name?.toUpperCase()}
                      </div>
                    </div>
                    {match.map1Side && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Sword className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-200 font-medium">
                              {getSideDisplay(match.map1Side, team1?.name || 'Team 1', team2?.name || 'Team 2')?.attacker}
                            </span>
                          </div>
                          <div className="text-orange-300 font-semibold bg-orange-600/20 px-2 py-1 rounded">ATTACK</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-200 font-medium">
                              {getSideDisplay(match.map1Side, team1?.name || 'Team 1', team2?.name || 'Team 2')?.defender}
                            </span>
                          </div>
                          <div className="text-blue-300 font-semibold bg-blue-600/20 px-2 py-1 rounded">DEFENSE</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {match.map2 && (
                  <div className="bg-purple-600/20 rounded-lg p-3 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-purple-200 font-semibold">MAP 2: {match.map2}</div>
                      <div className="text-xs bg-purple-500 px-2 py-1 rounded text-purple-100">
                        PICKED BY {match.map2Side === 'attack' ? team1?.name?.toUpperCase() : team2?.name?.toUpperCase()}
                      </div>
                    </div>
                    {match.map2Side && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Sword className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-200 font-medium">
                              {getSideDisplay(match.map2Side, team1?.name || 'Team 1', team2?.name || 'Team 2')?.attacker}
                            </span>
                          </div>
                          <div className="text-orange-300 font-semibold bg-orange-600/20 px-2 py-1 rounded">ATTACK</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-200 font-medium">
                              {getSideDisplay(match.map2Side, team1?.name || 'Team 1', team2?.name || 'Team 2')?.defender}
                            </span>
                          </div>
                          <div className="text-blue-300 font-semibold bg-blue-600/20 px-2 py-1 rounded">DEFENSE</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {match.deciderMap && (
                  <div className="bg-yellow-600/20 rounded-lg p-3 border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-yellow-200 font-semibold">DECIDER: {match.deciderMap}</div>
                      <div className="text-xs bg-yellow-500 px-2 py-1 rounded text-yellow-100">
                        PICKED BY {match.deciderMapSide === 'attack' ? team1?.name?.toUpperCase() : team2?.name?.toUpperCase()}
                      </div>
                    </div>
                    {match.deciderMapSide && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Sword className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-200 font-medium">
                              {getSideDisplay(match.deciderMapSide, team1?.name || 'Team 1', team2?.name || 'Team 2')?.attacker}
                            </span>
                          </div>
                          <div className="text-orange-300 font-semibold bg-orange-600/20 px-2 py-1 rounded">ATTACK</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-200 font-medium">
                              {getSideDisplay(match.deciderMapSide, team1?.name || 'Team 1', team2?.name || 'Team 2')?.defender}
                            </span>
                          </div>
                          <div className="text-blue-300 font-semibold bg-blue-600/20 px-2 py-1 rounded">DEFENSE</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!match.map1 && !match.map2 && !match.deciderMap && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    Waiting for map selection...
                  </div>
                )}
              </div>
            </div>

            {/* Single Webcam Area */}
            <div className="mt-12">
              <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl border border-gray-600/30 backdrop-blur-sm h-48 w-96 mx-auto flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-8 h-8 bg-white rounded-full"></div>
                  </div>
                  <div className="text-gray-300 text-base font-semibold mb-1">MAIN WEBCAM</div>
                  <div className="text-gray-400 text-sm">Caster / Observer View</div>
                </div>
              </div>
            </div>

            {/* Match Stats & Info */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              {/* Match Format */}
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-lg p-3 border border-green-500/30">
                <div className="text-green-200 text-sm font-semibold mb-1">FORMAT</div>
                <div className="text-green-100 text-lg font-bold">Best of 3</div>
                <div className="text-green-300 text-xs">First to 2 wins</div>
              </div>

              {/* Tournament Info */}
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-lg p-3 border border-purple-500/30">
                <div className="text-purple-200 text-sm font-semibold mb-1">TOURNAMENT</div>
                <div className="text-purple-100 text-lg font-bold">Unity League</div>
                <div className="text-purple-300 text-xs">Playoff Stage</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 bg-gradient-to-br from-gray-700/20 to-gray-800/20 rounded-lg p-3 border border-gray-600/30">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-300">
                  <span className="text-gray-400">Match ID:</span> {matchId?.slice(-8)}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Status:</span> {match.matchState}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Round:</span> {match.round || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Team 2 */}
          <div className="col-span-3 space-y-4">
            {/* Team 2 Roster */}
            <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30 backdrop-blur-sm">
              <div className="text-sm font-bold text-red-200 mb-3 flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                TEAM 2 ROSTER
              </div>
              <div className="space-y-2">
                {team2?.members?.map((member, index) => {
                  const user = team2Users[member.userId];
                  return (
                    <div key={member.userId} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg bg-red-900/20">
                      <span className="text-red-100 truncate">
                        {user?.username || `Player ${index + 1}`}
                      </span>
                      {member.role === 'captain' && (
                        <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                }) || (
                  <div className="text-center text-red-300 text-sm py-4">
                    No players loaded
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 Bans */}
            <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30 backdrop-blur-sm">
              <div className="text-sm font-bold text-red-200 mb-3 flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                BANNED MAPS
              </div>
              <div className="space-y-1">
                {bannedMaps.team2.map((mapName) => (
                  <div key={mapName} className="text-sm text-red-200 py-1 px-2 rounded bg-red-900/30">
                    ✕ {mapName}
                  </div>
                ))}
                {bannedMaps.team2.length === 0 && (
                  <div className="text-center text-red-300 text-sm py-2">
                    No bans yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayoffStreamingOverlay;