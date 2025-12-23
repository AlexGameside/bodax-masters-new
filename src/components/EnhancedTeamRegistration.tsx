import React, { useState, useEffect } from 'react';
import { signupTeamForTournament, getPublicUserData } from '../services/firebaseService';
import type { User, Team, Tournament, TournamentTeamMember } from '../types/tournament';
import { BodaxModal } from './ui';

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
  }, [team.ownerId, team.captainId, team.members]);

  const handleMemberSelection = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedMembers(prev => {
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
          if (newState.mainPlayers.length < requirements.maxMainPlayers) {
            newState.mainPlayers.push(userId);
          } else {

          }
          break;
        case 'substitute':
          if (newState.substitutes.length < requirements.maxSubstitutes) {
            newState.substitutes.push(userId);
          } else {

          }
          break;
        case 'coach':
          if (requirements.allowCoaches) {
            newState.coach = userId;
          }
          break;
        case 'assistant_coach':
          if (requirements.allowAssistantCoaches) {
            newState.assistantCoach = userId;
          }
          break;
        case 'manager':
          if (requirements.allowManagers) {
            newState.manager = userId;
          }
          break;
      }
      
      return newState;
    });
  };

  const removeMember = (userId: string, role: 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager') => {
    setSelectedMembers(prev => {
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
    <BodaxModal
      isOpen={true}
      onClose={onCancel}
      title="Tournament Registration"
      subtitle={`${tournament.name}`}
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isRegistrationValid() || isSubmitting}
            className={`px-6 py-3 font-bodax text-xl uppercase tracking-wider transition-colors border ${
              !isRegistrationValid() || isSubmitting
                ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white border-red-800'
            }`}
          >
            {isSubmitting ? 'Registering...' : 'Register Team'}
          </button>
        </div>
      }
    >
      
        {/* Team Info */}
        <div className="bg-black/30 border border-gray-800 p-6 mb-8">
          <h3 className="text-3xl font-bold text-white mb-2 font-bodax tracking-wide uppercase">{team.name}</h3>
          <div className="text-gray-400 font-mono uppercase tracking-widest text-sm">
            Tournament: <span className="text-red-500">{tournament.name}</span>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="bg-black/30 border border-gray-800 p-6 mb-8">
          <h4 className="text-red-500 font-bold text-xl mb-4 font-mono uppercase tracking-widest">Team Requirements</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">{requirements.maxMainPlayers}</span>
              </div>
              <div className="text-gray-200 font-bold font-bodax uppercase tracking-wide">Main Players</div>
              <div className="text-gray-500 font-mono uppercase tracking-wider text-xs">{requirements.minMainPlayers}-{requirements.maxMainPlayers}</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">{requirements.maxSubstitutes}</span>
              </div>
              <div className="text-gray-200 font-bold font-bodax uppercase tracking-wide">Substitutes</div>
              <div className="text-gray-500 font-mono uppercase tracking-wider text-xs">{requirements.minSubstitutes}-{requirements.maxSubstitutes}</div>
            </div>
            {requirements.allowCoaches && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="text-gray-200 font-bold font-bodax uppercase tracking-wide">Coach</div>
                <div className="text-gray-500 font-mono uppercase tracking-wider text-xs">Optional</div>
              </div>
            )}
            {requirements.allowManagers && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="text-gray-200 font-bold font-bodax uppercase tracking-wide">Manager</div>
                <div className="text-gray-500 font-mono uppercase tracking-wider text-xs">Optional</div>
              </div>
            )}
          </div>
        </div>

        {/* Member Selection */}
        <div className="space-y-8">
          {/* Main Players */}
          <div className="bg-black/30 border border-gray-800 p-6">
            <h4 className="text-white font-bold text-xl mb-4 font-bodax uppercase tracking-wide">
              Main Players ({selectedMembers.mainPlayers.length}/{requirements.maxMainPlayers})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {selectedMembers.mainPlayers.map(userId => (
                <div key={userId} className="flex items-center justify-between bg-black/40 border border-gray-800 p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getRoleColor('member')}`}></span>
                    <div>
                      <div className="text-white font-medium">{userData[userId]?.username || userId}</div>
                      <div className="text-gray-400 text-sm font-mono">{userData[userId]?.riotId || 'No Riot ID'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(userId, 'main_player')}
                    className="text-red-500 hover:text-red-400 text-xs font-mono uppercase tracking-wider"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            {selectedMembers.mainPlayers.length < requirements.maxMainPlayers && (
              <div>
                <div className="text-gray-500 text-sm mb-3 font-mono uppercase tracking-widest">Available Members</div>
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
                        className="text-left bg-black/30 hover:bg-black/50 border border-gray-800 hover:border-gray-600 p-4 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full ${getRoleColor(member.role)}`}></span>
                          <div className="text-left">
                            <div className="text-white font-medium">{userData[member.userId]?.username || member.userId}</div>
                            <div className="text-gray-400 text-sm font-mono">{userData[member.userId]?.riotId || 'No Riot ID'}</div>
                            <div className="text-gray-500 text-xs font-mono uppercase tracking-wider">{member.role}</div>
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
          <div className="bg-red-900/10 border border-red-900 p-4 mt-8">
            <div className="text-red-400 font-mono uppercase tracking-widest">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-900/10 border border-green-900 p-4 mt-8">
            <div className="text-green-400 font-mono uppercase tracking-widest">{success}</div>
          </div>
        )}
    </BodaxModal>
  );
};

export default EnhancedTeamRegistration; 