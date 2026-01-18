import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  ArrowRight,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getTournaments } from '../services/tournamentService';
import { deleteTournament, updateTournamentStatus } from '../services/tournamentService';
import type { Tournament } from '../types/tournament';

const OrganizerTournamentManagement = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allTournaments = await getTournaments({});
      // Filter to only show tournaments created by this organizer
      const myTournaments = allTournaments.filter(
        t => t.organizerId === currentUser.id
      );
      setTournaments(myTournaments);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || !currentUser.isVerifiedOrganizer) {
      navigate('/organizer/apply');
      return;
    }

    loadTournaments();
  }, [currentUser, authLoading, navigate, loadTournaments]);

  const handleDelete = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(tournamentId);
      await deleteTournament(tournamentId);
      toast.success('Tournament deleted successfully');
      loadTournaments();
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      toast.error(error.message || 'Failed to delete tournament');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: string) => {
    try {
      await updateTournamentStatus(tournamentId, newStatus as any);
      toast.success('Tournament status updated');
      loadTournaments();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!currentUser || !currentUser.isVerifiedOrganizer) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,76,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,178,255,0.08),transparent_35%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-red-500 font-mono mb-4">Tournament Management</p>
              <h1 className="text-4xl sm:text-5xl font-bold font-bodax tracking-wider text-white mb-4 flex items-center">
                <Trophy className="w-8 h-8 mr-3 text-red-500" />
                My Tournaments
              </h1>
              <p className="text-gray-300 font-mono text-sm">
                Manage and edit tournaments you've created
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/admin/tournaments/create"
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 px-8 font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500"
              >
                <Plus className="w-5 h-5" />
                <span>Create Tournament</span>
              </Link>
              <Link
                to="/organizer/dashboard"
                className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-3 px-8 font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-8 flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0a0a0a] border border-gray-800 text-white px-4 py-2 rounded font-mono text-sm focus:outline-none focus:border-red-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="registration-open">Registration Open</option>
            <option value="registration-closed">Registration Closed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-gray-400 font-mono text-sm">
            {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tournaments List */}
        {filteredTournaments.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bodax text-gray-400 mb-2">No Tournaments Found</h3>
            <p className="text-gray-500 font-mono text-sm mb-6">
              {filterStatus === 'all' 
                ? "You haven't created any tournaments yet."
                : `No tournaments with status "${filterStatus}"`
              }
            </p>
            {filterStatus === 'all' && (
              <Link
                to="/admin/tournaments/create"
                className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 px-8 font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Tournament</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 rounded-lg p-6 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bodax text-white mb-2">{tournament.name}</h3>
                        <p className="text-gray-400 font-mono text-sm mb-4 line-clamp-2">
                          {tournament.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {tournament.status === 'registration-open' && (
                          <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded font-mono text-xs uppercase border border-green-800">
                            Open
                          </span>
                        )}
                        {tournament.status === 'in-progress' && (
                          <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded font-mono text-xs uppercase border border-blue-800">
                            In Progress
                          </span>
                        )}
                        {tournament.status === 'completed' && (
                          <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded font-mono text-xs uppercase border border-gray-700">
                            Completed
                          </span>
                        )}
                        {tournament.status === 'draft' && (
                          <span className="bg-yellow-900/30 text-yellow-400 px-3 py-1 rounded font-mono text-xs uppercase border border-yellow-800">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span className="font-mono text-sm">
                          {tournament.teams.length}/{tournament.format.teamCount} Teams
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="font-mono text-sm">
                          {formatDate(tournament.schedule.startDate)}
                        </span>
                      </div>
                      {tournament.paymentInfo && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-mono text-sm">
                            €{tournament.paymentInfo.totalCollected.toFixed(2)} Collected
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <Trophy className="w-4 h-4" />
                        <span className="font-mono text-sm">
                          {tournament.format.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 font-mono text-xs uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Link>
                    <Link
                      to={`/organizer/tournaments/${tournament.id}/manage`}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 font-mono text-xs uppercase tracking-wider transition-all duration-300 border border-blue-800 hover:border-blue-500"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manage</span>
                    </Link>
                    <Link
                      to={`/admin/tournaments/${tournament.id}/edit`}
                      className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 font-mono text-xs uppercase tracking-wider transition-all duration-300 border border-gray-600 hover:border-gray-500"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(tournament.id)}
                      disabled={deletingId === tournament.id}
                      className="flex items-center justify-center space-x-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 px-4 font-mono text-xs uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{deletingId === tournament.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerTournamentManagement;
