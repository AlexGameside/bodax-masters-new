import React, { useState } from 'react';
import { 
  Edit3, 
  RotateCcw, 
  CheckCircle, 
  Users, 
  AlertTriangle, 
  Save,
  X,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  adminEditMatchScores, 
  adminEditMapScores,
  adminResetMatch, 
  adminForceCompleteMatch,
  adminForceCompleteMatchSwiss, 
  adminForceScheduleMatch,
  adminChangeMatchTeams 
} from '../services/firebaseService';
import type { Match, Team, User } from '../types/tournament';

interface AdminMatchManagementProps {
  match: Match;
  teams: Team[];
  currentUser: User | null;
  onMatchUpdated: () => void;
}

const AdminMatchManagement: React.FC<AdminMatchManagementProps> = ({
  match,
  teams,
  currentUser,
  onMatchUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isChangingTeams, setIsChangingTeams] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isEditingMapScores, setIsEditingMapScores] = useState(false);
  
  // Score editing state
  const [team1Score, setTeam1Score] = useState(match.team1Score || 0);
  const [team2Score, setTeam2Score] = useState(match.team2Score || 0);
  
  // Map score editing state
  const [mapResults, setMapResults] = useState({
    map1: { team1Score: match.mapResults?.map1?.team1Score || 0, team2Score: match.mapResults?.map1?.team2Score || 0 },
    map2: { team1Score: match.mapResults?.map2?.team1Score || 0, team2Score: match.mapResults?.map2?.team2Score || 0 },
    map3: { team1Score: match.mapResults?.map3?.team1Score || 0, team2Score: match.mapResults?.map3?.team2Score || 0 }
  });
  
  // Team changing state
  const [newTeam1Id, setNewTeam1Id] = useState(match.team1Id || '');
  const [newTeam2Id, setNewTeam2Id] = useState(match.team2Id || '');
  
  // Force scheduling state
  const [scheduledTime, setScheduledTime] = useState(() => {
    // Default to tomorrow at 7 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
  });

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const handleEditScores = async () => {
    if (!currentUser?.isAdmin) return;
    
    setIsEditing(true);
    try {
      await adminEditMatchScores(match.id, team1Score, team2Score, currentUser.id);
      toast.success('Match scores updated successfully!');
      onMatchUpdated();
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update match scores');
    } finally {
      setIsEditing(false);
    }
  };

  const handleResetMatch = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!window.confirm('Are you sure you want to reset this match? This will clear all scores, map data, and reset the match to initial state.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      await adminResetMatch(match.id, currentUser.id);
      toast.success('Match reset successfully!');
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset match');
    } finally {
      setIsResetting(false);
    }
  };

  const handleForceComplete = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!window.confirm('Are you sure you want to force complete this match? This will mark it as completed with the current scores.')) {
      return;
    }
    
    setIsCompleting(true);
    try {
      // Use Swiss-specific function for Swiss tournaments
      if (match.tournamentType === 'swiss-round') {
        // Check if we have custom map results to use
        const hasCustomMapScores = mapResults.map1.team1Score > 0 || mapResults.map1.team2Score > 0 ||
                                  mapResults.map2.team1Score > 0 || mapResults.map2.team2Score > 0 ||
                                  mapResults.map3.team1Score > 0 || mapResults.map3.team2Score > 0;
        
        if (hasCustomMapScores) {
          // Use custom map results
          await adminForceCompleteMatchSwiss(match.id, team1Score, team2Score, currentUser.id, mapResults);
        } else {
          // Use default hardcoded map results
          await adminForceCompleteMatchSwiss(match.id, team1Score, team2Score, currentUser.id);
        }
      } else {
        await adminForceCompleteMatch(match.id, team1Score, team2Score, currentUser.id);
      }
      toast.success('Match force completed successfully!');
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to force complete match');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleChangeTeams = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!newTeam1Id || !newTeam2Id) {
      toast.error('Please select both teams');
      return;
    }
    
    if (newTeam1Id === newTeam2Id) {
      toast.error('Teams must be different');
      return;
    }
    
    if (!window.confirm('Are you sure you want to change the teams for this match? This will reset the match state.')) {
      return;
    }
    
    setIsChangingTeams(true);
    try {
      await adminChangeMatchTeams(match.id, newTeam1Id, newTeam2Id, currentUser.id);
      toast.success('Match teams changed successfully!');
      onMatchUpdated();
      setIsChangingTeams(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to change match teams');
    } finally {
      setIsChangingTeams(false);
    }
  };

  const handleForceSchedule = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!scheduledTime) {
      toast.error('Please select a scheduled time');
      return;
    }
    
    const scheduleDate = new Date(scheduledTime);
    const now = new Date();
    
    if (scheduleDate <= now) {
      toast.error('Scheduled time must be in the future');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to force schedule this match for ${scheduleDate.toLocaleString()}? This will override any existing scheduling.`)) {
      return;
    }
    
    setIsScheduling(true);
    try {
      await adminForceScheduleMatch(match.id, scheduleDate, currentUser.id);
      toast.success('Match force scheduled successfully!');
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to force schedule match');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleForceCompleteNoShow = async () => {
    if (!currentUser?.isAdmin) return;
    
    if (!window.confirm('Are you sure you want to force complete this match with 0-0 score? This is typically used when teams cannot agree on scheduling (no-show).')) {
      return;
    }
    
    setIsCompleting(true);
    try {
      await adminForceCompleteMatch(match.id, 0, 0, currentUser.id);
      toast.success('Match force completed with 0-0 score (no-show)!');
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to force complete match');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEditMapScores = async () => {
    if (!currentUser?.isAdmin) return;
    
    // Validate that at least one map has scores
    const hasMapScores = mapResults.map1.team1Score > 0 || mapResults.map1.team2Score > 0 ||
                        mapResults.map2.team1Score > 0 || mapResults.map2.team2Score > 0 ||
                        mapResults.map3.team1Score > 0 || mapResults.map3.team2Score > 0;
    
    if (!hasMapScores) {
      toast.error('Please enter scores for at least one map');
      return;
    }
    
    if (!window.confirm('Are you sure you want to update the map scores? This will calculate the overall match result based on maps won.')) {
      return;
    }
    
    setIsEditingMapScores(true);
    try {
      await adminEditMapScores(match.id, mapResults, currentUser.id);
      toast.success('Map scores updated successfully!');
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update map scores');
    } finally {
      setIsEditingMapScores(false);
    }
  };

  if (!currentUser?.isAdmin) {
    return null;
  }

  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-red-400 font-bold text-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          ADMIN MATCH MANAGEMENT
        </h3>
        <div className="text-xs text-red-300">
          Match ID: {match.id}
        </div>
      </div>

      {/* Current Match Info */}
      <div className="bg-black/30 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Team 1:</span>
            <span className="text-white ml-2">{getTeamName(match.team1Id!)}</span>
          </div>
          <div>
            <span className="text-gray-400">Team 2:</span>
            <span className="text-white ml-2">{getTeamName(match.team2Id!)}</span>
          </div>
          <div>
            <span className="text-gray-400">Current Score:</span>
            <span className="text-white ml-2">{match.team1Score || 0} - {match.team2Score || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <span className="text-white ml-2">{match.matchState}</span>
          </div>
        </div>
      </div>

      {/* Score Editing */}
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Scores
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">
                {getTeamName(match.team1Id!)} Score
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={team1Score}
                onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">
                {getTeamName(match.team2Id!)} Score
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={team2Score}
                onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleEditScores}
              disabled={isEditing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
            >
              {isEditing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Updating...' : 'Update Scores'}</span>
            </button>
            
            <button
              onClick={handleForceComplete}
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
            >
              {isCompleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{isCompleting ? 'Completing...' : 'Force Complete'}</span>
            </button>
            
            <button
              onClick={handleForceCompleteNoShow}
              disabled={isCompleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
            >
              {isCompleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span>{isCompleting ? 'Completing...' : 'No-Show (0-0)'}</span>
            </button>
          </div>
          
          {/* Swiss Tournament Info */}
          {match.tournamentType === 'swiss-round' && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>Swiss Tournament:</strong> Force Complete will use your custom map scores below if entered, 
                otherwise it will use default scores (13-7). Enter map scores to customize the individual map results.
              </p>
            </div>
          )}
        </div>

        {/* Map Score Editing */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Map Scores
          </h4>
          
          <p className="text-gray-300 text-sm mb-4">
            Enter individual map scores. The overall match result will be calculated based on maps won (BO3 format).
          </p>
          
          <div className="space-y-4">
            {/* Map 1 */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h5 className="text-white font-medium mb-2">Map 1</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team1Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map1.team1Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map1: { ...prev.map1, team1Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team2Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map1.team2Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map1: { ...prev.map1, team2Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Map 2 */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h5 className="text-white font-medium mb-2">Map 2</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team1Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map2.team1Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map2: { ...prev.map2, team1Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team2Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map2.team2Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map2: { ...prev.map2, team2Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Map 3 */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h5 className="text-white font-medium mb-2">Map 3 (Decider)</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team1Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map3.team1Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map3: { ...prev.map3, team1Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-1">
                    {getTeamName(match.team2Id!)} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={mapResults.map3.team2Score}
                    onChange={(e) => setMapResults(prev => ({
                      ...prev,
                      map3: { ...prev.map3, team2Score: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleEditMapScores}
            disabled={isEditingMapScores}
            className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
          >
            {isEditingMapScores ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditingMapScores ? 'Updating...' : 'Update Map Scores'}</span>
          </button>
        </div>

        {/* Team Changing */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Change Teams
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">
                Team 1
              </label>
              <select
                value={newTeam1Id}
                onChange={(e) => setNewTeam1Id(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select Team 1</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">
                Team 2
              </label>
              <select
                value={newTeam2Id}
                onChange={(e) => setNewTeam2Id(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="">Select Team 2</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            onClick={handleChangeTeams}
            disabled={isChangingTeams || !newTeam1Id || !newTeam2Id}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
          >
            {isChangingTeams ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span>{isChangingTeams ? 'Changing...' : 'Change Teams'}</span>
          </button>
        </div>

        {/* Force Schedule Match */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Force Schedule Match
          </h4>
          
          <p className="text-gray-300 text-sm mb-4">
            Force schedule this match regardless of current state. This will override any existing scheduling proposals.
          </p>
          
          <div className="mb-4">
            <label className="text-gray-300 text-sm block mb-2">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          
          <button
            onClick={handleForceSchedule}
            disabled={isScheduling}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
          >
            {isScheduling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            <span>{isScheduling ? 'Scheduling...' : 'Force Schedule'}</span>
          </button>
        </div>

        {/* Reset Match */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Match
          </h4>
          
          <p className="text-gray-300 text-sm mb-4">
            This will completely reset the match to its initial state, clearing all scores, map data, and scheduling information.
          </p>
          
          <button
            onClick={handleResetMatch}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
          >
            {isResetting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>{isResetting ? 'Resetting...' : 'Reset Match'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMatchManagement;
