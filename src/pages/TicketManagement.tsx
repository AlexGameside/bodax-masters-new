import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { 
  getAllTickets, 
  getUserTickets, 
  closeTicket, 
  checkBotStatus,
  formatTicketType,
  formatTicketStatus,
  getTicketPriority,
  type TicketInfo
} from '../services/discordBotService';
import TicketCreationModal from '../components/TicketCreationModal';

const TicketManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<{ status: string; bot: string; uptime: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'status'>('priority');

  const isAdmin = currentUser?.isAdmin === true;

  useEffect(() => {
    loadTickets();
    checkBotStatus().then(setBotStatus).catch(console.error);
  }, []);

  useEffect(() => {
    filterAndSortTickets();
  }, [tickets, searchTerm, statusFilter, typeFilter, sortBy]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let allTickets: TicketInfo[];
      
      if (isAdmin) {
        allTickets = await getAllTickets();
      } else {
        allTickets = await getUserTickets(currentUser?.discordId || '');
      }
      
      setTickets(allTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
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
        ticket.id.toString().includes(searchTerm)
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
          const statusOrder = { open: 1, claimed: 2, escalated: 3, closed: 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 0);
        default:
          return 0;
      }
    });

    setFilteredTickets(filtered);
  };

  const handleCloseTicket = async (ticketNumber: number) => {
    try {
      await closeTicket(ticketNumber, currentUser?.email || 'Unknown');
      toast.success(`Ticket #${ticketNumber} closed successfully`);
      loadTickets(); // Reload tickets
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'claimed':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'closed':
        return <Ticket className="w-4 h-4 text-gray-400" />;
      default:
        return <Ticket className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case 'support':
        return <MessageCircle className="w-4 h-4 text-green-400" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Ticket className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300">You must be logged in to view tickets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 section-padding">
      <div className="container-modern">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Support Tickets</h1>
              <p className="text-xl text-gray-300">
                {isAdmin ? 'Manage all support tickets and disputes' : 'View your support tickets and disputes'}
              </p>
            </div>
            
            {/* Bot Status */}
            {botStatus && (
              <div className={`px-4 py-2 rounded-lg border ${
                botStatus.bot === 'connected' 
                  ? 'bg-green-900/50 border-green-700 text-green-300' 
                  : 'bg-red-900/50 border-red-700 text-red-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    botStatus.bot === 'connected' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium">
                    Bot: {botStatus.bot === 'connected' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="claimed">Claimed</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="support">Support</option>
              <option value="dispute">Dispute</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'status')}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="priority">Sort by Priority</option>
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-300 mb-2">No tickets found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first ticket to get started'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">#{ticket.id}</span>
                            {ticket.matchInfo && (
                              <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
                                Match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mt-1 max-w-xs truncate">
                            {ticket.subject}
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(ticket.type)}
                          <span className="text-sm text-gray-300">
                            {formatTicketType(ticket.type)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ticket.status)}
                          <span className={`text-sm ${formatTicketStatus(ticket.status).color}`}>
                            {formatTicketStatus(ticket.status).text}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </div>
                      </td>
                      
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300">
                            {ticket.userId}
                          </span>
                        </td>
                      )}
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(`https://discord.com/channels/${import.meta.env.VITE_DISCORD_GUILD_ID}/${ticket.channelId}`, '_blank')}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          
                          {ticket.status !== 'closed' && (
                            <button
                              onClick={() => handleCloseTicket(ticket.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                            >
                              <span>Close</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        {!loading && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tickets.filter(t => t.status === 'open').length}
                  </p>
                  <p className="text-sm text-gray-400">Open Tickets</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tickets.filter(t => t.type === 'dispute').length}
                  </p>
                  <p className="text-sm text-gray-400">Disputes</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <User className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tickets.filter(t => t.status === 'claimed').length}
                  </p>
                  <p className="text-sm text-gray-400">Claimed</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Ticket className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tickets.filter(t => t.status === 'closed').length}
                  </p>
                  <p className="text-sm text-gray-400">Closed</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Creation Modal */}
      <TicketCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
      />
    </div>
  );
};

export default TicketManagement; 