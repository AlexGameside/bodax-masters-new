import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Tv2, 
  Mic, 
  Eye, 
  ExternalLink, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateMatchData } from '../services/firebaseService';
import type { Match, Team } from '../types/tournament';

interface StreamingManagementProps {
  matches: Match[];
  teams: Team[];
  currentUser: any;
}

interface StreamingInfo {
  isStreamed: boolean;
  streamUrl?: string;
  streamPlatform?: 'twitch' | 'youtube';
  username?: string;
}

const StreamingManagement = ({ matches, teams, currentUser }: StreamingManagementProps) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [streamingInfo, setStreamingInfo] = useState<StreamingInfo>({
    isStreamed: false,
    streamUrl: '',
    streamPlatform: 'twitch',
    username: ''
  });
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filter matches that are scheduled or ready_up
  const upcomingMatches = matches.filter(match => 
    ['scheduled', 'ready_up', 'pending_scheduling'].includes(match.matchState)
  );

  // Filter matches that already have streamers assigned (same logic as streamer dashboard)
  const assignedMatches = matches.filter(match => 
    match.streamingInfo?.username
  );


  const getTeamById = (teamId: string | null): Team | null => {
    if (!teamId) return null;
    return teams.find(team => team.id === teamId) || null;
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

  const openModal = (match: Match) => {
    setSelectedMatch(match);
    // Check if match has streaming info (either isStreamed flag or username/URL)
    const hasStreamingInfo = match.streamingInfo?.isStreamed || 
                            !!match.streamingInfo?.username || 
                            !!match.streamingInfo?.streamUrl;
    
    setStreamingInfo({
      isStreamed: hasStreamingInfo,
      streamUrl: match.streamingInfo?.streamUrl || '',
      streamPlatform: (match.streamingInfo?.streamPlatform === 'twitch' || match.streamingInfo?.streamPlatform === 'youtube') 
        ? match.streamingInfo.streamPlatform 
        : 'twitch',
      username: match.streamingInfo?.username || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMatch(null);
    setStreamingInfo({
      isStreamed: false,
      streamUrl: '',
      streamPlatform: 'twitch'
    });
  };

  const saveStreamingInfo = async () => {
    if (!selectedMatch) return;

    setSaving(true);
    try {
      await updateMatchData(selectedMatch.id, { streamingInfo: streamingInfo });
      toast.success('Streaming information saved successfully!');
      closeModal();
    } catch (error: any) {
      toast.error(`Failed to save streaming information: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeStreamer = async (match?: Match) => {
    const targetMatch = match || selectedMatch;
    if (!targetMatch) return;

    setSaving(true);
    try {
      // Clear streaming info to remove streamer
      const clearedStreamingInfo = {
        isStreamed: false,
        streamUrl: '',
        streamPlatform: 'twitch' as 'twitch' | 'youtube',
        username: ''
      };
      
      await updateMatchData(targetMatch.id, { streamingInfo: clearedStreamingInfo });
      toast.success('Streamer removed from match successfully!');
      
      // Close modal if it was opened from modal
      if (!match) {
        closeModal();
      }
    } catch (error: any) {
      toast.error(`Failed to remove streamer: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStreamingBadge = (match: Match) => {
    if (!match.streamingInfo?.isStreamed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 border border-gray-600">
          <Tv2 className="w-3 h-3 mr-1" />
          Not Streamed
        </span>
      );
    }
    
    const isLive = match.streamingInfo.isLive;
    const platform = match.streamingInfo.streamPlatform;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
        isLive 
          ? 'bg-red-900/50 text-red-300 border-red-700' 
          : 'bg-purple-900/50 text-purple-300 border-purple-700'
      }`}>
        <Tv className="w-3 h-3 mr-1" />
        {isLive ? 'LIVE' : `${platform?.toUpperCase() || 'STREAM'}`}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-mono tracking-tight">STREAMING MANAGEMENT</h3>
            <p className="text-white/80 font-mono tracking-tight">Manage casting and streaming information for matches</p>
          </div>
        </div>


        {/* Assigned Streamers Section */}
        {assignedMatches.length > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-bold text-white font-mono mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              ASSIGNED STREAMERS ({assignedMatches.length})
            </h4>
            <div className="grid gap-4">
              {assignedMatches.map((match) => {
                const team1 = getTeamById(match.team1Id);
                const team2 = getTeamById(match.team2Id);
                
                return (
                  <div key={match.id} className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono font-medium">
                              {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                            </span>
                            {getStreamingBadge(match)}
                          </div>
                          <span className="text-gray-400 text-sm font-mono">
                            {formatDate(match.scheduledTime)}
                          </span>
                        </div>
                        
                        {match.streamingInfo?.username && (
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Mic className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-300 font-mono">
                                Streamer: {match.streamingInfo.username}
                              </span>
                            </div>
                            
                            {match.streamingInfo.streamPlatform && (
                              <div className="flex items-center space-x-2">
                                <Tv className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-300 font-mono">
                                  {match.streamingInfo.streamPlatform.toUpperCase()}
                                </span>
                              </div>
                            )}
                            
                            {match.streamingInfo.streamUrl && (
                              <div className="flex items-center space-x-2">
                                <ExternalLink className="w-4 h-4 text-green-400" />
                                <a 
                                  href={match.streamingInfo.streamUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-300 hover:text-green-200 font-mono underline"
                                >
                                  View Stream
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(match)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium font-mono flex items-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>MANAGE</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to remove the streamer from this match?')) {
                              removeStreamer(match);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium font-mono flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>UNASSIGN</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matches List */}
        <div className="space-y-4">
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-700/50">
                <Tv className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2 font-mono">NO UPCOMING MATCHES</h4>
                <p className="text-gray-400 font-mono">No matches are currently scheduled for streaming management.</p>
              </div>
            </div>
          ) : (
            upcomingMatches.map((match) => {
              const team1 = getTeamById(match.team1Id);
              const team2 = getTeamById(match.team2Id);
              
              return (
                <div
                  key={match.id}
                  className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-pink-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h4 className="text-lg font-bold text-white font-mono">
                          {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                        </h4>
                        {getStreamingBadge(match)}
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-300 font-mono">
                        <span>Scheduled: {formatDate(match.scheduledTime)}</span>
                        <span>Round {match.round} • Match {match.matchNumber}</span>
                        <span>Format: {match.matchFormat || 'BO1'}</span>
                      </div>
                      {match.streamingInfo?.casters && match.streamingInfo.casters.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {match.streamingInfo.casters.map((caster, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50"
                              >
                                <Mic className="w-3 h-3 mr-1" />
                                {caster.name} ({caster.role})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => openModal(match)}
                      className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors font-medium font-mono text-sm flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>MANAGE</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Streaming Info Modal */}
      {showModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white font-mono">MANAGE STREAMING INFO</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Match Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-600/50">
              <h4 className="text-lg font-bold text-white mb-2 font-mono">
                {getTeamById(selectedMatch.team1Id)?.name || 'TBD'} vs {getTeamById(selectedMatch.team2Id)?.name || 'TBD'}
              </h4>
              <div className="text-sm text-gray-300 font-mono">
                <span>Scheduled: {formatDate(selectedMatch.scheduledTime)}</span>
                <span className="mx-2">•</span>
                <span>Round {selectedMatch.round} • Match {selectedMatch.matchNumber}</span>
              </div>
            </div>

            {/* Streaming Toggle */}
            <div className="mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={streamingInfo.isStreamed}
                  onChange={(e) => setStreamingInfo(prev => ({ ...prev, isStreamed: e.target.checked }))}
                  className="w-5 h-5 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
                />
                <span className="text-white font-mono font-medium">This match will be streamed</span>
              </label>
            </div>

            {/* Streaming Details */}
            {streamingInfo.isStreamed && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">Stream Platform</label>
                    <select
                      value={streamingInfo.streamPlatform || 'twitch'}
                      onChange={(e) => setStreamingInfo(prev => ({ ...prev, streamPlatform: e.target.value as any }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="twitch">Twitch</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">Username</label>
                    <input
                      type="text"
                      value={streamingInfo.username || ''}
                      onChange={(e) => setStreamingInfo(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="username"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">Stream URL</label>
                    <input
                      type="url"
                      value={streamingInfo.streamUrl || ''}
                      onChange={(e) => setStreamingInfo(prev => ({ ...prev, streamUrl: e.target.value }))}
                      placeholder="https://twitch.tv/username"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Streamer Dashboard Link */}
                {streamingInfo.username && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h4 className="text-green-300 font-medium mb-2">Streamer Dashboard</h4>
                    <p className="text-green-200 text-sm mb-3">
                      Share this link with the streamer to access their personal dashboard for this match.
                    </p>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={`${window.location.origin}/streamer/${streamingInfo.username}`}
                        readOnly
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/streamer/${streamingInfo.username}`);
                          toast.success('Streamer dashboard link copied!');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              {selectedMatch?.streamingInfo?.username && (
                <button
                  onClick={() => removeStreamer()}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium font-mono flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>REMOVING...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>REMOVE STREAMER</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Save and Cancel Buttons */}
              <div className="flex space-x-3 ml-auto">
                <button
                  onClick={closeModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium font-mono"
                >
                  CANCEL
                </button>
                <button
                  onClick={saveStreamingInfo}
                  disabled={saving}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg transition-colors font-medium font-mono flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>SAVING...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingManagement;
