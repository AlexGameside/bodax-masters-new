import React, { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, AlertTriangle, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getUserById } from '../services/firebaseService';
import { checkUserInDiscordServer } from '../services/discordService';
import type { User as UserType, TeamMember } from '../types/tournament';

interface TeamMemberSelectionProps {
  teamMembers: TeamMember[];
  onMembersSelected: (selectedUserIds: string[]) => void;
  onCancel: () => void;
  tournamentId: string;
  maxPlayers: number;
}

interface MemberWithStatus extends TeamMember {
  user?: UserType;
  discordLinked: boolean;
  inDiscordServer: boolean;
  isSelected: boolean;
}

const TeamMemberSelection: React.FC<TeamMemberSelectionProps> = ({
  teamMembers,
  onMembersSelected,
  onCancel,
  tournamentId,
  maxPlayers
}) => {
  const [membersWithStatus, setMembersWithStatus] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    loadMemberStatus();
  }, [teamMembers]);

  const loadMemberStatus = async () => {
    setLoading(true);
    try {
      const membersData = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await getUserById(member.userId);
          if (!user) {
            return {
              ...member,
              user: undefined,
              discordLinked: false,
              inDiscordServer: false,
              isSelected: false
            };
          }

          // Check Discord server membership
          let inDiscordServer = false;
          if (user.discordId && user.discordLinked) {
            try {
              inDiscordServer = await checkUserInDiscordServer(user.discordId);
            } catch (error) {
              console.error('Error checking Discord server membership:', error);
            }
          }

          return {
            ...member,
            user,
            discordLinked: !!(user.discordId && user.discordLinked),
            inDiscordServer,
            isSelected: false
          };
        })
      );

      setMembersWithStatus(membersData);
    } catch (error) {
      console.error('Error loading member status:', error);
      toast.error('Failed to load team member information');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setMembersWithStatus(prev => {
      const member = prev.find(m => m.userId === userId);
      if (!member) return prev;

      // Don't allow selection if Discord requirements not met
      if (!member.discordLinked || !member.inDiscordServer) {
        toast.error(`${member.user?.username || 'Member'} must link Discord and join our server first`);
        return prev;
      }

      // Check if we're at max players
      const currentlySelected = prev.filter(m => m.isSelected).length;
      if (!member.isSelected && currentlySelected >= maxPlayers) {
        toast.error(`Maximum ${maxPlayers} players allowed`);
        return prev;
      }

      return prev.map(m => 
        m.userId === userId 
          ? { ...m, isSelected: !m.isSelected }
          : m
      );
    });
  };

  const handleConfirmSelection = () => {
    const selectedMembers = membersWithStatus.filter(m => m.isSelected);
    
    if (selectedMembers.length < 5) {
      toast.error('You must select at least 5 players');
      return;
    }

    const selectedUserIds = selectedMembers.map(m => m.userId);
    onMembersSelected(selectedUserIds);
  };

  const sendDiscordNotification = async (userId: string, username: string) => {
    setVerifying(userId);
    try {
      const response = await fetch(`${import.meta.env.VITE_DISCORD_API_URL}/api/send-discord-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [userId],
          title: 'Tournament Registration Required',
          message: `Hey ${username}! Your team captain is trying to register for a tournament, but you need to link your Discord account and join our server first.\n\nPlease visit your profile to link Discord: https://bodax-masters.web.app/profile\n\nJoin our Discord server: https://discord.gg/MZzEyX3peN`
        }),
      });

      if (response.ok) {
        toast.success(`Notification sent to ${username}`);
      } else {
        toast.error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setVerifying(null);
    }
  };

  const getStatusIcon = (member: MemberWithStatus) => {
    if (!member.user) return <XCircle className="w-5 h-5 text-red-500" />;
    
    if (!member.discordLinked) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    
    if (!member.inDiscordServer) {
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    }
    
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (member: MemberWithStatus) => {
    if (!member.user) return 'User not found';
    if (!member.discordLinked) return 'Discord not linked';
    if (!member.inDiscordServer) return 'Not in Discord server';
    return 'Ready for tournament';
  };

  const getStatusColor = (member: MemberWithStatus) => {
    if (!member.user) return 'text-red-400';
    if (!member.discordLinked) return 'text-yellow-400';
    if (!member.inDiscordServer) return 'text-blue-400';
    return 'text-green-400';
  };

  const canSelectMember = (member: MemberWithStatus) => {
    return member.user && member.discordLinked && member.inDiscordServer;
  };

  const selectedCount = membersWithStatus.filter(m => m.isSelected).length;
  const readyMembers = membersWithStatus.filter(m => canSelectMember(m));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-white text-lg mb-2">Loading Team Members...</div>
            <div className="text-gray-400 text-sm">Verifying Discord status</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Select Tournament Team</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Status Legend */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="text-white font-semibold mb-3">Status Legend</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-400">Ready for tournament</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span className="text-blue-400">Not in Discord server</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-400">Discord not linked</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-400">User not found</span>
            </div>
          </div>
        </div>

        {/* Selection Info */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
          <div className="text-blue-400 font-semibold mb-2">Tournament Requirements</div>
          <div className="text-blue-200 text-sm">
            • All players must have Discord linked and be in our Discord server<br/>
            • Minimum {maxPlayers} players required<br/>
            • Selected: {selectedCount}/{maxPlayers} players
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-3 mb-6">
          {membersWithStatus.map((member) => (
            <div
              key={member.userId}
              className={`bg-gray-700 rounded-lg p-4 border-2 transition-all ${
                member.isSelected 
                  ? 'border-green-500 bg-green-900/20' 
                  : canSelectMember(member)
                    ? 'border-gray-600 hover:border-gray-500 cursor-pointer'
                    : 'border-gray-600 opacity-60'
              }`}
              onClick={() => canSelectMember(member) && toggleMemberSelection(member.userId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(member)}
                    <div>
                      <div className="text-white font-semibold">
                        {member.user?.username || 'Unknown User'}
                      </div>
                      <div className={`text-sm ${getStatusColor(member)}`}>
                        {getStatusText(member)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Send notification button for members who need Discord */}
                  {member.user && (!member.discordLinked || !member.inDiscordServer) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendDiscordNotification(member.userId, member.user?.username || '');
                      }}
                      disabled={verifying === member.userId}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      {verifying === member.userId ? 'Sending...' : 'Notify'}
                    </button>
                  )}

                  {/* Profile link for members who need Discord */}
                  {member.user && (!member.discordLinked || !member.inDiscordServer) && (
                    <a
                      href="/profile"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Profile
                    </a>
                  )}

                  {/* Selection indicator */}
                  {member.isSelected && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={selectedCount < 5 || selectedCount > maxPlayers}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Confirm Selection ({selectedCount}/{maxPlayers})
          </button>
        </div>

        {/* Warning if not enough ready members */}
        {readyMembers.length < 5 && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mt-4">
            <div className="text-yellow-400 font-semibold mb-2">⚠️ Not Enough Ready Members</div>
            <div className="text-yellow-200 text-sm">
              Only {readyMembers.length} members are ready for tournament registration. 
              You need at least 5 members with Discord linked and in our server.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMemberSelection; 