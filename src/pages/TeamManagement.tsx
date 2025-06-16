import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Trash2, 
  Mail, 
  Plus,
  Settings,
  ArrowLeft,
  X
} from 'lucide-react';
import { 
  getUserTeams, 
  getTeamById, 
  getAllUsers, 
  createTeamInvitation,
  updateTeamMemberRole,
  removeTeamMember,
  addTeam,
  fillTeamWithDemoMembers
} from '../services/firebaseService';
import type { Team, User as UserType, TeamMember } from '../types/tournament';

interface TeamManagementProps {
  currentUser: UserType | null;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [userTeams, allUsersData] = await Promise.all([
        getUserTeams(currentUser!.id),
        getAllUsers()
      ]);
      setTeams(userTeams);
      setAllUsers(allUsersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load teams. Please try again.');
      // Set empty arrays to prevent further errors
      setTeams([]);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    navigate('/create-team');
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !inviteUsername.trim()) return;

    try {
      const invitedUser = allUsers.find(user => 
        user.username.toLowerCase() === inviteUsername.toLowerCase()
      );

      if (!invitedUser) {
        setError('User not found');
        return;
      }

      await createTeamInvitation(
        selectedTeam.id,
        invitedUser.id,
        currentUser!.id,
        inviteMessage
      );

      setSuccess(`Invitation sent to ${invitedUser.username}`);
      setInviteUsername('');
      setInviteMessage('');
      setShowInviteForm(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRoleChange = async (teamId: string, userId: string, newRole: 'owner' | 'captain' | 'member') => {
    try {
      await updateTeamMemberRole(teamId, userId, newRole);
      await loadData(); // Reload to get updated data
      setSuccess('Role updated successfully');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeTeamMember(teamId, userId);
      await loadData(); // Reload to get updated data
      setSuccess('Member removed successfully');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleFillTeam = async (teamId: string) => {
    if (!confirm('This will add demo players to fill your team to 5 members. Continue?')) return;

    try {
      await fillTeamWithDemoMembers(teamId);
      await loadData(); // Reload to get updated data
      setSuccess('Team filled with demo members successfully');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getUserRole = (team: Team, userId: string): TeamMember['role'] => {
    const member = team.members.find(m => m.userId === userId);
    return member?.role || 'member';
  };

  const canManageTeam = (team: Team): boolean => {
    if (!currentUser) return false;
    const role = getUserRole(team, currentUser.id);
    return role === 'owner' || role === 'captain';
  };

  const canTransferOwnership = (team: Team): boolean => {
    if (!currentUser) return false;
    return getUserRole(team, currentUser.id) === 'owner';
  };

  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'captain':
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-400';
      case 'captain':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-6xl mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
              <p className="text-gray-300">Manage your teams and members</p>
            </div>
          </div>
          <button
            onClick={handleCreateTeam}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors border border-red-800"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Teams List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-black/60 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                  <p className="text-gray-400 text-sm">[{team.teamTag}]</p>
                </div>
                {canManageTeam(team) && (
                  <button
                    onClick={() => setSelectedTeam(team)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
              </div>

              <p className="text-gray-300 text-sm mb-4">{team.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Members:</span>
                  <span className="text-white">{team.members.length}/{team.maxMembers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Your Role:</span>
                  <div className="flex items-center space-x-1">
                    {getRoleIcon(getUserRole(team, currentUser!.id))}
                    <span className={getRoleColor(getUserRole(team, currentUser!.id))}>
                      {getUserRole(team, currentUser!.id)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Members</h4>
                <div className="space-y-2">
                  {team.members.map((member) => {
                    const user = allUsers.find(u => u.id === member.userId);
                    return (
                      <div key={member.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className="text-sm text-gray-300">
                            {user?.username || 'Unknown User'}
                          </span>
                        </div>
                        {canManageTeam(team) && member.userId !== currentUser!.id && (
                          <div className="flex items-center space-x-1">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(team.id, member.userId, e.target.value as any)}
                              className="text-xs bg-black/60 border border-gray-600 rounded px-2 py-1 text-white"
                            >
                              <option value="member">Member</option>
                              <option value="captain">Captain</option>
                              {canTransferOwnership(team) && (
                                <option value="owner">Owner</option>
                              )}
                            </select>
                            <button
                              onClick={() => handleRemoveMember(team.id, member.userId)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invite Button */}
              {canManageTeam(team) && team.members.length < team.maxMembers && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setShowInviteForm(true);
                    }}
                    className="w-full bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors border border-gray-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Member</span>
                  </button>
                  
                  {/* Fill Team Button - Only show if team has less than 5 members */}
                  {team.members.length < 5 && (
                    <button
                      onClick={() => handleFillTeam(team.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 border border-orange-800"
                    >
                      <Users className="w-4 h-4" />
                      <span>Fill Team (Demo Players)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {teams.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 mb-6">Create your first team to get started</p>
            <button
              onClick={handleCreateTeam}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors border border-red-800"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteForm && selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black/90 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Invite to {selectedTeam.name}</h3>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">Message (Optional)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                    placeholder="Add a personal message..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors border border-red-800"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Invite</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement; 