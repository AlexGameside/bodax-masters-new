import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeams, getTeamById, getPublicUserData, getMatch, getTournamentById, getMatches } from '../services/firebaseService';
import type { Match, Team, User, Tournament } from '../types/tournament';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Eye, 
  EyeOff,
  Monitor,
  Clock,
  Users,
  Trophy,
  MapPin,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Target,
  ExternalLink
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

interface StreamerControlProps {
  streamerId?: string;
}

const StreamerControl: React.FC<StreamerControlProps> = ({ streamerId }) => {
  const params = useParams<{ streamerId?: string; matchId?: string }>();
  const { streamerId: urlStreamerId, matchId } = params;
  
  // Use streamerId from URL params if available, otherwise use prop
  const actualStreamerId = urlStreamerId || streamerId;
  
  // State management
  const [currentScene, setCurrentScene] = useState<OverlayScene>('match-info');
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [predictionStats, setPredictionStats] = useState({ team1: 0, team2: 0, total: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  
  // Overlay URL generation
  const overlayUrl = `${window.location.origin}/overlay/${actualStreamerId || 'default'}`;
  
  // Scene configurations
  const scenes = [
    { 
      id: 'match-info' as OverlayScene, 
      name: 'Match Info', 
      icon: Monitor, 
      description: 'Team logos, score, and match details',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      id: 'map-banning' as OverlayScene, 
      name: 'Map Banning', 
      icon: MapPin, 
      description: 'Interactive map selection process',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    { 
      id: 'standings' as OverlayScene, 
      name: 'Standings', 
      icon: BarChart3, 
      description: 'Tournament standings and leaderboard',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      id: 'break-screen' as OverlayScene, 
      name: 'Break Screen', 
      icon: Pause, 
      description: 'Intermission content and upcoming matches',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    { 
      id: 'player-stats' as OverlayScene, 
      name: 'Player Stats', 
      icon: Users, 
      description: 'Live player performance and statistics',
      color: 'bg-red-600 hover:bg-red-700'
    },
    { 
      id: 'tournament-progress' as OverlayScene, 
      name: 'Tournament Progress', 
      icon: Trophy, 
      description: 'Swiss system progress and bracket',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    { 
      id: 'social-feed' as OverlayScene, 
      name: 'Social Feed', 
      icon: MessageSquare, 
      description: 'Live chat and social media integration',
      color: 'bg-pink-600 hover:bg-pink-700'
    },
    { 
      id: 'predictions' as OverlayScene, 
      name: 'Predictions', 
      icon: Target, 
      description: 'Live prediction stats and voting',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    { 
      id: 'custom' as OverlayScene, 
      name: 'Custom Message', 
      icon: Settings, 
      description: 'Custom text and announcements',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  // Load match data if matchId is provided
  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const matchRef = doc(db, 'matches', matchId);
    const unsubscribe = onSnapshot(matchRef, async (doc) => {
      if (doc.exists()) {
        const matchData = { ...doc.data(), id: doc.id } as Match;
        setMatch(matchData);
        
        // Load team data
        if (matchData.team1Id) {
          const team1Data = await getTeamById(matchData.team1Id);
          setTeam1(team1Data);
        }
        if (matchData.team2Id) {
          const team2Data = await getTeamById(matchData.team2Id);
          setTeam2(team2Data);
        }
        
        // Load tournament data
        if (matchData.tournamentId) {
          const tournamentData = await getTournamentById(matchData.tournamentId);
          setTournament(tournamentData);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  // Load active match from streamer link if no matchId provided
  useEffect(() => {
    if (matchId || !actualStreamerId) return;

    const loadStreamerData = async () => {
      try {
        // Load streamer link data to get active match
        const streamerLinksRef = collection(db, 'streamerLinks');
        const streamerQuery = query(streamerLinksRef, where('streamerId', '==', actualStreamerId));
        const streamerSnapshot = await getDocs(streamerQuery);
        
        if (!streamerSnapshot.empty) {
          const streamerData = streamerSnapshot.docs[0].data();
          if (streamerData.activeMatchId) {
            // Load the active match
            const matchData = await getMatch(streamerData.activeMatchId);
            if (matchData) {
              setMatch(matchData);
              
              // Load team data
              if (matchData.team1Id) {
                const team1Data = await getTeamById(matchData.team1Id);
                setTeam1(team1Data);
              }
              if (matchData.team2Id) {
                const team2Data = await getTeamById(matchData.team2Id);
                setTeam2(team2Data);
              }
              
              // Load tournament data
              if (matchData.tournamentId) {
                const tournamentData = await getTournamentById(matchData.tournamentId);
                setTournament(tournamentData);
              }
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading streamer data:', error);
        setLoading(false);
      }
    };

    loadStreamerData();
  }, [actualStreamerId, matchId]);

  // Load all teams for standings
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await getTeams();
        setTeams(teamsData);
      } catch (error) {
        console.error('Error loading teams:', error);
      }
    };
    loadTeams();
  }, []);

  // Load available matches for selection
  useEffect(() => {
    const loadAvailableMatches = async () => {
      try {
        const matchesData = await getMatches();
        // Filter to show only matches with both teams
        const validMatches = matchesData.filter(match => 
          match.team1Id && match.team2Id && 
          match.matchState !== 'completed' && 
          match.matchState !== 'forfeited'
        );
        setAvailableMatches(validMatches);
      } catch (error) {
        console.error('Error loading available matches:', error);
      }
    };

    loadAvailableMatches();
  }, []);

  // Handle match selection
  const handleMatchSelection = async (matchId: string) => {
    if (!matchId) return;
    
    setSelectedMatchId(matchId);
    setLoading(true);
    
    try {
      const matchData = await getMatch(matchId);
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
        
        // Update localStorage for overlay
        localStorage.setItem('overlay-active-match', matchData.id);
      }
    } catch (error) {
      console.error('Error loading selected match:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Scene change handler
  const changeScene = (scene: OverlayScene) => {
    setCurrentScene(scene);
    // Update localStorage for the overlay
    localStorage.setItem('overlay-scene', scene);
    if (customMessage) {
      localStorage.setItem('overlay-custom-message', customMessage);
    }
    if (match?.id) {
      localStorage.setItem('overlay-active-match', match.id);
    }
  };

  // Copy overlay URL to clipboard
  const copyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    // You could add a toast notification here
  };

  // Helper function to get team name by ID
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unknown Team';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white">Loading Streamer Control...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Streamer Control Dashboard</h1>
            <p className="text-gray-400 mt-2">Control your overlay scenes in real-time</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Preview Toggle */}
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                previewMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {previewMode ? 'Preview On' : 'Preview Off'}
            </button>
            
            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Overlay URL Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">OBS Browser Source URL</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-700 rounded-lg p-3 font-mono text-sm">
              {overlayUrl}
            </div>
            <button
              onClick={copyOverlayUrl}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Copy URL
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Add this URL as a Browser Source in OBS. Set width to 1920px and height to 1080px.
          </p>
        </div>

        {/* Prediction Link Section */}
        {match?.id && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Prediction Link</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-700 rounded-lg p-3 font-mono text-sm">
                {window.location.origin}/predict/{match.id}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/predict/${match.id}`)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Copy Link
              </button>
              <button
                onClick={() => window.open(`${window.location.origin}/predict/${match.id}`, '_blank')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Link
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Share this link with viewers to let them predict the match winner. Each IP can only vote once.
            </p>
          </div>
        )}

        {/* Match Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Select Match to Stream</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Choose a match to display in your overlay:
              </label>
              <select
                value={selectedMatchId}
                onChange={(e) => handleMatchSelection(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a match...</option>
                {availableMatches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)} 
                    {match.round ? ` - Round ${match.round}` : ''} 
                    ({match.matchState})
                  </option>
                ))}
              </select>
            </div>
            {availableMatches.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No active matches available. Check back later!
              </div>
            )}
          </div>
        </div>

        {/* Current Match Info */}
        {match && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Current Match</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{team1?.name || 'TBD'}</div>
                <div className="text-sm text-gray-400">Team 1</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">VS</div>
                <div className="text-sm text-gray-400">
                  {match.team1Score !== undefined && match.team2Score !== undefined 
                    ? `${match.team1Score} - ${match.team2Score}`
                    : 'TBD'
                  }
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{team2?.name || 'TBD'}</div>
                <div className="text-sm text-gray-400">Team 2</div>
              </div>
            </div>
          </div>
        )}

        {/* Scene Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {scenes.map((scene) => {
            const Icon = scene.icon;
            const isActive = currentScene === scene.id;
            
            return (
              <button
                key={scene.id}
                onClick={() => changeScene(scene.id)}
                className={`p-6 rounded-lg border-2 transition-all ${
                  isActive 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-3 ${
                    isActive ? 'text-blue-400' : 'text-gray-400'
                  }`} />
                  <div className={`font-bold text-sm ${
                    isActive ? 'text-blue-400' : 'text-white'
                  }`}>
                    {scene.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {scene.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Message Input */}
        {currentScene === 'custom' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Custom Message</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => changeScene('custom')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Update Message
              </button>
            </div>
          </div>
        )}

        {/* Preview Window */}
        {previewMode && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Live Preview</h2>
            <div className="bg-black rounded-lg p-4 aspect-video">
              <iframe
                src={overlayUrl}
                className="w-full h-full rounded"
                title="Overlay Preview"
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => changeScene('match-info')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Match
            </button>
            <button
              onClick={() => changeScene('break-screen')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Break Time
            </button>
            <button
              onClick={() => changeScene('standings')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              Show Standings
            </button>
            <button
              onClick={() => changeScene('map-banning')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Map Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamerControl;
