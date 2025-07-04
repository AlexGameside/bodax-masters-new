import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  updateUserProfile, 
  updateUserDiscordInfo, 
  unlinkDiscordAccount,
  leaveTeam, 
  deleteTeam, 
  inviteTeamMember, 
  getUserTeams, 
  getUserMatches,
  getAllUsers,
  onUserTeamsChange
} from '../services/firebaseService';
import { resetPassword } from '../services/authService';
import type { User, Match, Team } from '../types/tournament';
import { Shield, Users, Trophy, Settings, UserPlus, LogOut, Edit3, Save, X, Trash2, ExternalLink, MessageCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDiscordAuthUrl } from '../services/discordService';

const Profile = () => {
  const { currentUser, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    riotName: '',
    email: ''
  });
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (currentUser) {
      setEditForm({
        displayName: currentUser.username || '',
        riotName: currentUser.riotId || '',
        email: currentUser.email || ''
      });
      loadUserData();
      setupRealTimeListeners();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      const [matches] = await Promise.all([
        getUserMatches(currentUser.id)
      ]);
      setUserMatches(matches);
      
      // Load all users for team member display
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const setupRealTimeListeners = () => {
    if (!currentUser) return;

    // Set up real-time listener for user's teams
    const unsubscribe = onUserTeamsChange(currentUser.id, (updatedTeams) => {
      console.log('Teams updated in real-time on Profile:', updatedTeams);
      setUserTeams(updatedTeams);
    });

    // Cleanup function
    return () => {
      unsubscribe();
    };
  };

  const handleProfileUpdate = async () => {
    if (!currentUser) return;

    setIsUpdating(true);
    try {
      await updateUserProfile(currentUser.id, {
        displayName: editForm.displayName,
        riotName: editForm.riotName
      });
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentUser) return;

    setIsResetting(true);
    try {
      await resetPassword(currentUser.email);
      setMessage('Password reset email sent! Check your inbox.');
      setTimeout(() => setMessage(''), 5000);
      setShowResetPassword(false);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    if (!currentUser) return;
    
    try {
      await unlinkDiscordAccount(currentUser.id);
      // Refresh user data to reflect the unlink
      await refreshUser();
      setMessage('Discord account unlinked successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to unlink Discord account');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 relative z-10"></div>
      </div>
    );
  }

  // Note: Route protection is handled in App.tsx, so currentUser should always be available here
  // But we'll keep a safety check for the loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 relative z-10"></div>
      </div>
    );
  }

  // Safety check - this should never happen due to route protection, but TypeScript needs it
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        <div className="text-red-500 relative z-10">Error: User not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Users },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'matches', label: 'Match History', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* Subtle grid/code background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="bg-black/60 border border-gray-700 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {currentUser.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {currentUser.username || 'User'}
                </h1>
                <p className="text-gray-400">
                  {currentUser.email}
                </p>
                {currentUser.isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/create-team')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors border border-red-800"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 text-green-300 rounded-lg">
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-black/60 border border-gray-700 rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg flex items-center space-x-2 transition-colors border border-gray-600"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleProfileUpdate}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-2 transition-colors border border-green-800"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm({
                            displayName: currentUser.username || '',
                            riotName: currentUser.riotId || '',
                            email: currentUser.email || ''
                          });
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg flex items-center space-x-2 transition-colors border border-gray-700"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-black/60 text-white"
                      />
                    ) : (
                      <p className="text-white">{currentUser.username || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Riot Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.riotName}
                        onChange={(e) => setEditForm({ ...editForm, riotName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-black/60 text-white"
                      />
                    ) : (
                      <p className="text-white">{currentUser.riotId || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <p className="text-white">{currentUser.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Member Since
                    </label>
                    <p className="text-white">
                      {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>

                  {/* Discord Account Linking */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord Account
                    </label>
                    {currentUser.discordLinked ? (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">Linked</span>
                        </div>
                        <span className="text-white">
                          {currentUser.discordUsername || 'Discord User'}
                        </span>
                        <button
                          onClick={handleUnlinkDiscord}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-400">Not Linked</span>
                        </div>
                        <button
                          onClick={() => {
                            window.location.href = getDiscordAuthUrl();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors border border-blue-800"
                        >
                          Link Discord
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Link your Discord account to receive tournament notifications and match reminders.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-white">My Teams</h2>
                
                {userTeams.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No teams yet</h3>
                    <button
                      onClick={() => navigate('/create-team')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-800"
                    >
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userTeams.map((team) => (
                      <div key={team.id} className="border border-gray-700 rounded-lg p-4 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer" onClick={() => navigate('/team-management')}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-white">{team.name}</h3>
                            <p className="text-gray-400">{team.members.length} members</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-400">Click to manage</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>

                        {/* Team Members Preview */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Members:</h4>
                          <div className="flex flex-wrap gap-2">
                            {team.members.slice(0, 3).map((member) => {
                              // Get user info for display
                              const user = allUsers.find(u => u.id === member.userId);
                              return (
                                <span
                                  key={member.userId}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-200 border border-gray-600"
                                >
                                  {member.userId === currentUser.id ? 'You' : (user?.username || 'Unknown User')}
                                  {member.userId === team.ownerId && (
                                    <span className="ml-1 text-red-400">(Owner)</span>
                                  )}
                                </span>
                              );
                            })}
                            {team.members.length > 3 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300 border border-gray-500">
                                +{team.members.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-white">Match History</h2>
                
                {userMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No matches played yet</h3>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userMatches.map((match) => {
                      // Get team names for display
                      const team1 = userTeams.find(t => t.id === match.team1Id);
                      const team2 = userTeams.find(t => t.id === match.team2Id);
                      const winner = userTeams.find(t => t.id === match.winnerId);
                      
                      return (
                        <div key={match.id} className="border border-gray-700 rounded-lg p-4 bg-black/40">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-white">
                                {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                              </h3>
                              <p className="text-gray-400">
                                {new Date(match.createdAt).toLocaleDateString()}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  match.isComplete ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                  match.matchState === 'playing' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                                  match.matchState === 'disputed' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                                  'bg-gray-700 text-gray-200 border border-gray-600'
                                }`}>
                                  {match.matchState.charAt(0).toUpperCase() + match.matchState.slice(1)}
                                </span>
                                {match.isComplete && match.winnerId && (
                                  <span className="text-sm font-medium text-white">
                                    Winner: {winner?.name || 'Unknown'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/match/${match.id}`)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1 border border-red-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Match</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-white">Account Settings</h2>
                
                <div className="space-y-4">
                  <div className="border border-gray-700 rounded-lg p-4 bg-black/40">
                    <h3 className="text-md font-medium text-white mb-2">Password</h3>
                    <p className="text-gray-400 mb-3">
                      Update your password to keep your account secure.
                    </p>
                    <button 
                      onClick={() => setShowResetPassword(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors border border-blue-800"
                    >
                      Reset Password
                    </button>
                  </div>

                  <div className="border border-gray-700 rounded-lg p-4 bg-black/40">
                    <h3 className="text-md font-medium text-white mb-2">Account</h3>
                    <p className="text-gray-400 mb-3">
                      Permanently delete your account and all associated data.
                    </p>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors border border-red-800">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset Password Confirmation Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black/90 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-white mb-4">
                Reset Password
              </h3>
              <p className="text-gray-400 mb-6">
                A password reset email will be sent to <strong>{currentUser.email}</strong>. 
                Check your inbox and follow the instructions to reset your password.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors border border-blue-800"
                >
                  {isResetting ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button
                  onClick={() => setShowResetPassword(false)}
                  disabled={isResetting}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 