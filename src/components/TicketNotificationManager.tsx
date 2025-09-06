import React, { useState, useEffect, useRef } from 'react';
import TicketNotification from './TicketNotification';
import { subscribeToTickets } from '../services/ticketService';

interface TicketNotificationData {
  id: string;
  ticket: {
    id: string;
    subject: string;
    type: 'general' | 'dispute' | 'support';
    responses: any[];
  };
  responseCount: number;
  timestamp: number;
}

interface TicketNotificationManagerProps {
  currentUser: any;
}

const TicketNotificationManager: React.FC<TicketNotificationManagerProps> = ({
  currentUser
}) => {
  const [notifications, setNotifications] = useState<TicketNotificationData[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());
  
  // Use useRef to track last response counts without causing re-renders
  const lastResponseCountsRef = useRef<Record<string, number>>({});

  // Load persistent notifications from localStorage on mount
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      const storedNotifications = localStorage.getItem(`ticket-notifications-${currentUser.id}`);
      const storedVisible = localStorage.getItem(`ticket-visible-${currentUser.id}`);
      
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications);
        setNotifications(parsedNotifications);
      }
      
      if (storedVisible) {
        const parsedVisible = JSON.parse(storedVisible);
        setVisibleNotifications(new Set(parsedVisible));
      }
    } catch (error) {
      console.error('Error loading persistent notifications:', error);
    }
  }, [currentUser?.id]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!currentUser?.id) return;

    try {
      localStorage.setItem(`ticket-notifications-${currentUser.id}`, JSON.stringify(notifications));
      localStorage.setItem(`ticket-visible-${currentUser.id}`, JSON.stringify([...visibleNotifications]));
    } catch (error) {
      console.error('Error saving persistent notifications:', error);
    }
  }, [notifications, visibleNotifications, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Subscribe to ticket updates for the current user
    const unsubscribe = subscribeToTickets(currentUser.id, false, (tickets) => {
      tickets.forEach(ticket => {
        const currentResponseCount = ticket.responses?.length || 0;
        const lastResponseCount = lastResponseCountsRef.current[ticket.id] || 0;

        // Check if this is the first time we're seeing this ticket
        const isFirstTime = !(ticket.id in lastResponseCountsRef.current);
        
        // Show notification if there are new responses and it's not the first time
        if (currentResponseCount > lastResponseCount && !isFirstTime) {
          const newResponses = currentResponseCount - lastResponseCount;
          
          // Create notification
          const notification: TicketNotificationData = {
            id: `${ticket.id}-${Date.now()}`,
            ticket: {
              id: ticket.id,
              subject: ticket.subject,
              type: ticket.type,
              responses: ticket.responses || []
            },
            responseCount: newResponses,
            timestamp: Date.now()
          };

          setNotifications(prev => [...prev, notification]);
          setVisibleNotifications(prev => new Set([...prev, notification.id]));
        }

        // Update the last response count in ref
        lastResponseCountsRef.current[ticket.id] = currentResponseCount;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const handleCloseNotification = (notificationId: string) => {
    setVisibleNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });

    // Remove the notification after a delay
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, 300);
  };

  return (
    <>
      {notifications.map(notification => (
        <TicketNotification
          key={notification.id}
          isVisible={visibleNotifications.has(notification.id)}
          onClose={() => handleCloseNotification(notification.id)}
          ticket={notification.ticket}
          responseCount={notification.responseCount}
        />
      ))}
    </>
  );
};

export default TicketNotificationManager;
