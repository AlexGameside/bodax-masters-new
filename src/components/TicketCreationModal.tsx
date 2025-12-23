import React, { useState } from 'react';
import { X, MessageCircle, AlertTriangle, HelpCircle, Ticket, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  createTicket, 
  canCreateTicket, 
  type CreateTicketRequest 
} from '../services/ticketService';
import { BodaxModal } from './ui';

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
    <BodaxModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Support Ticket"
      subtitle="Create a request · disputes · technical issues"
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-3 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="bodax-ticket-form"
            disabled={isSubmitting}
            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white border border-red-800 font-bodax text-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      }
    >
      <form id="bodax-ticket-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Type Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-3 font-mono uppercase tracking-widest">
              Ticket Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTicketType('general')}
                className={`p-4 border transition-colors text-left ${
                  ticketType === 'general'
                    ? 'border-red-600 bg-red-900/10 text-white'
                    : 'border-gray-800 bg-black/30 text-gray-300 hover:border-gray-600'
                }`}
              >
                <HelpCircle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-bold font-bodax tracking-wide uppercase text-center">General</div>
                <div className="text-xs text-gray-500 font-mono uppercase tracking-wider text-center mt-1">Questions & info</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('dispute')}
                className={`p-4 border transition-colors text-left ${
                  ticketType === 'dispute'
                    ? 'border-red-600 bg-red-900/10 text-white'
                    : 'border-gray-800 bg-black/30 text-gray-300 hover:border-gray-600'
                }`}
              >
                <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-bold font-bodax tracking-wide uppercase text-center">Dispute</div>
                <div className="text-xs text-gray-500 font-mono uppercase tracking-wider text-center mt-1">Match issues</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTicketType('support')}
                className={`p-4 border transition-colors text-left ${
                  ticketType === 'support'
                    ? 'border-red-600 bg-red-900/10 text-white'
                    : 'border-gray-800 bg-black/30 text-gray-300 hover:border-gray-600'
                }`}
              >
                <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-bold font-bodax tracking-wide uppercase text-center">Technical</div>
                <div className="text-xs text-gray-500 font-mono uppercase tracking-wider text-center mt-1">Bugs & problems</div>
              </button>
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white focus:border-red-600 focus:outline-none font-mono uppercase tracking-wider text-sm"
            >
              <option value="low">Low - General inquiry</option>
              <option value="medium">Medium - Standard issue</option>
              <option value="high">High - Important issue</option>
              <option value="urgent">Urgent - Critical problem</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white focus:border-red-600 focus:outline-none"
              placeholder="Brief description of your issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full bg-black/40 border border-gray-800 px-3 py-3 text-white focus:border-red-600 focus:outline-none resize-none"
              placeholder="Please provide detailed information about your issue..."
              required
            />
          </div>

          {/* Match Info Display */}
          {matchInfo && (
            <div className="bg-black/30 border border-gray-800 p-4">
              <h3 className="text-sm font-bold text-gray-400 mb-2 font-mono uppercase tracking-widest">Related Match</h3>
              <div className="text-sm text-gray-400 font-mono">
                <div>{matchInfo.team1} vs {matchInfo.team2}</div>
                {matchInfo.map && <div>Map: {matchInfo.map}</div>}
                {matchInfo.phase && <div>Phase: {matchInfo.phase}</div>}
              </div>
            </div>
          )}
      </form>
    </BodaxModal>
  );
};

export default TicketCreationModal; 