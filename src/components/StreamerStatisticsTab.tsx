import React, { useState, useEffect } from 'react';
import { getDocs, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Eye, 
  TrendingUp, 
  Users, 
  Video,
  Trophy,
  Star,
  Activity,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import type { Match, Team } from '../types/tournament';

interface StreamingInfo {
  isStreamed: boolean;
  streamUrl?: string;
  streamPlatform?: 'twitch' | 'youtube';
}

interface StreamerStats {
  streamerName: string;
  totalStreams: number;
  totalMatches: number;
  firstStream: Date;
  lastStream: Date;
  averageStreamsPerMatch: number;
  uniqueMatches: string[];
  streamUrl?: string;
  platform?: 'twitch' | 'youtube';
}

interface MatchWithStreamer {
  match: Match;
  streamingInfo?: StreamingInfo;
  team1Name?: string;
  team2Name?: string;
}

const StreamerStatisticsTab: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [streamerStats, setStreamerStats] = useState<StreamerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'matches'>('overview');

  useEffect(() => {
    loadStreamerData();
  }, []);

  const loadStreamerData = async () => {
    try {
      setLoading(true);
      
      // Load matches with streaming info
      const matchesRef = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesRef);
      
      const matchesData: Match[] = [];
      matchesSnapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() } as Match);
      });
      setMatches(matchesData);

      // Load teams for team names
      const teamsRef = collection(db, 'teams');
      const teamsSnapshot = await getDocs(teamsRef);
      
      const teamsData: Team[] = [];
      teamsSnapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() } as Team);
      });
      setTeams(teamsData);

      // Calculate streamer statistics from matches with streaming info
      calculateStreamerStats(matchesData, teamsData);
      
    } catch (error) {
      console.error('Error loading streamer data:', error);
      toast.error('Failed to load streamer statistics');
    } finally {
      setLoading(false);
    }
  };

  const calculateStreamerStats = (matchesData: Match[], teamsData: Team[]) => {
    const statsMap = new Map<string, StreamerStats>();

    // Process matches that have streaming info
    matchesData.forEach(match => {
      if (match.streamingInfo?.isStreamed && match.streamingInfo?.streamUrl) {
        // Extract streamer name from URL or use a default
        const streamerName = extractStreamerName(match.streamingInfo.streamUrl);
        
        if (!statsMap.has(streamerName)) {
          statsMap.set(streamerName, {
            streamerName: streamerName,
            totalStreams: 0,
            totalMatches: 0,
            firstStream: match.scheduledTime ? (match.scheduledTime instanceof Date ? match.scheduledTime : new Date(match.scheduledTime)) : new Date(),
            lastStream: match.scheduledTime ? (match.scheduledTime instanceof Date ? match.scheduledTime : new Date(match.scheduledTime)) : new Date(),
            averageStreamsPerMatch: 0,
            uniqueMatches: [],
            streamUrl: match.streamingInfo.streamUrl,
            platform: match.streamingInfo.streamPlatform || 'twitch'
          });
        }

        const stats = statsMap.get(streamerName)!;
        stats.totalStreams++;
        
        if (!stats.uniqueMatches.includes(match.id)) {
          stats.uniqueMatches.push(match.id);
          stats.totalMatches++;
        }

        const matchDate = match.scheduledTime ? (match.scheduledTime instanceof Date ? match.scheduledTime : new Date(match.scheduledTime)) : new Date();
        if (matchDate < stats.firstStream) {
          stats.firstStream = matchDate;
        }
        if (matchDate > stats.lastStream) {
          stats.lastStream = matchDate;
        }
      }
    });

    // Calculate averages
    statsMap.forEach(stats => {
      stats.averageStreamsPerMatch = stats.totalMatches > 0 ? stats.totalStreams / stats.totalMatches : 0;
    });

    const sortedStats = Array.from(statsMap.values()).sort((a, b) => b.totalStreams - a.totalStreams);
    setStreamerStats(sortedStats);
  };

  const extractStreamerName = (streamUrl: string): string => {
    try {
      // Extract from Twitch URL
      if (streamUrl.includes('twitch.tv/')) {
        const match = streamUrl.match(/twitch\.tv\/([^/?]+)/);
        if (match) return match[1];
      }
      
      // Extract from YouTube URL
      if (streamUrl.includes('youtube.com/') || streamUrl.includes('youtu.be/')) {
        const match = streamUrl.match(/(?:youtube\.com\/channel\/|youtube\.com\/c\/|youtube\.com\/user\/|youtu\.be\/)([^/?]+)/);
        if (match) return match[1];
      }
      
      // Fallback: use domain name
      const url = new URL(streamUrl);
      return url.hostname.replace('www.', '');
    } catch {
      return 'Unknown Streamer';
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getMatchesWithStreamers = (): MatchWithStreamer[] => {
    return matches
      .filter(match => match.streamingInfo?.isStreamed && match.streamingInfo?.streamUrl)
      .map(match => {
        return {
          match,
          streamingInfo: match.streamingInfo,
          team1Name: getTeamName(match.team1Id || ''),
          team2Name: getTeamName(match.team2Id || '')
        };
      })
      .sort((a, b) => {
        const getDate = (date: any) => {
          if (!date) return new Date(0);
          
          // Handle Firestore Timestamp
          if (date && typeof date === 'object' && 'toDate' in date) {
            return date.toDate();
          }
          
          // Handle Date object or string
          if (date instanceof Date) {
            return date;
          }
          
          return new Date(date);
        };
        
        const dateA = getDate(a.match.scheduledTime);
        const dateB = getDate(b.match.scheduledTime);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const formatDate = (date: any) => {
    if (!date) return 'Invalid Date';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date) {
      date = date.toDate();
    }
    
    // Handle Date object or string
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: any) => {
    if (!date) return 'Invalid Time';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date) {
      date = date.toDate();
    }
    
    // Handle Date object or string
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'Invalid Date/Time';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date) {
      date = date.toDate();
    }
    
    // Handle Date object or string
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date/Time';
    
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-300">Loading streamer statistics...</span>
      </div>
    );
  }

  const matchesWithStreamers = getMatchesWithStreamers();
  const totalStreams = matchesWithStreamers.length;
  const uniqueStreamers = streamerStats.length;
  const totalMatches = matchesWithStreamers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center">
              <Video className="w-6 h-6 mr-3 text-purple-400" />
              Streamer Statistics
            </h2>
            <p className="text-gray-300 text-sm">
              Track streamer links, match coverage, and streaming activity
            </p>
          </div>
          <button
            onClick={loadStreamerData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">Total Streams</p>
              <p className="text-2xl font-bold">{totalStreams}</p>
            </div>
            <Video className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Unique Streamers</p>
              <p className="text-2xl font-bold">{uniqueStreamers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Matches Streamed</p>
              <p className="text-2xl font-bold">{totalMatches}</p>
            </div>
            <Trophy className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">Avg Streams/Match</p>
              <p className="text-2xl font-bold">
                {totalMatches > 0 ? (totalStreams / totalMatches).toFixed(1) : '0.0'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'detailed', label: 'Streamer Details', icon: Users },
          { id: 'matches', label: 'Match History', icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Streamers */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              Top Streamers
            </h3>
            <div className="space-y-3">
              {streamerStats.slice(0, 5).map((streamer, index) => (
                <div key={streamer.streamerName} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{streamer.streamerName}</p>
                      <p className="text-gray-400 text-sm">
                        {streamer.totalStreams} streams • {streamer.totalMatches} matches
                      </p>
                    </div>
                  </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-sm">
                        {streamer.averageStreamsPerMatch.toFixed(1)} avg/match
                      </p>
                      {streamer.streamUrl && (
                        <div className="flex items-center space-x-2 mt-1">
                          <a
                            href={streamer.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{streamer.platform === 'youtube' ? 'YouTube' : 'Twitch'}</span>
                          </a>
                          <button
                            onClick={() => copyToClipboard(streamer.streamUrl || '', 'Stream URL')}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy stream URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-400" />
              Recent Streaming Activity
            </h3>
            <div className="space-y-2">
              {matchesWithStreamers.slice(0, 10).map((matchData) => {
                const streamerName = extractStreamerName(matchData.streamingInfo?.streamUrl || '');
                return (
                  <div key={matchData.match.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div>
                        <p className="text-white text-sm font-medium">{streamerName}</p>
                        <p className="text-gray-400 text-xs">
                          {matchData.team1Name} vs {matchData.team2Name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-xs">
                        {matchData.match.scheduledTime ? 
                          formatDateTime(matchData.match.scheduledTime) : 
                          'Not scheduled'
                        }
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <a
                          href={matchData.streamingInfo?.streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Watch</span>
                        </a>
                        <button
                          onClick={() => copyToClipboard(matchData.streamingInfo?.streamUrl || '', 'Stream URL')}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy stream URL"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tab */}
      {activeTab === 'detailed' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">All Streamers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-2 text-gray-300">Streamer</th>
                  <th className="text-left py-3 px-2 text-gray-300">Total Streams</th>
                  <th className="text-left py-3 px-2 text-gray-300">Matches</th>
                  <th className="text-left py-3 px-2 text-gray-300">Avg/Match</th>
                  <th className="text-left py-3 px-2 text-gray-300">First Stream</th>
                  <th className="text-left py-3 px-2 text-gray-300">Last Stream</th>
                  <th className="text-left py-3 px-2 text-gray-300">Stream Link</th>
                </tr>
              </thead>
              <tbody>
                {streamerStats.map((streamer) => (
                  <tr key={streamer.streamerName} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-2 text-white font-medium">{streamer.streamerName}</td>
                    <td className="py-3 px-2 text-gray-300">{streamer.totalStreams}</td>
                    <td className="py-3 px-2 text-gray-300">{streamer.totalMatches}</td>
                    <td className="py-3 px-2 text-gray-300">{streamer.averageStreamsPerMatch.toFixed(1)}</td>
                    <td className="py-3 px-2 text-gray-300">{formatDate(streamer.firstStream)}</td>
                    <td className="py-3 px-2 text-gray-300">{formatDate(streamer.lastStream)}</td>
                    <td className="py-3 px-2">
                      {streamer.streamUrl ? (
                        <div className="flex items-center space-x-2">
                          <a
                            href={streamer.streamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{streamer.platform === 'youtube' ? 'YouTube' : 'Twitch'}</span>
                          </a>
                          <button
                            onClick={() => copyToClipboard(streamer.streamUrl || '', 'Stream URL')}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy stream URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Streamed Matches</h3>
          <div className="space-y-3">
            {matchesWithStreamers.map((matchData) => (
              <div key={matchData.match.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-white font-medium">
                        {matchData.team1Name} vs {matchData.team2Name}
                      </span>
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        Match #{matchData.match.matchNumber}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {matchData.match.scheduledTime ? 
                            formatDateTime(matchData.match.scheduledTime instanceof Date ? 
                              matchData.match.scheduledTime : 
                              new Date(matchData.match.scheduledTime)
                            ) : 
                            'Not scheduled'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-4 h-4" />
                        <span>
                          {matchData.match.team1Score} - {matchData.match.team2Score}
                        </span>
                      </div>
                    </div>
                  </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-purple-400 font-medium">
                          {extractStreamerName(matchData.streamingInfo?.streamUrl || '')}
                        </span>
                        <a
                          href={matchData.streamingInfo?.streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Watch</span>
                        </a>
                        <button
                          onClick={() => copyToClipboard(matchData.streamingInfo?.streamUrl || '', 'Stream URL')}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy stream URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-400 text-xs">
                        {matchData.streamingInfo?.streamPlatform === 'youtube' ? 'YouTube' : 'Twitch'} Stream
                      </p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamerStatisticsTab;
