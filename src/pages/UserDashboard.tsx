import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Users, 
  Trophy, 
  Settings, 
  Plus, 
  Mail, 
  Gamepad2, 
  MessageCircle,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react';
import type { User as UserType, Team, TeamInvitation, Match } from '../types/tournament';

interface UserDashboardProps {
  currentUser: UserType;
  userTeam: Team | null;
  teamInvitations: TeamInvitation[];
  userMatches: Match[];
  teamPlayers: UserType[];
  teams: Team[];
  onCreateTeam: (teamData: Omit<Team, 'id' | 'createdAt'>) => Promise<any>;
  onInvitePlayer: (teamId: string, username: string) => Promise<any>;
  onAcceptInvitation: (invitationId: string) => Promise<void>;
  onDeclineInvitation: (invitationId: string) => Promise<void>;
  onLogout: () => void;
}

const UserDashboard = ({
  currentUser,
  userTeam,
  teamInvitations,
  userMatches,
  teamPlayers,
  teams,
  onCreateTeam,
  onInvitePlayer,
  onAcceptInvitation,
  onDeclineInvitation,
  onLogout
}: UserDashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showInvitePlayer, setShowInvitePlayer] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const upcomingMatches = userMatches.filter(match => 
    !match.isComplete && match.matchState === 'ready_up'
  );

  const activeMatches = userMatches.filter(match => 
    !match.isComplete && match.matchState === 'playing'
  );

  const isTeamCaptain = userTeam?.captainId === currentUser.id || userTeam?.ownerId === currentUser.id;

  const handleInvitePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTeam || !inviteUsername.trim()) return;

    await onInvitePlayer(userTeam.id, inviteUsername.trim());
    setInviteUsername('');
    setShowInvitePlayer(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-30 shadow-lg">
        <div className="container-modern py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-3 rounded-xl shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-300">Welcome back, {currentUser.username}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors hover:bg-gray-800 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-modern py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-xl p-1 shadow-lg mb-8 border border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'team', label: 'Team', icon: Users },
            { id: 'tournament', label: 'Tournament', icon: Trophy },
            { id: 'matches', label: 'Matches', icon: Gamepad2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary-400" />
                Profile
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Username</p>
                  <p className="font-medium text-white">{currentUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Riot ID</p>
                  <p className="font-medium text-white">{currentUser.riotId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Discord</p>
                  <p className="font-medium text-white">{currentUser.discordUsername}</p>
                </div>
              </div>
            </div>

            {/* Team Status */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-400" />
                Team Status
              </h3>
              {userTeam ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Team</p>
                    <p className="font-medium text-white">{userTeam.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Role</p>
                    <p className="font-medium flex items-center text-white">
                      {isTeamCaptain ? (
                        <>
                          <Crown className="w-4 h-4 mr-1 text-yellow-400" />
                          Captain
                        </>
                      ) : (
                        'Player'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Members</p>
                    <p className="font-medium text-white">{userTeam.members?.length || 0}/10</p>
                  </div>
                  <button
                    onClick={() => navigate('/team-management')}
                    className="w-full mt-4 bg-gradient-to-r from-gray-700 to-gray-600 text-white py-2 rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage Team</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-3">No team yet</p>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => navigate('/create-team')}
                      className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => navigate('/team-management')}
                      className="bg-gradient-to-r from-gray-700 to-gray-600 text-white px-4 py-2 rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200"
                    >
                      Manage Teams
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament Status */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-primary-400" />
                Tournament
              </h3>
              {userTeam?.registeredForTournament ? (
                <div className="space-y-3">
                  <div className="flex items-center text-green-400">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Registered</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your team is ready for the tournament!
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                    >
                      View Tournaments
                    </button>
                    <button
                      onClick={() => navigate('/final-bracket')}
                      className="bg-gradient-to-r from-accent-600 to-accent-700 text-white px-4 py-2 rounded-lg hover:from-accent-700 hover:to-accent-800 transition-all duration-200"
                    >
                      View Finals
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-orange-400">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Not Registered</span>
                  </div>
                  {userTeam && isTeamCaptain && (
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200"
                    >
                      Register for Tournament
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {userTeam ? (
              <>
                {/* Team Info */}
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{userTeam.name}</h3>
                      {userTeam.teamTag && (
                        <p className="text-gray-400">[{userTeam.teamTag}]</p>
                      )}
                      {userTeam.description && (
                        <p className="text-gray-400 mt-2">{userTeam.description}</p>
                      )}
                    </div>
                    {isTeamCaptain && (
                      <button 
                        onClick={() => navigate('/team-management')}
                        className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Team Actions */}
                  {isTeamCaptain && (
                    <div className="flex space-x-4 mb-6">
                      <button
                        onClick={() => setShowInvitePlayer(true)}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Invite Player
                      </button>
                    </div>
                  )}

                  {/* Team Players */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Team Members ({userTeam.members?.length || 0}/10)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[200px]">
                      {teamPlayers.map((player) => {
                        const member = userTeam.members?.find(m => m.userId === player.id);
                        const isActive = member?.isActive || false;
                        const isCaptain = member?.role === 'captain' || member?.role === 'owner';
                        
                        return (
                          <div key={player.id} className="bg-gray-700 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors h-[80px] flex items-center">
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-white">{player.username}</span>
                                  {isCaptain && (
                                    <Crown className="w-4 h-4 text-yellow-400" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{player.riotId}</p>
                                <p className="text-xs text-gray-500 capitalize">{member?.role || 'member'}</p>
                              </div>
                              <div className="flex items-center space-x-1">
                                {isActive ? (
                                  <UserCheck className="w-4 h-4 text-green-400" />
                                ) : (
                                  <UserX className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Fill empty slots to maintain consistent layout */}
                      {Array.from({ length: Math.max(0, 10 - teamPlayers.length) }).map((_, index) => (
                        <div key={`empty-${index}`} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/30 h-[80px] flex items-center justify-center">
                          <div className="text-gray-500 text-sm">Empty Slot</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Players Summary */}
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h5 className="font-medium text-blue-300 mb-2">Active Members ({userTeam.members?.filter(m => m.isActive).length || 0}/5)</h5>
                    {(userTeam.members?.filter(m => m.isActive).length || 0) === 5 ? (
                      <div className="text-green-400 text-sm">
                        ✓ Team is ready for matches
                      </div>
                    ) : (
                      <div className="text-orange-400 text-sm">
                        ⚠ Team captain needs to select 5 active members before matches
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 text-center hover:shadow-xl transition-shadow">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Team</h3>
                <button
                  onClick={() => navigate('/create-team')}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                >
                  Create Team
                </button>
              </div>
            )}

            {/* Team Invitations */}
            {teamInvitations.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold text-white mb-4">Team Invitations</h3>
                <div className="space-y-3">
                  {teamInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div>
                        <p className="font-medium text-white">Team Invitation</p>
                        <p className="text-sm text-gray-400">Expires in 24 hours</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onAcceptInvitation(invitation.id)}
                          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1 rounded hover:from-green-700 hover:to-green-800 transition-all duration-200"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onDeclineInvitation(invitation.id)}
                          className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1 rounded hover:from-red-700 hover:to-red-800 transition-all duration-200"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tournament Tab */}
        {activeTab === 'tournament' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-primary-400" />
                Tournament Information
              </h3>
              {userTeam ? (
                <div className="space-y-4">
                  {userTeam.registeredForTournament ? (
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                      <div className="flex items-center text-green-400 mb-2">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Team Registered</span>
                      </div>
                      <p className="text-green-300 text-sm mb-3">
                        Your team is registered for the Bodax Masters tournament.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => navigate('/tournaments')}
                          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                        >
                          View Tournaments
                        </button>
                        <button
                          onClick={() => navigate('/final-bracket')}
                          className="bg-gradient-to-r from-accent-600 to-accent-700 text-white px-4 py-2 rounded-lg hover:from-accent-700 hover:to-accent-800 transition-all duration-200"
                        >
                          View Finals
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                      <div className="flex items-center text-orange-400 mb-2">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Not Registered</span>
                      </div>
                      {userTeam && isTeamCaptain && (
                        <button
                          onClick={() => navigate('/tournaments')}
                          className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200"
                        >
                          Register for Tournament
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Team</h3>
                  <button
                    onClick={() => setActiveTab('team')}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                  >
                    Manage Team
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {/* Active Match */}
            {activeMatches.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  Active Match
                </h3>
                {activeMatches.map((match) => {
                  // Get team names for display
                  const team1 = teams.find(t => t.id === match.team1Id);
                  const team2 = teams.find(t => t.id === match.team2Id);
                  
                  return (
                    <div key={match.id} className="bg-gray-700 rounded-lg p-4 border border-blue-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-white">
                            {team1?.name || 'TBD'} vs {team2?.name || 'TBD'}
                          </h4>
                          <p className="text-sm text-gray-400">
                            Round {match.round} • Tournament
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/match/${match.id}`)}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                        >
                          Join Match
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold text-white mb-4">Upcoming Matches</h3>
                <div className="space-y-3">
                  {upcomingMatches.map((match) => (
                    <div key={match.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div>
                        <p className="font-medium text-white">Match #{match.matchNumber}</p>
                        <p className="text-sm text-gray-400">
                          Round {match.round} • Tournament
                        </p>
                      </div>
                      <div className="text-sm text-gray-400">
                        <Clock className="w-4 h-4 inline mr-1" />
                        TBD
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMatches.length === 0 && upcomingMatches.length === 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 text-center hover:shadow-xl transition-shadow">
                <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Matches</h3>
                <p className="text-gray-400">You don't have any upcoming or active matches.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Player Modal */}
      {showInvitePlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-2xl p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">Invite Player</h3>
              <p className="text-gray-400 mt-1">Send an invitation to join your team</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleInvitePlayer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter username"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvitePlayer(false)}
                    className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 text-white py-2 rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 