import React, { useState } from 'react';
import { X, MessageCircle, AlertTriangle, HelpCircle, Ticket, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  createTicket, 
  canCreateTicket, 
  type CreateTicketRequest 
} from '../services/ticketService';

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
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill subject and description for disputes
  React.useEffect(() => {
    if (ticketType === 'dispute' && matchInfo) {
      setSubject(`Match Dispute - ${matchInfo.team1} vs ${matchInfo.team2}`);
      setDescription(`Match between ${matchInfo.team1} and ${matchInfo.team2}${matchInfo.map ? ` on ${matchInfo.map}` : ''}${matchInfo.phase ? ` during ${matchInfo.phase} phase` : ''}`);
      setPriority('high');
    }
  }, [ticketType, matchInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateTicket(currentUser)) {
      toast.error('You must be logged in to create tickets');
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticketRequest: CreateTicketRequest = {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.username || currentUser.email,
        subject: subject.trim(),
        description: description.trim(),
        ticketType,
        matchInfo,
        priority
      };

      const ticket = await createTicket(ticketRequest);
      toast.success(`Ticket #${ticket.id} created successfully!`);
      
      // Reset form and close modal
      setSubject('');
      setDescription('');
      setPriority('medium');
      onClose();
    } catch (error) {

      toast.error(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setPriority('medium');
      setTicketType(initialType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Ticket className="w-5 h-5" />
              <span>Create Support Ticket</span>
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ticket Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Ticket Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTicketType('general')}
                className={`p-4 rounded-lg border transition-colors ${
                  ticketType === 'general'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <HelpCircle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">General Support</div>
                <div className="text-xs text-gray-400">General questions and issues</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('dispute')}
                className={`p-4 rounded-lg border transition-colors ${
                  ticketType === 'dispute'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Match Dispute</div>
                <div className="text-xs text-gray-400">Match-related issues</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('support')}
                className={`p-4 rounded-lg border transition-colors ${
                  ticketType === 'support'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Technical Support</div>
                <div className="text-xs text-gray-400">Technical problems</div>
              </button>
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Low - General inquiry</option>
              <option value="medium">Medium - Standard issue</option>
              <option value="high">High - Important issue</option>
              <option value="urgent">Urgent - Critical problem</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Brief description of your issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Please provide detailed information about your issue..."
              required
            />
          </div>

          {/* Match Info Display */}
          {matchInfo && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Related Match</h3>
              <div className="text-sm text-gray-400">
                <div>{matchInfo.team1} vs {matchInfo.team2}</div>
                {matchInfo.map && <div>Map: {matchInfo.map}</div>}
                {matchInfo.phase && <div>Phase: {matchInfo.phase}</div>}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketCreationModal; 