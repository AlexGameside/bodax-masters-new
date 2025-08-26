import React, { useState, useEffect } from 'react';
import { Users, User, Shield, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Team, User as UserType } from '../types/tournament';

interface ReadyUpFormProps {
  team: Team;
  teamPlayers: UserType[];
  onSubmit: (roster: {
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ReadyUpForm: React.FC<ReadyUpFormProps> = ({
  team,
  teamPlayers,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [selectedMainPlayers, setSelectedMainPlayers] = useState<string[]>([]);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [selectedAssistantCoach, setSelectedAssistantCoach] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  // Filter players by role - include owner, captain, and all members
  const allTeamMembers = teamPlayers.filter(player => 
    team.members.find(member => member.userId === player.id)
  );
  
  // For main players, include owner, captain, and members
  const mainPlayers = allTeamMembers;
  
  console.log('[ReadyUpForm] Team data:', {
    teamId: team.id,
    teamName: team.name,
    ownerId: team.ownerId,
    captainId: team.captainId,
    members: team.members,
    teamPlayers: teamPlayers,
    allTeamMembers: allTeamMembers,
    mainPlayers: mainPlayers
  });
  
  // For staff roles, filter by specific roles
  const coaches = teamPlayers.filter(player => 
    team.members.find(member => member.userId === player.id)?.role === 'coach'
  );
  const assistantCoaches = teamPlayers.filter(player => 
    team.members.find(member => member.userId === player.id)?.role === 'assistant_coach'
  );
  const managers = teamPlayers.filter(player => 
    team.members.find(member => member.userId === player.id)?.role === 'manager'
  );

  const handleMainPlayerToggle = (playerId: string) => {
    setSelectedMainPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        if (prev.length < 5) {
          return [...prev, playerId];
        }
        return prev;
      }
    });
  };

  const handleSubstituteToggle = (playerId: string) => {
    setSelectedSubstitutes(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        if (prev.length < 2) {
          return [...prev, playerId];
        }
        return prev;
      }
    });
  };

  const handleSubmit = async () => {
    const newErrors: string[] = [];

    // Validation
    if (selectedMainPlayers.length !== 5) {
      newErrors.push('You must select exactly 5 main players');
    }

    if (selectedMainPlayers.length + selectedSubstitutes.length < 5) {
      newErrors.push('You must have at least 5 total players');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        mainPlayers: selectedMainPlayers,
        substitutes: selectedSubstitutes,
        ...(selectedCoach && { coach: selectedCoach }),
        ...(selectedAssistantCoach && { assistantCoach: selectedAssistantCoach }),
        ...(selectedManager && { manager: selectedManager }),
      });
    } catch (error) {
      console.error('Error submitting ready-up:', error);
    }
  };

  const getPlayerRole = (playerId: string) => {
    const member = team.members.find(m => m.userId === playerId);
    return member?.role || 'member';
  };

  const isPlayerSelected = (playerId: string) => {
    return selectedMainPlayers.includes(playerId) || selectedSubstitutes.includes(playerId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-4xl w-full mx-4 border border-blue-400/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600/20 p-3 rounded-full">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready Up - {team.name}</h3>
            <p className="text-blue-200">Select your match roster and confirm readiness</p>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-bold">Please fix the following errors:</span>
            </div>
            <ul className="text-red-200 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Players Selection */}
          <div className="space-y-4">
            <div className="bg-black/60 border border-blue-700/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h4 className="text-lg font-bold text-white">Main Players (5 Required)</h4>
                <span className="text-blue-300 text-sm">
                  {selectedMainPlayers.length}/5
                </span>
              </div>
              
              <div className="space-y-2">
                {mainPlayers.map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedMainPlayers.includes(player.id)
                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                    onClick={() => handleMainPlayerToggle(player.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedMainPlayers.includes(player.id)
                        ? 'bg-blue-500 border-blue-400'
                        : 'border-gray-400'
                    }`}>
                      {selectedMainPlayers.includes(player.id) && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{player.username}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {getPlayerRole(player.id)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Substitutes Selection */}
            <div className="bg-black/60 border border-purple-700/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-bold text-white">Substitutes (Optional, Max 2)</h4>
                <span className="text-purple-300 text-sm">
                  {selectedSubstitutes.length}/2
                </span>
              </div>
              
              <div className="space-y-2">
                {mainPlayers.filter(player => !selectedMainPlayers.includes(player.id)).map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedSubstitutes.includes(player.id)
                        ? 'bg-purple-600/20 border-purple-500/50 text-white'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                    onClick={() => handleSubstituteToggle(player.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedSubstitutes.includes(player.id)
                        ? 'bg-purple-500 border-purple-400'
                        : 'border-gray-400'
                    }`}>
                      {selectedSubstitutes.includes(player.id) && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{player.username}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {getPlayerRole(player.id)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Selection */}
          <div className="space-y-4">
            {/* Coach Selection */}
            {coaches.length > 0 && (
              <div className="bg-black/60 border border-green-700/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-green-400" />
                  <h4 className="text-lg font-bold text-white">Coach (Optional)</h4>
                </div>
                
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">No Coach</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>
                      {coach.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assistant Coach Selection */}
            {assistantCoaches.length > 0 && (
              <div className="bg-black/60 border border-yellow-700/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-lg font-bold text-white">Assistant Coach (Optional)</h4>
                </div>
                
                <select
                  value={selectedAssistantCoach}
                  onChange={(e) => setSelectedAssistantCoach(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">No Assistant Coach</option>
                  {assistantCoaches.map(assistantCoach => (
                    <option key={assistantCoach.id} value={assistantCoach.id}>
                      {assistantCoach.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager Selection */}
            {managers.length > 0 && (
              <div className="bg-black/60 border border-pink-700/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-pink-400" />
                  <h4 className="text-lg font-bold text-white">Manager (Optional)</h4>
                </div>
                
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="">No Manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Roster Summary */}
            <div className="bg-black/60 border border-cyan-700/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-cyan-400" />
                <h4 className="text-lg font-bold text-white">Roster Summary</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Main Players:</span>
                  <span className="text-white font-medium">
                    {selectedMainPlayers.length}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Substitutes:</span>
                  <span className="text-white font-medium">
                    {selectedSubstitutes.length}/2
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Coach:</span>
                  <span className="text-white font-medium">
                    {selectedCoach ? 'Selected' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Assistant Coach:</span>
                  <span className="text-white font-medium">
                    {selectedAssistantCoach ? 'Selected' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Manager:</span>
                  <span className="text-white font-medium">
                    {selectedManager ? 'Selected' : 'None'}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Players:</span>
                    <span className="text-white font-medium">
                      {selectedMainPlayers.length + selectedSubstitutes.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedMainPlayers.length !== 5}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ready Up...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Ready Up
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadyUpForm; 