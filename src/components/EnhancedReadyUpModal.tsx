import React, { useState, useEffect } from 'react';
import { getUserById } from '../services/firebaseService';
import type { Match, Team, User, MatchTeamRoster } from '../types/tournament';

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
            const user = await getUserById(member.userId);
            if (user) {
              realUserData[member.userId] = {
                username: user.username || 'Unknown',
                riotId: user.riotId || 'Unknown'
              };
            } else {
              // Fallback if user not found
              realUserData[member.userId] = {
                username: 'Unknown',
                riotId: 'Unknown'
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch user ${member.userId}:`, error);
            realUserData[member.userId] = {
              username: 'Error',
              riotId: 'Error'
            };
          }
        }
        
        setUserData(realUserData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-8">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Ready Up - Match #{match.matchNumber}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Match Info */}
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="text-white font-medium mb-1">
            {team.name} vs Opponent
          </div>
          <div className="text-gray-300 text-sm">
            Round {match.round} • {match.tournamentType === 'swiss-round' ? `Swiss Round ${match.swissRound}` : 'Playoff'}
          </div>
        </div>

        {/* Time Remaining */}
        {timeRemaining > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-4">
            <div className="text-yellow-400 font-medium text-center">
              ⏰ Match starts in: {formatTime(timeRemaining)}
            </div>
            <div className="text-yellow-300 text-sm text-center mt-1">
              Please select your active roster before the match begins
            </div>
          </div>
        )}

        {/* Requirements */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-4">
          <h4 className="text-blue-400 font-medium mb-2">Roster Requirements:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-blue-300">Main Players:</div>
              <div className="text-white font-medium">5 Required</div>
            </div>
            <div>
              <div className="text-blue-300">Substitutes:</div>
              <div className="text-white font-medium">0-2 Optional</div>
            </div>
            <div>
              <div className="text-blue-300">Coach:</div>
              <div className="text-white font-medium">Optional</div>
            </div>
            <div>
              <div className="text-blue-300">Manager:</div>
              <div className="text-white font-medium">Optional</div>
            </div>
          </div>
        </div>

        {/* Roster Selection */}
        <div className="space-y-4">
          {/* Main Players */}
          <div>
            <h4 className="text-base font-semibold text-white mb-2">
              Main Players ({selectedRoster.mainPlayers.length}/5) *
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {selectedRoster.mainPlayers.map(userId => (
                <div key={userId} className="flex items-center justify-between bg-green-900/20 border border-green-700 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getRoleColor('member')}`}></span>
                    <span className="text-white text-sm font-medium">{getMemberName(userId)}</span>
                  </div>
                  <button
                    onClick={() => removePlayer(userId, 'main_player')}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {selectedRoster.mainPlayers.length < 5 && (
              <div>
                <div className="text-gray-400 text-xs mb-1">Select Main Players:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {availableMembers
                    .filter(member => !selectedRoster.mainPlayers.includes(member.userId) && 
                                     !selectedRoster.substitutes.includes(member.userId) &&
                                     member.userId !== selectedRoster.coach &&
                                     member.userId !== selectedRoster.assistantCoach &&
                                     member.userId !== selectedRoster.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handlePlayerSelection(member.userId, 'main_player')}
                        className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div>
                            <div className="text-white text-sm font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-gray-400 text-xs">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                          </div>
                        </div>
                        <div className="text-gray-400 text-xs capitalize">{member.role}</div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Substitutes */}
          <div>
            <h4 className="text-base font-semibold text-white mb-2">
              Substitutes ({selectedRoster.substitutes.length}/2)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {selectedRoster.substitutes.map(userId => (
                <div key={userId} className="flex items-center justify-between bg-blue-900/20 border border-blue-700 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getRoleColor('member')}`}></span>
                    <span className="text-white text-sm">{getMemberName(userId)}</span>
                  </div>
                  <button
                    onClick={() => removePlayer(userId, 'substitute')}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {selectedRoster.substitutes.length < 2 && (
              <div>
                <div className="text-gray-400 text-xs mb-1">Select Substitutes:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {availableMembers
                    .filter(member => !selectedRoster.mainPlayers.includes(member.userId) && 
                                     !selectedRoster.substitutes.includes(member.userId) &&
                                     member.userId !== selectedRoster.coach &&
                                     member.userId !== selectedRoster.assistantCoach &&
                                     member.userId !== selectedRoster.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handlePlayerSelection(member.userId, 'substitute')}
                        className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div>
                            <div className="text-white text-sm font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-gray-400 text-xs">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                          </div>
                        </div>
                        <div className="text-gray-400 text-xs capitalize">{member.role}</div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Coach Selection */}
          <div>
            <h4 className="text-base font-semibold text-white mb-2">
              Coach (Optional)
            </h4>
            {selectedRoster.coach ? (
              <div className="flex items-center justify-between bg-green-900/20 border border-green-700 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getRoleColor('coach')}`}></span>
                  <span className="text-white text-sm">{getMemberName(selectedRoster.coach)}</span>
                </div>
                <button
                  onClick={() => removePlayer(selectedRoster.coach!, 'coach')}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {availableMembers
                  .filter(member => !selectedRoster.mainPlayers.includes(member.userId) && 
                                   !selectedRoster.substitutes.includes(member.userId) &&
                                   member.userId !== selectedRoster.assistantCoach &&
                                   member.userId !== selectedRoster.manager)
                  .map(member => (
                    <button
                      key={member.userId}
                      onClick={() => handlePlayerSelection(member.userId, 'coach')}
                      className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getRoleColor(member.role)}`}></span>
                        <div>
                          <div className="text-white text-sm font-medium">{userData[member.userId]?.username || member.userId}</div>
                          <div className="text-gray-400 text-xs">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs capitalize">{member.role}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Manager Selection */}
          <div>
            <h4 className="text-base font-semibold text-white mb-2">
              Manager (Optional)
            </h4>
            {selectedRoster.manager ? (
              <div className="flex items-center justify-between bg-orange-900/20 border border-orange-700 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getRoleColor('manager')}`}></span>
                  <span className="text-white text-sm">{getMemberName(selectedRoster.manager)}</span>
                </div>
                <button
                  onClick={() => removePlayer(selectedRoster.manager!, 'manager')}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {availableMembers
                  .filter(member => !selectedRoster.mainPlayers.includes(member.userId) && 
                                   !selectedRoster.substitutes.includes(member.userId) &&
                                   member.userId !== selectedRoster.coach &&
                                   member.userId !== selectedRoster.assistantCoach)
                  .map(member => (
                    <button
                      key={member.userId}
                      onClick={() => handlePlayerSelection(member.userId, 'manager')}
                      className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getRoleColor(member.role)}`}></span>
                        <div>
                          <div className="text-white text-sm font-medium">{userData[member.userId]?.username || member.userId}</div>
                          <div className="text-gray-400 text-xs">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs capitalize">{member.role}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mt-4">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleReadyUp}
            disabled={!isRosterValid() || isSubmitting}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              !isRosterValid() || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500'
            } text-white`}
          >
            {isSubmitting ? 'Readying Up...' : 'Ready Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedReadyUpModal; 