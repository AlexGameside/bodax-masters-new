import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTeams, getTeamById, getPublicUserData } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import type { Match, Team } from '../types/tournament';
import { 
  Monitor, 
  Users, 
  Clock, 
  TrendingUp, 
  Eye, 
  BarChart3, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Trophy
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StreamData {
  avgViewers: number;
  peakViewers: number;
  duration: number; // in minutes
  notes?: string;
}

const StreamerDashboard = () => {
  const params = useParams<{ streamerId: string }>();
  const { streamerId } = params;
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [streamerUser, setStreamerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [streamData, setStreamData] = useState<StreamData>({
    avgViewers: 0,
    peakViewers: 0,
    duration: 0,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authLoading) return; // Wait for auth to load
        
        if (!currentUser) {
          toast.error('Please log in to access this page.');
          navigate('/');
          return;
        }
        
        // Check if user is admin or the streamer themselves
        const isAdmin = currentUser.isAdmin || false;
        const isStreamer = currentUser.username === streamerId;
        
        if (isAdmin || isStreamer) {
          setIsAuthorized(true);
        } else {
          toast.error('Access denied. Only the assigned streamer or admins can access this page.');
          navigate('/');
          return;
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        toast.error('Error checking authorization');
        navigate('/');
      }
    };

    if (streamerId) {
      checkAuth();
    }
  }, [streamerId, navigate, currentUser, authLoading]);

  // Load match data
  useEffect(() => {
    if (!streamerId || !isAuthorized) return;

    const loadMatchData = async () => {
      try {
        // First, get the user data to show their name
        const userData = await getPublicUserData(streamerId);
        setStreamerUser(userData);

        // Find ALL matches with this username (including historical assignments)
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, where('streamingInfo.username', '==', streamerId));
        const querySnapshot = await getDocs(q);
        
        // If no current matches, check if user has ever been a streamer
        if (querySnapshot.empty) {
          // Check if user has ever been assigned as a streamer (for dashboard access)
          const allMatchesRef = collection(db, 'matches');
          const allMatchesSnapshot = await getDocs(allMatchesRef);
          const hasEverBeenStreamer = allMatchesSnapshot.docs.some(doc => {
            const match = doc.data();
            return match.streamingInfo?.username === streamerId;
          });
          
          if (!hasEverBeenStreamer) {
            toast.error('No matches found for this streamer');
            setLoading(false);
            return;
          }
          
          // User has been a streamer before but no current matches
          setMatches([]);
          setLoading(false);
          return;
        }

        const matchesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Match[];
        
        setMatches(matchesData);
        
        // Set first match as selected by default
        if (matchesData.length > 0) {
          setSelectedMatch(matchesData[0]);
        }

        // Load all teams
        const teamsData = await getTeams();
        setTeams(teamsData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading match data:', error);
        toast.error('Error loading match data');
        setLoading(false);
      }
    };

    loadMatchData();
  }, [streamerId, isAuthorized]);

  const copyStreamLink = () => {
    if (!selectedMatch) return;
    const link = `${window.location.origin}/stream/${selectedMatch.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Stream link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getTeamById = (teamId: string | null): Team | null => {
    if (!teamId) return null;
    return teams.find(team => team.id === teamId) || null;
  };

  const submitStreamData = async () => {
    if (!selectedMatch || !streamData.avgViewers || !streamData.peakViewers || !streamData.duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const team1 = getTeamById(selectedMatch.team1Id);
      const team2 = getTeamById(selectedMatch.team2Id);
      
      // Save stream data to a separate collection
      await addDoc(collection(db, 'streamAnalytics'), {
        matchId: selectedMatch.id,
        username: streamerId,
        streamUrl: selectedMatch.streamingInfo?.streamUrl,
        streamPlatform: selectedMatch.streamingInfo?.streamPlatform,
        avgViewers: streamData.avgViewers,
        peakViewers: streamData.peakViewers,
        duration: streamData.duration,
        notes: streamData.notes,
        submittedAt: new Date(),
        team1Name: team1?.name,
        team2Name: team2?.name,
        matchDate: selectedMatch.scheduledTime
      });

      toast.success('Stream data submitted successfully!');
      setStreamData({ avgViewers: 0, peakViewers: 0, duration: 0, notes: '' });
    } catch (error) {
      console.error('Error submitting stream data:', error);
      toast.error('Error submitting stream data');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date | string | any | undefined) => {
    if (!date) return 'TBD';
    
    try {
      let dateObj: Date;
      
      if (date && typeof date === 'object' && date.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'TBD';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'TBD';
      }
      
      return dateObj.toLocaleDateString('de-DE', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
      });
    } catch (error) {
      return 'TBD';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Active Matches</h1>
          <p className="text-gray-400">No current matches assigned to streamer: {streamerUser?.username || streamerId}</p>
          <p className="text-gray-500 text-sm mt-2">You can still access this dashboard if you've been assigned matches before.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Streamer Dashboard</h1>
          <p className="text-gray-400">Welcome, {streamerUser?.username || streamerId}!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Match Selection & Info */}
          <div className="space-y-6">
            {/* Match Selection */}
            {matches.length > 1 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-400" />
                  Select Match
                </h2>
                
                <div className="space-y-3">
                  {matches.map((match) => {
                    const team1 = getTeamById(match.team1Id);
                    const team2 = getTeamById(match.team2Id);
                    const isSelected = selectedMatch?.id === match.id;
                    
                    return (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className={`w-full p-4 rounded-lg border transition-colors text-left ${
                          isSelected 
                            ? 'bg-blue-900/30 border-blue-500 text-white' 
                            : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {team1?.name} vs {team2?.name}
                            </div>
                            <div className="text-sm opacity-75">
                              {formatDate(match.scheduledTime)}
                            </div>
                            {match.tournamentId && (
                              <div className="text-xs opacity-60 mt-1">
                                Tournament Match
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              match.matchState === 'completed' ? 'bg-green-900 text-green-300' :
                              match.matchState === 'playing' ? 'bg-blue-900 text-blue-300' :
                              match.matchState === 'scheduled' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {match.matchState.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-400">
                              Select match to stream
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Match Information */}
            {selectedMatch && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  Match Information
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Teams:</span>
                    <span className="text-white font-semibold">
                      {getTeamById(selectedMatch.team1Id)?.name} vs {getTeamById(selectedMatch.team2Id)?.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Scheduled:</span>
                    <span className="text-white">{formatDate(selectedMatch.scheduledTime)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedMatch.matchState === 'completed' ? 'bg-green-900 text-green-300' :
                      selectedMatch.matchState === 'playing' ? 'bg-blue-900 text-blue-300' :
                      selectedMatch.matchState === 'scheduled' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {selectedMatch.matchState.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stream Link */}
            {selectedMatch && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2 text-blue-400" />
                  Stream Link
                </h2>
                
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Use this link in OBS to display the live match stream with map banning, scores, and team information.
                  </p>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={`${window.location.origin}/stream/${selectedMatch.id}`}
                      readOnly
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={copyStreamLink}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-200 text-sm">
                      <strong>OBS Setup:</strong> Add this URL as a Browser Source in OBS with dimensions 1920x1080.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stream Data Submission */}
          <div className="space-y-6">
            {/* Stream Data Form */}
            {selectedMatch && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
                  Stream Analytics
                </h2>
              
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  After your stream, please submit the analytics data below. You can submit analytics for multiple matches in the tournament.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Average Viewers
                    </label>
                    <input
                      type="number"
                      value={streamData.avgViewers}
                      onChange={(e) => setStreamData(prev => ({ ...prev, avgViewers: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Peak Viewers
                    </label>
                    <input
                      type="number"
                      value={streamData.peakViewers}
                      onChange={(e) => setStreamData(prev => ({ ...prev, peakViewers: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stream Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={streamData.duration}
                    onChange={(e) => setStreamData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={streamData.notes}
                    onChange={(e) => setStreamData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Any additional notes about the stream..."
                  />
                </div>
                
                <button
                  onClick={submitStreamData}
                  disabled={submitting || !streamData.avgViewers || !streamData.peakViewers || !streamData.duration}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Submit Stream Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            )}

            {/* Quick Stats */}
            {selectedMatch && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-purple-400" />
                  Quick Stats
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{streamData.avgViewers}</div>
                    <div className="text-sm text-gray-400">Avg Viewers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{streamData.peakViewers}</div>
                    <div className="text-sm text-gray-400">Peak Viewers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{streamData.duration}</div>
                    <div className="text-sm text-gray-400">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {streamData.duration > 0 ? Math.round((streamData.avgViewers * streamData.duration) / 60) : 0}
                    </div>
                    <div className="text-sm text-gray-400">Viewer Hours</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamerDashboard;
