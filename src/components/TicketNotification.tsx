import React, { useState, useEffect } from 'react';
import { X, MessageSquare, AlertTriangle, HelpCircle, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatTicketType } from '../services/ticketService';

interface TicketNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  ticket: {
    id: string;
    subject: string;
    type: 'general' | 'dispute' | 'support';
    responses: any[];
  };
  responseCount: number;
}

const TicketNotification: React.FC<TicketNotificationProps> = ({
  isVisible,
  onClose,
  ticket,
  responseCount
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    }
  }, [isVisible]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'support':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'border-blue-500 bg-blue-500/10';
      case 'dispute':
        return 'border-red-500 bg-red-500/10';
      case 'support':
        return 'border-green-500 bg-green-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        className={`bg-gray-900 border rounded-lg shadow-lg p-4 transform transition-all duration-300 ${
          isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${getTypeColor(ticket.type)}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span className="text-sm font-medium text-white">New Ticket Response</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {getTypeIcon(ticket.type)}
            <span className="text-xs text-gray-300">{formatTicketType(ticket.type)}</span>
          </div>
          
          <h4 className="text-sm font-medium text-white line-clamp-2">
            {ticket.subject}
          </h4>
          
          <p className="text-xs text-gray-400">
            Ticket #{ticket.id.slice(-8)} has {responseCount} new response{responseCount > 1 ? 's' : ''}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <button
            onClick={() => {
              // Navigate to tickets page and open the specific ticket
              window.location.href = `/tickets?ticket=${ticket.id}`;
              onClose();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center space-x-1"
          >
            <MessageSquare className="w-3 h-3" />
            <span>View Response</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketNotification;
