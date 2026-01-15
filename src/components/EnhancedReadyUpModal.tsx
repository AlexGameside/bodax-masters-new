import React, { useState, useEffect } from 'react';
import { getPublicUserData } from '../services/firebaseService';
import type { Match, Team, User, MatchTeamRoster } from '../types/tournament';
import { BodaxModal } from './ui';

interface EnhancedReadyUpModalProps {
  match: Match;
  team: Team;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onReadyUp: (roster: MatchTeamRoster) => void;
}

const EnhancedReadyUpModal: React.FC<EnhancedReadyUpModalProps> = ({
  match,
  team,
  currentUser,
  isOpen,
  onClose,
  onReadyUp
}) => {
  // `currentUser` is intentionally kept in props for parity with other modals / future checks.
  const [selectedRoster, setSelectedRoster] = useState<{
    mainPlayers: string[];
    substitutes: string[];
    coach?: string;
    assistantCoach?: string;
    manager?: string;
  }>({
    mainPlayers: [],
    substitutes: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [userData, setUserData] = useState<{[key: string]: {username: string, riotId: string}}>({});

  // Get team members for selection
  const availableMembers = team.members.filter(member => member.isActive);
  
  // Get tournament requirements
  const tournamentRequirements = {
    minMainPlayers: 5,
    maxMainPlayers: 5,
    minSubstitutes: 0,
    maxSubstitutes: 2,
    allowCoaches: true,
    allowAssistantCoaches: true,
    allowManagers: true
  };

  useEffect(() => {
    if (isOpen && match.scheduledTime) {
      // Calculate time remaining until match starts
      const now = new Date().getTime();
      const matchTime = new Date(match.scheduledTime).getTime();
      const timeUntilMatch = matchTime - now;
      
      if (timeUntilMatch > 0) {
        setTimeRemaining(Math.floor(timeUntilMatch / 1000));
      }
    }
  }, [isOpen, match.scheduledTime]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Fetch user data for all team members
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const realUserData: {[key: string]: {username: string, riotId: string}} = {};
        
        // Fetch real user data for each team member
        for (const member of team.members) {
          try {
            const userData = await getPublicUserData(member.userId);
            if (userData) {
              realUserData[member.userId] = {
                username: userData.username,
                riotId: userData.riotId
              };
            } else {
              // Fallback if user not found
              realUserData[member.userId] = {
                username: 'Unknown',
                riotId: 'Unknown'
              };
            }
          } catch (error) {

            realUserData[member.userId] = {
              username: 'Error',
              riotId: 'Error'
            };
          }
        }
        
        setUserData(realUserData);
      } catch (error) {

      }
    };

    fetchUserData();
  }, [team.members]);

  const handlePlayerSelection = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedRoster(prev => {
      const newState = { ...prev };
      
      // Remove user from all other roles first
      newState.mainPlayers = newState.mainPlayers.filter(id => id !== userId);
      newState.substitutes = newState.substitutes.filter(id => id !== userId);
      if (newState.coach === userId) newState.coach = undefined;
      if (newState.assistantCoach === userId) newState.assistantCoach = undefined;
      if (newState.manager === userId) newState.manager = undefined;
      
      // Add user to selected role
      switch (role) {
        case 'main_player':
          if (newState.mainPlayers.length < tournamentRequirements.maxMainPlayers) {
            newState.mainPlayers.push(userId);
          }
          break;
        case 'substitute':
          if (newState.substitutes.length < tournamentRequirements.maxSubstitutes) {
            newState.substitutes.push(userId);
          }
          break;
        case 'coach':
          if (tournamentRequirements.allowCoaches) {
            newState.coach = userId;
          }
          break;
        case 'assistant_coach':
          if (tournamentRequirements.allowAssistantCoaches) {
            newState.assistantCoach = userId;
          }
          break;
        case 'manager':
          if (tournamentRequirements.allowManagers) {
            newState.manager = userId;
          }
          break;
      }
      
      return newState;
    });
  };

  const removePlayer = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedRoster(prev => {
      const newState = { ...prev };
      
      switch (role) {
        case 'main_player':
          newState.mainPlayers = newState.mainPlayers.filter(id => id !== userId);
          break;
        case 'substitute':
          newState.substitutes = newState.substitutes.filter(id => id !== userId);
          break;
        case 'coach':
          newState.coach = undefined;
          break;
        case 'assistant_coach':
          newState.assistantCoach = undefined;
          break;
        case 'manager':
          newState.manager = undefined;
          break;
      }
      
      return newState;
    });
  };

  const isRosterValid = () => {
    return (
      selectedRoster.mainPlayers.length === tournamentRequirements.maxMainPlayers &&
      selectedRoster.substitutes.length <= tournamentRequirements.maxSubstitutes
    );
  };

  const handleReadyUp = async () => {
    if (!isRosterValid()) {
      setError('Please select exactly 5 main players');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const roster: MatchTeamRoster = {
        teamId: team.id,
        mainPlayers: selectedRoster.mainPlayers,
        substitutes: selectedRoster.substitutes,
        coach: selectedRoster.coach,
        assistantCoach: selectedRoster.assistantCoach,
        manager: selectedRoster.manager,
        readyUpTime: new Date(),
        isReady: true
      };

      onReadyUp(roster);
      onClose();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to ready up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMemberName = (userId: string) => {
    const member = team.members.find(m => m.userId === userId);
    const user = userData[userId];
    if (member && user) {
      return `${user.username} (${user.riotId})`;
    } else if (member) {
      return `${userId} (${member.role})`;
    }
    return userId;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-600';
      case 'captain': return 'bg-blue-600';
      case 'member': return 'bg-gray-600';
      case 'coach': return 'bg-green-600';
      case 'assistant_coach': return 'bg-teal-600';
      case 'manager': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Stable role lookup (prevents “jumpy” available list)
  const getAssignedRole = (userId: string): 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager' | null => {
    if (selectedRoster.mainPlayers.includes(userId)) return 'main_player';
    if (selectedRoster.substitutes.includes(userId)) return 'substitute';
    if (selectedRoster.coach === userId) return 'coach';
    if (selectedRoster.assistantCoach === userId) return 'assistant_coach';
    if (selectedRoster.manager === userId) return 'manager';
    return null;
  };

  if (!isOpen) return null;

  return (
    <BodaxModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ready Up`}
      subtitle={`Match #${match.matchNumber} · Round ${match.round}`}
      maxWidthClassName="max-w-6xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReadyUp}
            disabled={!isRosterValid() || isSubmitting}
            className={`px-6 py-3 font-bodax text-xl uppercase tracking-wider transition-colors border ${
              !isRosterValid() || isSubmitting
                ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white border-red-800'
            }`}
          >
            {isSubmitting ? 'Readying Up...' : 'Ready Up'}
          </button>
        </div>
      }
    >
      <div className="max-h-[72vh] overflow-y-auto pr-2">
        {/* Header / context */}
        <div className="bg-black/30 border border-gray-800 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-white font-bodax text-2xl uppercase tracking-wider">{team.name}</div>
              <div className="text-gray-400 font-mono text-xs uppercase tracking-widest mt-1">
                Main: {tournamentRequirements.minMainPlayers}-{tournamentRequirements.maxMainPlayers} / Subs: {tournamentRequirements.minSubstitutes}-{tournamentRequirements.maxSubstitutes}
                {tournamentRequirements.allowCoaches ? ' / Coach' : ''}
                {tournamentRequirements.allowAssistantCoaches ? ' / Asst Coach' : ''}
                {tournamentRequirements.allowManagers ? ' / Manager' : ''}
              </div>
            </div>
            <div className="text-gray-400 font-mono text-xs uppercase tracking-widest">
              Match: <span className="text-red-400">#{match.matchNumber}</span> / Round: <span className="text-red-400">{match.round}</span>
            </div>
          </div>
        </div>

        {timeRemaining > 0 && (
          <div className="bg-yellow-900/10 border border-yellow-900 p-4 mb-6">
            <div className="text-yellow-400 font-medium text-center font-mono uppercase tracking-widest">
              ⏰ Match starts in: {formatTime(timeRemaining)}
            </div>
            <div className="text-yellow-300 text-sm text-center mt-1 font-mono">
              Select your active roster before the match begins.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 border font-mono text-sm bg-red-900/10 border-red-800 text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available members (stable list) */}
          <div className="bg-black/30 border border-gray-800 p-5">
            <div className="text-red-500 font-bodax text-sm uppercase tracking-wider mb-3">Available Members</div>
            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {availableMembers.map((member) => {
                const selectedRole = getAssignedRole(member.userId);
                const isAssigned = !!selectedRole;

                const canAddMain = !isAssigned && selectedRoster.mainPlayers.length < tournamentRequirements.maxMainPlayers;
                const canAddSub = !isAssigned && selectedRoster.substitutes.length < tournamentRequirements.maxSubstitutes;
                const canSetCoach = !isAssigned && tournamentRequirements.allowCoaches && !selectedRoster.coach;
                const canSetAsst = !isAssigned && tournamentRequirements.allowAssistantCoaches && !selectedRoster.assistantCoach;
                const canSetManager = !isAssigned && tournamentRequirements.allowManagers && !selectedRoster.manager;

                return (
                  <div
                    key={member.userId}
                    className={`border p-3 ${isAssigned ? 'border-red-800 bg-red-900/10' : 'border-gray-800 bg-black/30'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          {userData[member.userId]?.username || member.userId}
                        </div>
                        <div className="text-gray-400 text-xs font-mono truncate">
                          {userData[member.userId]?.riotId || 'No Riot ID'}
                        </div>
                        <div className="text-gray-500 text-[11px] font-mono uppercase tracking-wider mt-1">
                          team role: {member.role}
                          {isAssigned ? ` / selected: ${selectedRole?.replace(/_/g, ' ')}` : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePlayerSelection(member.userId, 'main_player')}
                          disabled={!canAddMain || isSubmitting}
                          className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Main
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayerSelection(member.userId, 'substitute')}
                          disabled={!canAddSub || isSubmitting}
                          className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sub
                        </button>
                        {tournamentRequirements.allowCoaches && (
                          <button
                            type="button"
                            onClick={() => handlePlayerSelection(member.userId, 'coach')}
                            disabled={!canSetCoach || isSubmitting}
                            className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Coach
                          </button>
                        )}
                        {tournamentRequirements.allowAssistantCoaches && (
                          <button
                            type="button"
                            onClick={() => handlePlayerSelection(member.userId, 'assistant_coach')}
                            disabled={!canSetAsst || isSubmitting}
                            className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Asst
                          </button>
                        )}
                        {tournamentRequirements.allowManagers && (
                          <button
                            type="button"
                            onClick={() => handlePlayerSelection(member.userId, 'manager')}
                            disabled={!canSetManager || isSubmitting}
                            className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                          >
                            Manager
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected roster */}
          <div className="space-y-4">
            <div className="bg-black/30 border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider">Main Players</div>
                <div className="text-gray-400 font-mono text-xs">{selectedRoster.mainPlayers.length}/{tournamentRequirements.maxMainPlayers}</div>
              </div>
              <div className="space-y-2">
                {selectedRoster.mainPlayers.length === 0 ? (
                  <div className="text-gray-500 font-mono text-sm">Pick main players from the left.</div>
                ) : (
                  selectedRoster.mainPlayers.map((userId) => (
                    <div key={userId} className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{userData[userId]?.username || userId}</div>
                        <div className="text-gray-400 text-xs font-mono truncate">{userData[userId]?.riotId || 'No Riot ID'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayer(userId, 'main_player')}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-black/30 border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider">Substitutes</div>
                <div className="text-gray-400 font-mono text-xs">{selectedRoster.substitutes.length}/{tournamentRequirements.maxSubstitutes}</div>
              </div>
              <div className="space-y-2">
                {selectedRoster.substitutes.length === 0 ? (
                  <div className="text-gray-500 font-mono text-sm">Optional.</div>
                ) : (
                  selectedRoster.substitutes.map((userId) => (
                    <div key={userId} className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{userData[userId]?.username || userId}</div>
                        <div className="text-gray-400 text-xs font-mono truncate">{userData[userId]?.riotId || 'No Riot ID'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayer(userId, 'substitute')}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {(tournamentRequirements.allowCoaches || tournamentRequirements.allowAssistantCoaches || tournamentRequirements.allowManagers) && (
              <div className="bg-black/30 border border-gray-800 p-5">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider mb-3">Staff (Optional)</div>
                <div className="space-y-2 font-mono text-sm">
                  {tournamentRequirements.allowCoaches && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Coach</span>
                      {selectedRoster.coach ? (
                        <button
                          type="button"
                          onClick={() => removePlayer(selectedRoster.coach!, 'coach')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {userData[selectedRoster.coach]?.username || 'Selected'} (remove)
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  )}
                  {tournamentRequirements.allowAssistantCoaches && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Assistant Coach</span>
                      {selectedRoster.assistantCoach ? (
                        <button
                          type="button"
                          onClick={() => removePlayer(selectedRoster.assistantCoach!, 'assistant_coach')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {userData[selectedRoster.assistantCoach]?.username || 'Selected'} (remove)
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  )}
                  {tournamentRequirements.allowManagers && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Manager</span>
                      {selectedRoster.manager ? (
                        <button
                          type="button"
                          onClick={() => removePlayer(selectedRoster.manager!, 'manager')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {userData[selectedRoster.manager]?.username || 'Selected'} (remove)
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BodaxModal>
  );
};

export default EnhancedReadyUpModal; 