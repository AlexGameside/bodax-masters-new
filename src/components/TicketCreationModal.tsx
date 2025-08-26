import React, { useState } from 'react';
import { X, MessageCircle, AlertTriangle, HelpCircle, Ticket, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createTicket, createMatchDispute, canCreateTicket, type CreateTicketRequest, type CreateDisputeRequest } from '../services/discordBotService';

interface TicketCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  matchInfo?: {
    team1: string;
    team2: string;
    map?: string;
    phase?: string;
  };
  initialType?: 'general' | 'dispute' | 'support';
}

const TicketCreationModal: React.FC<TicketCreationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  matchInfo,
  initialType = 'general'
}) => {
  const [ticketType, setTicketType] = useState<'general' | 'dispute' | 'support'>(initialType);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill subject and description for disputes
  React.useEffect(() => {
    if (ticketType === 'dispute' && matchInfo) {
      setSubject(`Match Dispute - ${matchInfo.team1} vs ${matchInfo.team2}`);
      setDescription(`Match between ${matchInfo.team1} and ${matchInfo.team2}${matchInfo.map ? ` on ${matchInfo.map}` : ''}${matchInfo.phase ? ` during ${matchInfo.phase} phase` : ''}`);
    }
  }, [ticketType, matchInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateTicket(currentUser)) {
      toast.error('You must have Discord linked to create tickets');
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (ticketType === 'dispute' && !disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    setIsSubmitting(true);

    try {
      let ticket;

      if (ticketType === 'dispute') {
        const disputeRequest: CreateDisputeRequest = {
          userId: currentUser.discordId,
          matchInfo: matchInfo!,
          disputeReason: disputeReason.trim()
        };
        ticket = await createMatchDispute(disputeRequest);
        toast.success(`Dispute ticket #${ticket.id} created successfully!`);
      } else {
        const ticketRequest: CreateTicketRequest = {
          userId: currentUser.discordId,
          subject: subject.trim(),
          description: description.trim(),
          ticketType,
          matchInfo
        };
        ticket = await createTicket(ticketRequest);
        toast.success(`Ticket #${ticket.id} created successfully!`);
      }

      // Reset form and close modal
      setSubject('');
      setDescription('');
      setDisputeReason('');
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setDisputeReason('');
      setTicketType(initialType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Ticket className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Create Support Ticket</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Discord Link Warning */}
        {!canCreateTicket(currentUser) && (
          <div className="mx-6 mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 font-medium">Discord Account Required</span>
            </div>
            <p className="text-red-200 text-sm mt-1">
              You must link your Discord account to create support tickets. 
              Go to your profile to link Discord first.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ticket Type Selection */}
          <div>
            <label className="block text-gray-200 font-medium mb-3">Ticket Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTicketType('general')}
                className={`p-3 rounded-lg border transition-all ${
                  ticketType === 'general'
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <HelpCircle className="w-5 h-5 mx-auto mb-2" />
                <span className="text-sm">General</span>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('support')}
                className={`p-3 rounded-lg border transition-all ${
                  ticketType === 'support'
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <MessageCircle className="w-5 h-5 mx-auto mb-2" />
                <span className="text-sm">Support</span>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('dispute')}
                disabled={!matchInfo}
                className={`p-3 rounded-lg border transition-all ${
                  ticketType === 'dispute'
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                <span className="text-sm">Dispute</span>
              </button>
            </div>
            
            {!matchInfo && ticketType === 'dispute' && (
              <p className="text-yellow-400 text-sm mt-2">
                Dispute tickets can only be created from match pages
              </p>
            )}
          </div>

          {/* Match Info Display (for disputes) */}
          {ticketType === 'dispute' && matchInfo && (
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <h4 className="text-blue-300 font-medium mb-2">Match Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Teams:</span>
                  <span className="text-white ml-2">{matchInfo.team1} vs {matchInfo.team2}</span>
                </div>
                {matchInfo.map && (
                  <div>
                    <span className="text-gray-400">Map:</span>
                    <span className="text-white ml-2">{matchInfo.map}</span>
                  </div>
                )}
                {matchInfo.phase && (
                  <div>
                    <span className="text-gray-400">Phase:</span>
                    <span className="text-white ml-2">{matchInfo.phase}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-gray-200 font-medium mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Brief description of your issue"
              required
              disabled={ticketType === 'dispute'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-200 font-medium mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Please provide detailed information about your issue..."
              rows={4}
              required
              disabled={ticketType === 'dispute'}
            />
          </div>

          {/* Dispute Reason (for disputes only) */}
          {ticketType === 'dispute' && (
            <div>
              <label className="block text-gray-200 font-medium mb-2">
                Reason for Dispute *
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Please explain why you are disputing this match..."
                rows={3}
                required
              />
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-start space-x-3">
              <MessageCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-1">How tickets work:</p>
                <ul className="space-y-1">
                  <li>• Your ticket will be created in our Discord server</li>
                  <li>• Support staff will respond within 24 hours</li>
                  <li>• You'll be automatically added to the ticket if you're in our Discord</li>
                  <li>• Match disputes are automatically escalated to admins</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canCreateTicket(currentUser)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Create Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketCreationModal; 