import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Ticket, 
  MessageCircle, 
  AlertTriangle, 
  HelpCircle, 
  Clock, 
  User, 
  Calendar,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  MessageSquare,
  Shield,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { 
  getAllTickets, 
  getUserTickets, 
  closeTicket,
  claimTicket,
  formatTicketType,
  formatTicketStatus,
  getTicketPriority,
  subscribeToTickets,
  deleteTicket,
  type Ticket as TicketType
} from '../services/ticketService';
import TicketCreationModal from '../components/TicketCreationModal';
import TicketDetailModal from '../components/TicketDetailModal';

const TicketManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'status'>('priority');

  const isAdmin = currentUser?.isAdmin === true;

  useEffect(() => {
    loadTickets();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToTickets(
      currentUser?.id || null,
      isAdmin,
      (updatedTickets) => {
        setTickets(updatedTickets);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id, isAdmin]);

  // Check for ticket parameter in URL to auto-open a specific ticket
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicketId(ticketId);
        setShowDetailModal(true);
      }
    }
  }, [searchParams, tickets]);

  useEffect(() => {
    filterAndSortTickets();
  }, [tickets, searchTerm, statusFilter, typeFilter, sortBy]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let allTickets: TicketType[];
      
      if (isAdmin) {
        allTickets = await getAllTickets();
      } else {
        allTickets = await getUserTickets(currentUser?.id || '');
      }
      
      setTickets(allTickets);
    } catch (error) {

      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTickets = () => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm) ||
        ticket.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getTicketPriority(b) - getTicketPriority(a);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                 case 'status':
           const statusOrder = { open: 1, claimed: 2, closed: 3 };
           return (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
                  (statusOrder[b.status as keyof typeof statusOrder] || 0);
        default:
          return 0;
      }
    });

    setFilteredTickets(filtered);
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await closeTicket(ticketId, currentUser?.id || '', currentUser?.username || currentUser?.email || '');
      toast.success('Ticket closed successfully');
    } catch (error) {

      toast.error('Failed to close ticket');
    }
  };

  const handleClaimTicket = async (ticketId: string) => {
    try {
      await claimTicket(ticketId, currentUser?.id || '', currentUser?.username || currentUser?.email || '');
      toast.success('Ticket claimed successfully');
    } catch (error) {

      toast.error('Failed to claim ticket');
    }
  };

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setShowDetailModal(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
      toast.success('Ticket deleted successfully');
    } catch (error) {

      toast.error('Failed to delete ticket');
    }
  };

  const handleTicketUpdated = () => {
    // The subscription will automatically update the tickets
  };

  const getStatusCount = (status: string) => {
    return tickets.filter(ticket => ticket.status === status).length;
  };

  const getTypeCount = (type: string) => {
    return tickets.filter(ticket => ticket.type === type).length;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Support Tickets</h1>
            <p className="text-gray-400">
              {isAdmin ? 'Manage all support tickets' : 'View your support tickets'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Ticket className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>
            
            <button
              onClick={loadTickets}
              disabled={loading}
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
                         <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
             >
               <option value="all">All Statuses</option>
               <option value="open">Open</option>
               <option value="claimed">Claimed</option>
               <option value="closed">Closed</option>
             </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="dispute">Dispute</option>
              <option value="support">Support</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="priority">Sort by Priority</option>
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Ticket className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tickets.length}
                  </p>
                  <p className="text-sm text-gray-400">Total Tickets</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {getStatusCount('open')}
                  </p>
                  <p className="text-sm text-gray-400">Open</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {getStatusCount('claimed')}
                  </p>
                  <p className="text-sm text-gray-400">Claimed</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {getStatusCount('closed')}
                  </p>
                  <p className="text-sm text-gray-400">Closed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No tickets found</h3>
              <p className="text-gray-400">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : isAdmin 
                    ? 'No tickets have been created yet'
                    : 'You haven\'t created any tickets yet'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredTickets.map((ticket) => {
                const statusInfo = formatTicketStatus(ticket.status);
                const typeInfo = formatTicketType(ticket.type);
                
                return (
                  <div key={ticket.id} className="p-6 hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {ticket.subject}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                          <span className="px-2 py-1 bg-gray-600 rounded-full text-xs text-gray-300">
                            {typeInfo}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                            ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            ticket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{ticket.userName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{ticket.responses.length} responses</span>
                          </div>
                        </div>

                        {/* Match Info */}
                        {ticket.matchInfo && (
                          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                            <h4 className="text-blue-300 font-medium mb-1">Related Match</h4>
                            <div className="text-sm text-blue-200">
                              {ticket.matchInfo.team1} vs {ticket.matchInfo.team2}
                              {ticket.matchInfo.map && ` • ${ticket.matchInfo.map}`}
                              {ticket.matchInfo.phase && ` • ${ticket.matchInfo.phase}`}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewTicket(ticket.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {isAdmin && ticket.status === 'open' && (
                          <button
                            onClick={() => handleClaimTicket(ticket.id)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Claim Ticket"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        
                        {isAdmin && ticket.status !== 'closed' && (
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Close Ticket"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
              </div>

      {/* Ticket Creation Modal */}
      <TicketCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTicketId(null);
        }}
        ticketId={selectedTicketId}
        currentUser={currentUser}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  );
};

export default TicketManagement; 