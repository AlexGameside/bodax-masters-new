import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeams, getTeamById, getMatch, getTournamentById } from '../services/firebaseService';
import type { Match, Team, Tournament } from '../types/tournament';
import { 
  Trophy, 
  Users, 
  Clock, 
  MapPin, 
  BarChart3, 
  MessageSquare,
  Play,
  Pause,
  RefreshCw,
  Shield,
  Target,
  XCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type OverlayScene = 
  | 'match-info' 
  | 'map-banning' 
  | 'standings' 
  | 'break-screen' 
  | 'player-stats' 
  | 'tournament-progress'
  | 'social-feed'
  | 'predictions'
  | 'custom';

const UnifiedOverlay: React.FC = () => {
  const params = useParams<{ streamerId?: string }>();
  const { streamerId } = params;
  
  // State management
  const [currentScene, setCurrentScene] = useState<OverlayScene>('match-info');
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [predictionStats, setPredictionStats] = useState({ team1: 0, team2: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Listen for scene changes from localStorage (sent by control dashboard)
  useEffect(() => {
    const handleStorageChange = () => {
      const scene = localStorage.getItem('overlay-scene') as OverlayScene;
      const message = localStorage.getItem('overlay-custom-message');
      
      if (scene) {
        setCurrentScene(scene);
      }
      if (message) {
        setCustomMessage(message);
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Check initial values
    handleStorageChange();
    
    // Poll for changes (fallback for same-tab updates)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Load teams for standings
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await getTeams();
        setTeams(teamsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading teams:', error);
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  // Load match data if available
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        // Load the current active match from localStorage or use a default match
        const activeMatchId = localStorage.getItem('overlay-active-match');
        if (activeMatchId) {
          const matchData = await getMatch(activeMatchId);
          if (matchData) {
            setMatch(matchData);
            
            // Load teams for this match
            if (matchData.team1Id && matchData.team2Id) {
              const [team1Data, team2Data] = await Promise.all([
                getTeamById(matchData.team1Id),
                getTeamById(matchData.team2Id)
              ]);
              setTeam1(team1Data);
              setTeam2(team2Data);
            }
            
            // Load tournament data
            if (matchData.tournamentId) {
              const tournamentData = await getTournamentById(matchData.tournamentId);
              setTournament(tournamentData);
            }
            
            // Load prediction stats
            await loadPredictionStats(matchData.id);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading match data:', error);
        setLoading(false);
      }
    };

    loadMatchData();
  }, []);

  // Load prediction stats
  const loadPredictionStats = async (matchId: string) => {
    try {
      const predictionsRef = collection(db, 'predictions');
      const statsQuery = query(predictionsRef, where('matchId', '==', matchId));
      const statsSnapshot = await getDocs(statsQuery);
      
      let team1Votes = 0;
      let team2Votes = 0;
      
      statsSnapshot.docs.forEach(doc => {
        const prediction = doc.data();
        if (prediction.predictedWinner === 'team1') {
          team1Votes++;
        } else {
          team2Votes++;
        }
      });
      
      setPredictionStats({
        team1: team1Votes,
        team2: team2Votes,
        total: team1Votes + team2Votes
      });
    } catch (error) {
      console.error('Error loading prediction stats:', error);
    }
  };

  // Scene Components
  const MatchInfoScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center m-0 p-0">
      <div className="text-center">
        {/* Tournament Header */}
        <div className="mb-8">
          <div className="text-4xl font-bold text-white mb-2">
            {tournament?.name || 'Unity League'}
          </div>
          <div className="text-xl text-gray-400">
            {tournament?.type === 'swiss-system' ? 'Swiss System Tournament' : 
             tournament?.type === 'single-elimination' ? 'Single Elimination' :
             tournament?.type === 'double-elimination' ? 'Double Elimination' :
             tournament?.type || 'Tournament'}
          </div>
        </div>
        
        {/* Teams */}
        <div className="flex items-center justify-center gap-12 mb-8">
          {/* Team 1 */}
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {team1?.name || 'Team Alpha'}
            </div>
            <div className="text-lg text-gray-400">vs</div>
          </div>
          
          {/* VS Section */}
          <div className="text-center mx-8">
            <div className="text-6xl font-bold text-white mb-2">VS</div>
            <div className="text-2xl text-gray-400">
              {match?.team1Score !== undefined && match?.team2Score !== undefined 
                ? `${match.team1Score} - ${match.team2Score}`
                : match?.matchState === 'completed' ? 'Match Complete' : 'TBD'
              }
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="text-center">
            <div className="w-24 h-24 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">
              {team2?.name || 'Team Beta'}
            </div>
          </div>
        </div>
        
        {/* Match Info */}
        <div className="flex items-center justify-center gap-8 text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>
              {match?.round ? `Round ${match.round}` : 'Match'}
              {tournament?.format?.teamCount ? ` of ${tournament.format.teamCount}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <span>BO3 Format</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span>{match?.matchState || 'Scheduled'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const MapBanningScene = () => {
    if (!match || !team1 || !team2) {
      return (
        <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center m-0 p-0">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-8">Map Selection</div>
            <div className="text-xl text-gray-300">Loading match data...</div>
          </div>
        </div>
      );
    }

    const bannedMaps = match.bannedMaps || { team1: [], team2: [] };
    const allBannedMaps = [...bannedMaps.team1, ...bannedMaps.team2];
    const selectedMaps = [match.map1, match.map2, match.deciderMap].filter(Boolean);
    const maps = ['Abyss', 'Bind', 'Haven', 'Ascent', 'Sunset', 'Corrode', 'Lotus'];

    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white overflow-hidden relative m-0 p-0">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-20"></div>
          <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-25"></div>
        </div>

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
                  {tournament?.name || 'UNITY LEAGUE'}
                </h1>
                <p className="text-sm text-gray-300">Tournament Stream</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Map Selection
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
                          {match.map1Side === 'defense' ? team2?.name : team1?.name} ATT
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
                <div className="font-semibold text-yellow-400">{tournament?.name || 'Unity League'}</div>
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

  const StandingsScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-green-900 to-green-800 p-8 m-0">
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-white mb-2">Tournament Standings</div>
        <div className="text-xl text-gray-300">
          {tournament?.type === 'swiss-system' ? 'Swiss System' : 
           tournament?.type === 'single-elimination' ? 'Single Elimination' :
           tournament?.type === 'double-elimination' ? 'Double Elimination' :
           tournament?.type || 'Tournament'}
          {match?.round ? ` - Round ${match.round}` : ''}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {teams.slice(0, 8).map((team, index) => (
            <div
              key={team.id}
              className={`p-4 rounded-lg border-2 ${
                index < 4 
                  ? 'border-green-500 bg-green-900/20' 
                  : 'border-gray-500 bg-gray-800/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${
                    index < 4 ? 'text-green-400' : 'text-gray-300'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="text-xl font-bold text-white">{team.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">3-0</div>
                  <div className="text-sm text-gray-400">9 Points</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const BreakScreenScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-yellow-900 to-yellow-800 flex items-center justify-center m-0 p-0">
      <div className="text-center">
        <div className="text-6xl font-bold text-white mb-8">Break Time</div>
        <div className="text-2xl text-gray-300 mb-8">Match will resume shortly...</div>
        
        <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-800/20 rounded-lg p-6">
            <div className="text-xl font-bold text-white mb-4">Upcoming Matches</div>
            <div className="space-y-2 text-gray-300">
              <div>Team Gamma vs Team Delta</div>
              <div>Team Epsilon vs Team Zeta</div>
              <div>Team Eta vs Team Theta</div>
            </div>
          </div>
          
          <div className="bg-gray-800/20 rounded-lg p-6">
            <div className="text-xl font-bold text-white mb-4">Tournament Info</div>
            <div className="space-y-2 text-gray-300">
              <div>40 Teams Participating</div>
              <div>Round 3 of 5</div>
              <div>8 Teams Advance to Playoffs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CustomMessageScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center m-0 p-0">
      <div className="text-center max-w-4xl mx-auto px-8">
        <div className="text-5xl font-bold text-white mb-8">
          {customMessage || 'Custom Message'}
        </div>
        <div className="text-2xl text-gray-400">
          This message can be updated in real-time from the control dashboard
        </div>
      </div>
    </div>
  );

  const PlayerStatsScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-red-900 to-red-800 p-8 m-0">
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-white mb-2">Live Player Stats</div>
        <div className="text-xl text-gray-300">Current Match Performance</div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Team 1 Stats */}
        <div className="bg-gray-800/20 rounded-lg p-6">
          <div className="text-2xl font-bold text-blue-400 mb-4">Team Alpha</div>
          <div className="space-y-3">
            {['Player1', 'Player2', 'Player3', 'Player4', 'Player5'].map((player, index) => (
              <div key={player} className="flex justify-between items-center">
                <span className="text-white">{player}</span>
                <div className="flex gap-4 text-sm text-gray-300">
                  <span>K: {Math.floor(Math.random() * 20)}</span>
                  <span>D: {Math.floor(Math.random() * 15)}</span>
                  <span>A: {Math.floor(Math.random() * 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Team 2 Stats */}
        <div className="bg-gray-800/20 rounded-lg p-6">
          <div className="text-2xl font-bold text-red-400 mb-4">Team Beta</div>
          <div className="space-y-3">
            {['Player1', 'Player2', 'Player3', 'Player4', 'Player5'].map((player, index) => (
              <div key={player} className="flex justify-between items-center">
                <span className="text-white">{player}</span>
                <div className="flex gap-4 text-sm text-gray-300">
                  <span>K: {Math.floor(Math.random() * 20)}</span>
                  <span>D: {Math.floor(Math.random() * 15)}</span>
                  <span>A: {Math.floor(Math.random() * 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const TournamentProgressScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-indigo-900 to-indigo-800 p-8 m-0">
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-white mb-2">Tournament Progress</div>
        <div className="text-xl text-gray-300">Swiss System - Round 3 of 5</div>
      </div>
      
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="bg-gray-800 rounded-full h-8 mb-8">
          <div className="bg-indigo-500 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{width: '60%'}}>
            60% Complete
          </div>
        </div>
        
        {/* Swiss System Visualization */}
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((round) => (
            <div
              key={round}
              className={`p-4 rounded-lg text-center ${
                round <= 3 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              <div className="text-2xl font-bold">Round {round}</div>
              <div className="text-sm">
                {round <= 3 ? 'Complete' : 'Upcoming'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center text-gray-300">
          <div className="text-lg">8 teams will advance to playoffs</div>
          <div className="text-sm">Current playoff cutoff: 6+ points</div>
        </div>
      </div>
    </div>
  );

  const SocialFeedScene = () => (
    <div className="w-full h-full bg-gradient-to-br from-pink-900 to-pink-800 p-8">
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-white mb-2">Live Social Feed</div>
        <div className="text-xl text-gray-300">Community Reactions</div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          {[
            { user: 'Fan123', message: 'This match is incredible! 🔥', time: '2m ago' },
            { user: 'GamerPro', message: 'Team Alpha is dominating!', time: '3m ago' },
            { user: 'TournamentFan', message: 'Best Swiss system tournament ever!', time: '5m ago' },
            { user: 'EsportsFan', message: 'Can\'t wait for the playoffs!', time: '7m ago' },
            { user: 'UnityLeague', message: 'Follow us for more updates!', time: '10m ago' }
          ].map((post, index) => (
            <div key={index} className="bg-gray-800/20 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {post.user[0]}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">{post.user}</div>
                  <div className="text-gray-300">{post.message}</div>
                </div>
                <div className="text-gray-400 text-sm">{post.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PredictionScene = () => (
    <div className="w-screen h-screen bg-gradient-to-br from-indigo-900 to-indigo-800 flex items-center justify-center m-0 p-0">
      <div className="text-center max-w-4xl mx-auto px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-4xl font-bold text-white mb-2">Live Predictions</div>
          <div className="text-xl text-gray-300">
            {tournament?.name || 'Tournament'} - {match?.round ? `Round ${match.round}` : 'Match'}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-12 mb-8">
          {/* Team 1 */}
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {team1?.name || 'Team Alpha'}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{predictionStats.team1}</div>
            <div className="text-sm text-gray-400">votes</div>
          </div>
          
          {/* VS */}
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">VS</div>
            <div className="text-lg text-gray-400">
              {predictionStats.total} Total Predictions
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="text-center">
            <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div className="text-2xl font-bold text-red-400 mb-2">
              {team2?.name || 'Team Beta'}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{predictionStats.team2}</div>
            <div className="text-sm text-gray-400">votes</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          {/* Team 1 Bar */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-right text-blue-400 font-bold">
              {team1?.name || 'Team Alpha'}
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-6">
              <div 
                className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                style={{ 
                  width: predictionStats.total > 0 ? `${(predictionStats.team1 / predictionStats.total) * 100}%` : '0%' 
                }}
              >
                <span className="text-white text-sm font-bold">
                  {predictionStats.total > 0 ? Math.round((predictionStats.team1 / predictionStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Team 2 Bar */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-right text-red-400 font-bold">
              {team2?.name || 'Team Beta'}
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-6">
              <div 
                className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                style={{ 
                  width: predictionStats.total > 0 ? `${(predictionStats.team2 / predictionStats.total) * 100}%` : '0%' 
                }}
              >
                <span className="text-white text-sm font-bold">
                  {predictionStats.total > 0 ? Math.round((predictionStats.team2 / predictionStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Prediction Stats - No Link */}
        <div className="mt-8 text-center">
          <div className="text-lg text-gray-300">
            Live Prediction Results
          </div>
        </div>
      </div>
    </div>
  );

  // Render current scene
  const renderScene = () => {
    switch (currentScene) {
      case 'match-info':
        return <MatchInfoScene />;
      case 'map-banning':
        return <MapBanningScene />;
      case 'standings':
        return <StandingsScene />;
      case 'break-screen':
        return <BreakScreenScene />;
      case 'player-stats':
        return <PlayerStatsScene />;
      case 'tournament-progress':
        return <TournamentProgressScene />;
      case 'social-feed':
        return <SocialFeedScene />;
      case 'predictions':
        return <PredictionScene />;
      case 'custom':
        return <CustomMessageScene />;
      default:
        return <MatchInfoScene />;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-2xl font-bold text-white">Loading Overlay...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden m-0 p-0">
      {renderScene()}
    </div>
  );
};

export default UnifiedOverlay;
