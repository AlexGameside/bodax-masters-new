import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  User, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  HelpCircle,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getTicket,
  addTicketResponse,
  closeTicket,
  claimTicket,
  formatTicketType,
  formatTicketStatus,
  type Ticket,
  type TicketResponse
} from '../services/ticketService';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  currentUser: any;
  onTicketUpdated: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  currentUser,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  const isAdmin = currentUser?.isAdmin === true;
  const isTicketOwner = ticket?.userId === currentUser?.uid;

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket();
    }
  }, [isOpen, ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;
    
    try {
      setLoading(true);
      const ticketData = await getTicket(ticketId, currentUser?.isAdmin || false, currentUser?.id || '');
      setTicket(ticketData);
    } catch (error) {

      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticket || !responseMessage.trim()) return;

    try {
      setSendingResponse(true);
      
      await addTicketResponse({
        ticketId: ticket.id,
        userId: currentUser.id,
        userName: currentUser.username || currentUser.email,
        userEmail: currentUser.email,
        isAdmin: isAdmin,
        message: responseMessage.trim()
      });

      setResponseMessage('');
      await loadTicket(); // Reload ticket to get updated responses
      onTicketUpdated();
      toast.success('Response sent successfully');
    } catch (error) {

      toast.error('Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleClaimTicket = async () => {
    if (!ticket) return;

    try {
      await claimTicket(ticket.id, currentUser.id, currentUser.username || currentUser.email);
      await loadTicket();
      onTicketUpdated();
      toast.success('Ticket claimed successfully');
    } catch (error) {

      toast.error('Failed to claim ticket');
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;

    try {
      await closeTicket(ticket.id, currentUser.id, currentUser.username || currentUser.email);
      await loadTicket();
      onTicketUpdated();
      toast.success('Ticket closed successfully');
    } catch (error) {

      toast.error('Failed to close ticket');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <HelpCircle className="w-5 h-5 text-blue-400" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'support':
        return <MessageSquare className="w-5 h-5 text-green-400" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">
                {loading ? 'Loading Ticket...' : `Ticket #${ticket?.id}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading ticket details...</p>
          </div>
        ) : ticket ? (
          <div className="p-6">
            {/* Ticket Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{ticket.subject}</h3>
                  <p className="text-gray-300 mb-4">{ticket.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(ticket.type)}
                      <span className="text-gray-400">{formatTicketType(ticket.type)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${formatTicketStatus(ticket.status).color}`}>
                        {formatTicketStatus(ticket.status).text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && ticket.status !== 'closed' && (
                  <div className="flex items-center space-x-2">
                    {ticket.status === 'open' && (
                      <button
                        onClick={handleClaimTicket}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Claim</span>
                      </button>
                    )}
                    <button
                      onClick={handleCloseTicket}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Ticket Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Created by: {ticket.userName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    Created: {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{ticket.responses.length} responses</span>
                </div>
              </div>

              {/* Match Info */}
              {ticket.matchInfo && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <h4 className="text-blue-300 font-medium mb-2">Related Match</h4>
                  <div className="text-sm text-blue-200">
                    <div>{ticket.matchInfo.team1} vs {ticket.matchInfo.team2}</div>
                    {ticket.matchInfo.map && <div>Map: {ticket.matchInfo.map}</div>}
                    {ticket.matchInfo.phase && <div>Phase: {ticket.matchInfo.phase}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Responses */}
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-semibold text-white">Responses</h4>
              
              {ticket.responses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No responses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticket.responses.map((response: TicketResponse) => (
                    <div
                      key={response.id}
                      className={`p-4 rounded-lg border ${
                        response.isAdmin
                          ? 'bg-blue-900/20 border-blue-700'
                          : 'bg-gray-800 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${
                            response.isAdmin ? 'text-blue-300' : 'text-gray-300'
                          }`}>
                            {response.userName}
                            {response.isAdmin && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                ADMIN
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(response.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{response.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Response Form */}
            <form onSubmit={handleSendResponse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {isAdmin ? 'Admin Response' : 'Add Response'}
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder={isAdmin ? 'Type your admin response...' : 'Type your response...'}
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingResponse || !responseMessage.trim()}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingResponse ? 'Sending...' : 'Send Response'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Ticket Not Found</h3>
            <p className="text-gray-400">The requested ticket could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetailModal;
