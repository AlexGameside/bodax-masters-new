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
      // Load all users first (more efficient than individual calls)
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

          // Skip Discord check for now to improve performance
          // We'll check Discord status only when needed
          return {
            ...member,
            user,
            discordLinked: !!(user.discordId && user.discordLinked),
            inDiscordServer: false, // Will be checked on-demand
            isSelected: false
          };
        })
      );

      setMembersWithStatus(membersData);
    } catch (error) {

      toast.error('Failed to load team member information');
    } finally {
      setLoading(false);
    }
  };

  // Check Discord status on-demand when user tries to select a member
  const checkDiscordStatus = async (userId: string, discordId: string): Promise<boolean> => {
    try {
      const inDiscordServer = await checkUserInDiscordServer(discordId);
      
      // Update the member's Discord status
      setMembersWithStatus(prev => prev.map(member => 
        member.userId === userId 
          ? { ...member, inDiscordServer }
          : member
      ));
      
      return inDiscordServer;
    } catch (error) {

      return false;
    }
  };

  const toggleMemberSelection = async (userId: string) => {
    const member = membersWithStatus.find(m => m.userId === userId);
    if (!member || !member.user) return;

    // Toggle selection (no Discord verification required)
    setMembersWithStatus(prev => prev.map(member => 
      member.userId === userId 
        ? { ...member, isSelected: !member.isSelected }
        : member
    ));
  };

  const handleConfirm = () => {
    const selectedUserIds = membersWithStatus
      .filter(m => m.isSelected)
      .map(m => m.userId);
    
    if (selectedUserIds.length !== maxPlayers) {
      toast.error(`Please select exactly ${maxPlayers} players`);
      return;
    }
    
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
          message: `Hey ${username}! Your team captain is trying to register for a tournament, but you need to link your Discord account and join our server first.\n\nPlease visit your profile to link Discord: https://unityleauge.com/profile\n\nJoin our Discord server: https://discord.gg/MZzEyX3peN`
        }),
      });

      if (response.ok) {
        toast.success(`Notification sent to ${username}`);
      } else {
        toast.error('Failed to send notification');
      }
    } catch (error) {

      toast.error('Failed to send notification');
    } finally {
      setVerifying(null);
    }
  };

  const getStatusIcon = (member: MemberWithStatus) => {
    if (!member.user) return <XCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = (member: MemberWithStatus) => {
    if (!member.user) return 'User not found';
    return 'Ready for tournament';
  };

  const getStatusColor = (member: MemberWithStatus) => {
    if (!member.user) return 'text-red-400';
    return 'text-green-400';
  };

  const canSelectMember = (member: MemberWithStatus) => {
    return member.user;
  };

  const selectedCount = membersWithStatus.filter(m => m.isSelected).length;
  const readyMembers = membersWithStatus.filter(m => canSelectMember(m));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-white text-lg mb-2">Loading Team Members...</div>
            <div className="text-gray-400 text-sm">Loading user information</div>
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
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-400">User not found</span>
            </div>
          </div>
        </div>

        {/* Selection Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="text-white font-semibold mb-2">
            Select {maxPlayers} Players ({selectedCount}/{maxPlayers})
          </div>
          <div className="text-gray-300 text-sm">
            {readyMembers.length} players ready
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-3 mb-6">
          {membersWithStatus.map((member) => {
            const isVerifying = verifying === member.userId;
            const isSelectable = canSelectMember(member);
            
            return (
              <div
                key={member.userId}
                className={`p-4 border rounded-lg transition-all ${
                  member.isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : isSelectable
                    ? 'border-gray-600 hover:border-gray-500 bg-gray-700 cursor-pointer'
                    : 'border-gray-700 bg-gray-800 cursor-not-allowed opacity-60'
                }`}
                onClick={() => isSelectable && !isVerifying && toggleMemberSelection(member.userId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      member.isSelected
                        ? 'border-blue-400 bg-blue-400'
                        : 'border-gray-400'
                    }`}>
                      {member.isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          {member.user?.username || 'Unknown User'}
                        </span>
                        {getStatusIcon(member)}
                      </div>
                      <div className="text-sm text-gray-300">
                        {member.user?.riotId || 'No Riot ID'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isVerifying && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    )}
                    <span className={`text-xs ${getStatusColor(member)}`}>
                      {getStatusText(member)}
                    </span>
                  </div>
                </div>
                
                {/* No action buttons needed - Discord not required */}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleConfirm}
            disabled={selectedCount !== maxPlayers}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Confirm Selection ({selectedCount}/{maxPlayers})
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberSelection; 