import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock, Users, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { onNotificationsChange, markNotificationAsRead, deleteNotification, acceptTeamInvitation, declineTeamInvitation } from '../services/firebaseService';
import type { Notification } from '../types/tournament';

interface NotificationBellProps {
  userId: string;
  onNavigate?: (path: string) => void; // Callback for navigation
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (userId) {
      // Set up real-time listener for notifications
      const unsubscribe = onNotificationsChange(userId, (newNotifications) => {
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.isRead).length);
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    }
  }, [userId]);

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // No need to manually update state - real-time listener will handle it
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      // No need to manually update state - real-time listener will handle it
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      console.log('Accepting invitation:', notification.data?.invitationId);
      if (notification.data?.invitationId) {
        await acceptTeamInvitation(notification.data.invitationId);
        await handleDeleteNotification(notification.id);
        
        // Show success message
        toast.success('Invitation accepted! You have joined the team.');
        
        // Navigate to team management page
        if (onNavigate) {
          console.log('Navigating to /team-management');
          onNavigate('/team-management');
        } else {
          console.log('onNavigate is not available');
        }
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      // Show error to user
      toast.error('Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    try {
      if (notification.data?.invitationId) {
        await declineTeamInvitation(notification.data.invitationId);
        await handleDeleteNotification(notification.id);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      // Show error to user
      toast.error('Failed to decline invitation. Please try again.');
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'team_invite':
        return '👥';
      case 'team_role_change':
        return '👑';
      case 'team_removal':
        return '🚪';
      case 'tournament_invite':
        return '🏆';
      case 'match_scheduled':
        return '📅';
      case 'match_result':
        return '🎯';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
        ref={buttonRef}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto" 
          style={{ zIndex: 9999 }}
          ref={dropdownRef}
        >
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                    !notification.isRead ? 'bg-gray-750' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium text-sm">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        {notification.message}
                      </p>
                      
                      {/* Action buttons for team invitations */}
                      {notification.type === 'team_invite' && notification.data?.invitationId && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleAcceptInvitation(notification)}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(notification)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 