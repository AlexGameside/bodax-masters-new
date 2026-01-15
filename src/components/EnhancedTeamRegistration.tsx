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

  // Stable role lookup (used for the non-jumpy "available members" list)
  const getAssignedRole = (userId: string): 'main_player' | 'substitute' | 'coach' | 'assistant_coach' | 'manager' | null => {
    if (selectedMembers.mainPlayers.includes(userId)) return 'main_player';
    if (selectedMembers.substitutes.includes(userId)) return 'substitute';
    if (selectedMembers.coach === userId) return 'coach';
    if (selectedMembers.assistantCoach === userId) return 'assistant_coach';
    if (selectedMembers.manager === userId) return 'manager';
    return null;
  };

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
      maxWidthClassName="max-w-6xl"
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
            {isSubmitting ? 'Registering...' : 'Submit Registration'}
          </button>
        </div>
      }
    >
      {/* RegisterV2: stable roster builder (no jumpy layout) */}
      <div className="max-h-[72vh] overflow-y-auto pr-2">
        <div className="bg-black/30 border border-gray-800 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-white font-bodax text-2xl uppercase tracking-wider">{team.name}</div>
              <div className="text-gray-400 font-mono text-xs uppercase tracking-widest mt-1">
                Main: {requirements.minMainPlayers}-{requirements.maxMainPlayers} / Subs: {requirements.minSubstitutes}-{requirements.maxSubstitutes}
                {requirements.allowCoaches ? ' / Coach' : ''}
                {requirements.allowAssistantCoaches ? ' / Asst Coach' : ''}
                {requirements.allowManagers ? ' / Manager' : ''}
              </div>
            </div>
            <div className="text-gray-400 font-mono text-xs uppercase tracking-widest">
              Tournament: <span className="text-red-400">{tournament.name}</span>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`mb-6 p-4 border font-mono text-sm ${
            error ? 'bg-red-900/10 border-red-800 text-red-300' : 'bg-green-900/10 border-green-800 text-green-300'
          }`}>
            {error || success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/30 border border-gray-800 p-5">
            <div className="text-red-500 font-bodax text-sm uppercase tracking-wider mb-3">Available Members</div>
            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {availableMembers.map((member) => {
                const selectedRole = getAssignedRole(member.userId);
                const isAssigned = !!selectedRole;

                const canAddMain = !isAssigned && selectedMembers.mainPlayers.length < requirements.maxMainPlayers;
                const canAddSub = !isAssigned && selectedMembers.substitutes.length < requirements.maxSubstitutes;
                const canSetCoach = !isAssigned && requirements.allowCoaches && !selectedMembers.coach;
                const canSetAsst = !isAssigned && requirements.allowAssistantCoaches && !selectedMembers.assistantCoach;
                const canSetManager = !isAssigned && requirements.allowManagers && !selectedMembers.manager;

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
                          onClick={() => handleMemberSelection(member.userId, 'main_player')}
                          disabled={!canAddMain || isSubmitting}
                          className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Main
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMemberSelection(member.userId, 'substitute')}
                          disabled={!canAddSub || isSubmitting}
                          className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sub
                        </button>
                        {requirements.allowCoaches && (
                          <button
                            type="button"
                            onClick={() => handleMemberSelection(member.userId, 'coach')}
                            disabled={!canSetCoach || isSubmitting}
                            className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Coach
                          </button>
                        )}
                        {requirements.allowAssistantCoaches && (
                          <button
                            type="button"
                            onClick={() => handleMemberSelection(member.userId, 'assistant_coach')}
                            disabled={!canSetAsst || isSubmitting}
                            className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Asst
                          </button>
                        )}
                        {requirements.allowManagers && (
                          <button
                            type="button"
                            onClick={() => handleMemberSelection(member.userId, 'manager')}
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

          <div className="space-y-4">
            <div className="bg-black/30 border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider">Main Players</div>
                <div className="text-gray-400 font-mono text-xs">{selectedMembers.mainPlayers.length}/{requirements.maxMainPlayers}</div>
              </div>
              <div className="space-y-2">
                {selectedMembers.mainPlayers.length === 0 ? (
                  <div className="text-gray-500 font-mono text-sm">Pick main players from the left.</div>
                ) : (
                  selectedMembers.mainPlayers.map((userId) => (
                    <div key={userId} className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{userData[userId]?.username || userId}</div>
                        <div className="text-gray-400 text-xs font-mono truncate">{userData[userId]?.riotId || 'No Riot ID'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(userId, 'main_player')}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-wider"
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
                <div className="text-gray-400 font-mono text-xs">{selectedMembers.substitutes.length}/{requirements.maxSubstitutes}</div>
              </div>
              <div className="space-y-2">
                {selectedMembers.substitutes.length === 0 ? (
                  <div className="text-gray-500 font-mono text-sm">Optional.</div>
                ) : (
                  selectedMembers.substitutes.map((userId) => (
                    <div key={userId} className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{userData[userId]?.username || userId}</div>
                        <div className="text-gray-400 text-xs font-mono truncate">{userData[userId]?.riotId || 'No Riot ID'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(userId, 'substitute')}
                        disabled={isSubmitting}
                        className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {(requirements.allowCoaches || requirements.allowAssistantCoaches || requirements.allowManagers) && (
              <div className="bg-black/30 border border-gray-800 p-5">
                <div className="text-red-500 font-bodax text-sm uppercase tracking-wider mb-3">Staff (Optional)</div>
                <div className="space-y-2 font-mono text-sm">
                  {requirements.allowCoaches && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Coach</span>
                      {selectedMembers.coach ? (
                        <button
                          type="button"
                          onClick={() => removeMember(selectedMembers.coach!, 'coach')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider"
                        >
                          {userData[selectedMembers.coach]?.username || 'Selected'} (remove)
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  )}
                  {requirements.allowAssistantCoaches && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Assistant Coach</span>
                      {selectedMembers.assistantCoach ? (
                        <button
                          type="button"
                          onClick={() => removeMember(selectedMembers.assistantCoach!, 'assistant_coach')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider"
                        >
                          {userData[selectedMembers.assistantCoach]?.username || 'Selected'} (remove)
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  )}
                  {requirements.allowManagers && (
                    <div className="flex items-center justify-between border border-gray-800 bg-black/30 p-3">
                      <span className="text-gray-300">Manager</span>
                      {selectedMembers.manager ? (
                        <button
                          type="button"
                          onClick={() => removeMember(selectedMembers.manager!, 'manager')}
                          disabled={isSubmitting}
                          className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider"
                        >
                          {userData[selectedMembers.manager]?.username || 'Selected'} (remove)
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

export default EnhancedTeamRegistration; 