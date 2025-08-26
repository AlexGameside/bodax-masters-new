import React, { useState, useEffect } from 'react';
import { signupTeamForTournament, getUserById } from '../services/firebaseService';
import type { User, Team, Tournament, TournamentTeamMember } from '../types/tournament';

interface EnhancedTeamRegistrationProps {
  tournament: Tournament;
  team: Team;
  currentUser: User;
  onRegistrationComplete: () => void;
  onCancel: () => void;
}

const EnhancedTeamRegistration: React.FC<EnhancedTeamRegistrationProps> = ({
  tournament,
  team,
  currentUser,
  onRegistrationComplete,
  onCancel
}) => {
  const [selectedMembers, setSelectedMembers] = useState<{
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
  const [success, setSuccess] = useState<string>('');

  // Get all active team members - owner and captain can also be players if needed
  const availableMembers = team.members.filter(member => member.isActive);

  // State to store user data
  const [userData, setUserData] = useState<{[key: string]: {username: string, riotId: string}}>({});

  const requirements = tournament.requirements;

  useEffect(() => {
    // Start with no players selected - let users choose manually
    setSelectedMembers(prev => ({
      ...prev,
      mainPlayers: []
    }));

    // Fetch user data for all team members
    const fetchUserData = async () => {
      try {
        const realUserData: {[key: string]: {username: string, riotId: string}} = {};
        
        // Debug: Log team members to check for duplicates
        console.log('Team members:', team.members);
        console.log('Team owner ID:', team.ownerId);
        console.log('Team captain ID:', team.captainId);
        
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
  }, [team.ownerId, team.captainId, team.members]);

  const handleMemberSelection = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedMembers(prev => {
      const newState = { ...prev };
      
      // Debug: Log the selection action
      console.log(`Adding user ${userId} to role ${role}`);
      console.log('Current state before:', prev);
      
      // Remove user from all other roles first
      newState.mainPlayers = newState.mainPlayers.filter(id => id !== userId);
      newState.substitutes = newState.substitutes.filter(id => id !== userId);
      if (newState.coach === userId) newState.coach = undefined;
      if (newState.assistantCoach === userId) newState.assistantCoach = undefined;
      if (newState.manager === userId) newState.manager = undefined;
      
      // Add user to selected role
      switch (role) {
        case 'main_player':
          if (newState.mainPlayers.length < requirements.maxMainPlayers) {
            newState.mainPlayers.push(userId);
            console.log(`Added ${userId} to main players. New count: ${newState.mainPlayers.length}`);
          } else {
            console.warn(`Cannot add ${userId} to main players. Already at max: ${requirements.maxMainPlayers}`);
          }
          break;
        case 'substitute':
          if (newState.substitutes.length < requirements.maxSubstitutes) {
            newState.substitutes.push(userId);
            console.log(`Added ${userId} to substitutes. New count: ${newState.substitutes.length}`);
          } else {
            console.warn(`Cannot add ${userId} to substitutes. Already at max: ${requirements.maxSubstitutes}`);
          }
          break;
        case 'coach':
          if (requirements.allowCoaches) {
            newState.coach = userId;
            console.log(`Set ${userId} as coach`);
          }
          break;
        case 'assistant_coach':
          if (requirements.allowAssistantCoaches) {
            newState.assistantCoach = userId;
            console.log(`Set ${userId} as assistant coach`);
          }
          break;
        case 'manager':
          if (requirements.allowManagers) {
            newState.manager = userId;
            console.log(`Set ${userId} as manager`);
          }
          break;
      }
      
      console.log('New state after:', newState);
      return newState;
    });
  };

  const removeMember = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedMembers(prev => {
      const newState = { ...prev };
      
      console.log(`Removing user ${userId} from role ${role}`);
      console.log('Current state before removal:', prev);
      
      switch (role) {
        case 'main_player':
          newState.mainPlayers = newState.mainPlayers.filter(id => id !== userId);
          console.log(`Removed ${userId} from main players. New count: ${newState.mainPlayers.length}`);
          break;
        case 'substitute':
          newState.substitutes = newState.substitutes.filter(id => id !== userId);
          console.log(`Removed ${userId} from substitutes. New count: ${newState.substitutes.length}`);
          break;
        case 'coach':
          newState.coach = undefined;
          console.log(`Removed ${userId} as coach`);
          break;
        case 'assistant_coach':
          newState.assistantCoach = undefined;
          console.log(`Removed ${userId} as assistant coach`);
          break;
        case 'manager':
          newState.manager = undefined;
          console.log(`Removed ${userId} as manager`);
          break;
      }
      
      console.log('New state after removal:', newState);
      return newState;
    });
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

  const getMemberDisplayInfo = (userId: string) => {
    const member = team.members.find(m => m.userId === userId);
    const user = userData[userId];
    if (member && user) {
      return {
        username: user.username,
        riotId: user.riotId,
        role: member.role
      };
    } else if (member) {
      return {
        username: 'Unknown',
        riotId: 'Unknown',
        role: member.role
      };
    }
    return {
      username: 'Unknown',
      riotId: 'Unknown',
      role: 'Unknown'
    };
  };

  const isRegistrationValid = () => {
    return (
      selectedMembers.mainPlayers.length >= requirements.minMainPlayers &&
      selectedMembers.mainPlayers.length <= requirements.maxMainPlayers &&
      selectedMembers.substitutes.length >= requirements.minSubstitutes &&
      selectedMembers.substitutes.length <= requirements.maxSubstitutes
    );
  };

  const handleSubmit = async () => {
    if (!isRegistrationValid()) {
      setError('Please select the correct number of players for each role');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Actually register the team for the tournament
      await signupTeamForTournament(tournament.id, team.id);
      
      setSuccess('Team registered successfully for tournament!');
      setTimeout(() => {
        onRegistrationComplete();
      }, 2000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to register team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-600';
      case 'captain': return 'bg-cyan-600';
      case 'member': return 'bg-pink-600';
      case 'coach': return 'bg-green-600';
      case 'assistant_coach': return 'bg-teal-600';
      case 'manager': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gradient-to-br from-pink-500/10 via-magenta-600/10 to-purple-700/10 backdrop-blur-sm rounded-2xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-pink-400/30 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Tournament Team Registration</h2>
            <div className="text-pink-200 text-lg">Unity League 2025</div>
          </div>
          <button
            onClick={onCancel}
            className="text-pink-400 hover:text-white text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>
      
        {/* Team Info */}
        <div className="bg-black/60 border border-cyan-400/30 rounded-xl p-6 mb-8 shadow-lg backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-3">{team.name}</h3>
          <div className="text-cyan-300 text-lg">
            Tournament: {tournament.name}
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="bg-black/60 border border-pink-400/30 rounded-xl p-6 mb-8 shadow-lg backdrop-blur-sm">
          <h4 className="text-pink-400 font-bold text-xl mb-4">Team Requirements</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">{requirements.maxMainPlayers}</span>
              </div>
              <div className="text-cyan-400 font-bold">Main Players</div>
              <div className="text-pink-200">{requirements.minMainPlayers}-{requirements.maxMainPlayers}</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-magenta-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">{requirements.maxSubstitutes}</span>
              </div>
              <div className="text-pink-400 font-bold">Substitutes</div>
              <div className="text-pink-200">{requirements.minSubstitutes}-{requirements.maxSubstitutes}</div>
            </div>
            {requirements.allowCoaches && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="text-green-400 font-bold">Coach</div>
                <div className="text-pink-200">Optional</div>
              </div>
            )}
            {requirements.allowManagers && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="text-orange-400 font-bold">Manager</div>
                <div className="text-pink-200">Optional</div>
              </div>
            )}
          </div>
        </div>

        {/* Member Selection */}
        <div className="space-y-8">
          {/* Main Players */}
          <div className="bg-black/60 border border-cyan-400/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h4 className="text-cyan-400 font-bold text-xl mb-4">
              Main Players ({selectedMembers.mainPlayers.length}/{requirements.maxMainPlayers})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {selectedMembers.mainPlayers.map(userId => (
                <div key={userId} className="flex items-center justify-between bg-gray-800 border border-cyan-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('member')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[userId]?.username || userId}</div>
                      <div className="text-cyan-400 text-sm font-medium">{userData[userId]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(userId, 'main_player')}
                    className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-2 py-1 rounded border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {selectedMembers.mainPlayers.length < requirements.maxMainPlayers && (
              <div>
                <div className="text-cyan-300 text-sm mb-3 font-medium">Available Members:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMembers
                    .filter(member => !selectedMembers.mainPlayers.includes(member.userId) && 
                                     !selectedMembers.substitutes.includes(member.userId) &&
                                     member.userId !== selectedMembers.coach &&
                                     member.userId !== selectedMembers.assistantCoach &&
                                     member.userId !== selectedMembers.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handleMemberSelection(member.userId, 'main_player')}
                        className="text-left bg-gray-800 hover:bg-gray-700 border border-cyan-400/30 hover:border-cyan-400/60 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-cyan-400 text-sm font-medium">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-pink-300 text-xs capitalize">{member.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Substitutes */}
          <div className="bg-black/60 border border-pink-400/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h4 className="text-pink-400 font-bold text-xl mb-4">
              Substitutes ({selectedMembers.substitutes.length}/{requirements.maxSubstitutes})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {selectedMembers.substitutes.map(userId => (
                <div key={userId} className="flex items-center justify-between bg-gray-800 border border-pink-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('member')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[userId]?.username || userId}</div>
                      <div className="text-pink-400 text-sm font-medium">{userData[userId]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(userId, 'substitute')}
                    className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-2 py-1 rounded border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {selectedMembers.substitutes.length < requirements.maxSubstitutes && (
              <div>
                <div className="text-pink-300 text-sm mb-3 font-medium">Available Members:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMembers
                    .filter(member => !selectedMembers.mainPlayers.includes(member.userId) && 
                                     !selectedMembers.substitutes.includes(member.userId) &&
                                     member.userId !== selectedMembers.coach &&
                                     member.userId !== selectedMembers.assistantCoach &&
                                     member.userId !== selectedMembers.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handleMemberSelection(member.userId, 'substitute')}
                        className="text-left bg-gray-800 hover:bg-gray-700 border border-pink-400/30 hover:border-pink-400/60 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-pink-400 text-sm font-medium">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-pink-300 text-xs capitalize">{member.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Coach Selection */}
          {requirements.allowCoaches && (
            <div className="bg-black/60 border border-green-400/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
              <h4 className="text-green-400 font-bold text-xl mb-4">
                Coach (Optional)
              </h4>
              {selectedMembers.coach ? (
                <div className="flex items-center justify-between bg-gray-800 border border-green-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('coach')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[selectedMembers.coach]?.username || selectedMembers.coach}</div>
                      <div className="text-green-400 text-sm font-medium">{userData[selectedMembers.coach]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(selectedMembers.coach!, 'coach')}
                    className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-2 py-1 rounded border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMembers
                    .filter(member => !selectedMembers.mainPlayers.includes(member.userId) && 
                                     !selectedMembers.substitutes.includes(member.userId) &&
                                     member.userId !== selectedMembers.assistantCoach &&
                                     member.userId !== selectedMembers.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handleMemberSelection(member.userId, 'coach')}
                        className="text-left bg-gray-800 hover:bg-gray-700 border border-green-400/30 hover:border-green-400/60 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-green-400 text-sm font-medium">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-green-300 text-xs capitalize">{member.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Assistant Coach Selection */}
          {requirements.allowAssistantCoaches && (
            <div className="bg-black/60 border border-teal-400/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
              <h4 className="text-teal-400 font-bold text-xl mb-4">
                Assistant Coach (Optional)
              </h4>
              {selectedMembers.assistantCoach ? (
                <div className="flex items-center justify-between bg-gray-800 border border-teal-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('assistant_coach')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[selectedMembers.assistantCoach]?.username || selectedMembers.assistantCoach}</div>
                      <div className="text-teal-400 text-sm font-medium">{userData[selectedMembers.assistantCoach]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(selectedMembers.assistantCoach!, 'assistant_coach')}
                    className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-2 py-1 rounded border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMembers
                    .filter(member => !selectedMembers.mainPlayers.includes(member.userId) && 
                                     !selectedMembers.substitutes.includes(member.userId) &&
                                     member.userId !== selectedMembers.coach &&
                                     member.userId !== selectedMembers.manager)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handleMemberSelection(member.userId, 'assistant_coach')}
                        className="text-left bg-gray-800 hover:bg-gray-700 border border-teal-400/30 hover:border-teal-400/60 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-teal-400 text-sm font-medium">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-teal-300 text-xs capitalize">{member.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Manager Selection */}
          {requirements.allowManagers && (
            <div className="bg-black/60 border border-orange-400/30 rounded-xl p-6 shadow-lg backdrop-blur-sm">
              <h4 className="text-orange-400 font-bold text-xl mb-4">
                Manager (Optional)
              </h4>
              {selectedMembers.manager ? (
                <div className="flex items-center justify-between bg-gray-800 border border-orange-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('manager')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[selectedMembers.manager]?.username || selectedMembers.manager}</div>
                      <div className="text-orange-400 text-sm font-medium">{userData[selectedMembers.manager]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(selectedMembers.manager!, 'manager')}
                    className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-2 py-1 rounded border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMembers
                    .filter(member => !selectedMembers.mainPlayers.includes(member.userId) && 
                                     !selectedMembers.substitutes.includes(member.userId) &&
                                     member.userId !== selectedMembers.coach &&
                                     member.userId !== selectedMembers.assistantCoach)
                    .map(member => (
                      <button
                        key={member.userId}
                        onClick={() => handleMemberSelection(member.userId, 'manager')}
                        className="text-left bg-gray-800 hover:bg-gray-700 border border-orange-400/30 hover:border-orange-400/60 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-orange-400 text-sm font-medium">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-orange-300 text-xs capitalize">{member.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 mt-8">
            <div className="text-red-400 font-medium">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mt-8">
            <div className="text-green-400 font-medium">{success}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            className="px-8 py-4 bg-black/60 hover:bg-black/80 text-white rounded-xl font-bold transition-all duration-200 border border-pink-400/30 hover:border-pink-400/60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isRegistrationValid() || isSubmitting}
            className={`px-8 py-4 rounded-xl font-bold transition-all duration-200 ${
              !isRegistrationValid() || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black'
            }`}
          >
            {isSubmitting ? 'Registering...' : 'Register Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTeamRegistration; 