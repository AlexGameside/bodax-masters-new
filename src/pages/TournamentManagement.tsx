import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Calendar, 
  Trophy,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  MoreVertical,
  Settings,
  BarChart3
} from 'lucide-react';
import { getTournaments, deleteTournament, publishTournament, closeRegistration, startTournament, completeTournament } from '../services/tournamentService';
import { toast } from 'react-hot-toast';
import type { Tournament, TournamentStatus } from '../types/tournament';

const TournamentManagement = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadTournaments();
    }
  }, [currentUser]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const filters: any = {}; // Remove the createdBy filter to show all tournaments for admins
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await getTournaments(filters);
      setTournaments(data);
    } catch (error) {

      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!selectedTournament) return;

    try {
      await deleteTournament(selectedTournament.id);
      toast.success('Tournament deleted successfully');
      setShowDeleteModal(false);
      setSelectedTournament(null);
      loadTournaments();
    } catch (error) {

      toast.error('Failed to delete tournament');
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: TournamentStatus) => {
    try {
      switch (newStatus) {
        case 'registration-open':
          await publishTournament(tournamentId);
          toast.success('Tournament published successfully');
          break;
        case 'registration-closed':
          await closeRegistration(tournamentId);
          toast.success('Registration closed successfully');
          break;
        case 'in-progress':
          await startTournament(tournamentId);
          toast.success('Tournament started successfully');
          break;
        case 'completed':
          await completeTournament(tournamentId);
          toast.success('Tournament completed successfully');
          break;
      }
      loadTournaments();
    } catch (error) {

      toast.error('Failed to update tournament status');
    }
  };

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'registration-open': return 'bg-green-500';
      case 'registration-closed': return 'bg-yellow-500';
      case 'in-progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: TournamentStatus) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'registration-open': return <Users className="w-4 h-4" />;
      case 'registration-closed': return <Pause className="w-4 h-4" />;
      case 'in-progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to manage tournaments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tournament Management</h1>
            <p className="text-gray-400 mt-2">Manage your tournaments and track their progress</p>
          </div>
          <Link
            to="/admin/tournaments/create"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tournament</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TournamentStatus | 'all')}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="registration-open">Registration Open</option>
                <option value="registration-closed">Registration Closed</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={loadTournaments}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tournaments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No tournaments found</h3>
            <Link
              to="/admin/tournaments/create"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tournament</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <div key={tournament.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{tournament.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                        {getStatusIcon(tournament.status)}
                        <span className="ml-1 capitalize">{tournament.status?.replace('-', ' ') || 'Unknown'}</span>
                      </span>
                      <span className="text-sm text-gray-400">{tournament.region}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setSelectedTournament(tournament)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {tournament.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{tournament.teams.length}</div>
                    <div className="text-xs text-gray-400">Teams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{tournament.format?.teamCount || 8}</div>
                    <div className="text-xs text-gray-400">Max Teams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{(tournament.format?.teamCount || 8) - tournament.teams.length}</div>
                    <div className="text-xs text-gray-400">Spots Left</div>
                  </div>
                </div>

                {/* Format Info */}
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                  <span>{tournament.format?.type?.replace('-', ' ') || 'Unknown'}</span>
                  <span>{tournament.format?.matchFormat || 'Unknown'}</span>
                </div>

                {/* Prize Pool */}
                {tournament.prizePool.total > 0 && (
                  <div className="bg-gray-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Prize Pool</span>
                      <span className="font-semibold">€{tournament.prizePool.total}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    to={`/admin/tournaments/${tournament.id}`}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Link>
                  <Link
                    to={`/admin/tournaments/${tournament.id}/edit`}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </Link>
                  <Link
                    to={`/admin/tournaments/${tournament.id}/analytics`}
                    className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedTournament && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Delete Tournament</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{selectedTournament.name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTournament}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Actions Modal */}
        {selectedTournament && !showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Tournament Actions</h3>
              <div className="space-y-2">
                {selectedTournament.status === 'draft' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTournament.id, 'registration-open');
                      setSelectedTournament(null);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>Publish Tournament</span>
                  </button>
                )}
                
                {selectedTournament.status === 'registration-open' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTournament.id, 'registration-closed');
                      setSelectedTournament(null);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Close Registration</span>
                  </button>
                )}
                
                {selectedTournament.status === 'registration-closed' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTournament.id, 'in-progress');
                      setSelectedTournament(null);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Tournament</span>
                  </button>
                )}
                
                {selectedTournament.status === 'in-progress' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTournament.id, 'completed');
                      setSelectedTournament(null);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Tournament</span>
                  </button>
                )}
                
                <Link
                  to={`/admin/tournaments/${selectedTournament.id}`}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  onClick={() => setSelectedTournament(null)}
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </Link>
                
                <Link
                  to={`/admin/tournaments/${selectedTournament.id}/edit`}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  onClick={() => setSelectedTournament(null)}
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Tournament</span>
                </Link>
                
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setSelectedTournament(null);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Tournament</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentManagement; 