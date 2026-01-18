import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Building2,
  Trophy,
  Plus,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Settings,
  TrendingUp,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getOrganizerInfo } from '../services/organizerService';
import { getTournaments } from '../services/tournamentService';
import { getUserById } from '../services/firebaseService';
import { notifyAuthStateListeners } from '../services/authService';
import type { Tournament, OrganizerInfo } from '../types/tournament';

const OrganizerDashboard = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    totalRevenue: 0,
    totalPayouts: 0,
  });
  const hasCheckedUser = useRef(false);

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load organizer info
      const info = await getOrganizerInfo(currentUser.id);
      setOrganizerInfo(info);

      // Load tournaments created by this organizer
      const allTournaments = await getTournaments({});
      const myTournaments = allTournaments.filter(
        t => t.organizerId === currentUser.id
      );
      setTournaments(myTournaments);

      // Calculate stats
      const active = myTournaments.filter(
        t => t.status === 'registration-open' || t.status === 'in-progress'
      ).length;

      const revenue = myTournaments.reduce((sum, t) => {
        return sum + (t.paymentInfo?.totalCollected || 0);
      }, 0);

      const payouts = myTournaments.reduce((sum, t) => {
        if (t.paymentInfo?.payoutStatus === 'completed') {
          return sum + (t.paymentInfo.organizerPayoutAmount || 0);
        }
        return sum;
      }, 0);

      setStats({
        totalTournaments: myTournaments.length,
        activeTournaments: active,
        totalRevenue: revenue,
        totalPayouts: payouts,
      });
    } catch (error) {
      console.error('Error loading organizer data:', error);
      toast.error('Failed to load organizer data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Prevent multiple checks
    if (hasCheckedUser.current) {
      return;
    }

    const checkUserAndLoad = async () => {
      // If no user after auth loads, redirect to login
      if (!currentUser) {
        navigate('/login');
        return;
      }

      hasCheckedUser.current = true;

      // Refresh user data to get latest verification status
      try {
        const refreshedUser = await getUserById(currentUser.id);
        
        if (refreshedUser) {
          // Only update if verification status changed
          if (refreshedUser.isVerifiedOrganizer !== currentUser.isVerifiedOrganizer) {
            notifyAuthStateListeners(refreshedUser);
          }
          
          if (refreshedUser.isVerifiedOrganizer) {
            // User is verified, proceed
            loadData();
          } else {
            // User is not verified yet
            navigate('/organizer/apply');
            return;
          }
        } else {
          // User not found
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
        // Fallback to current user check
        if (currentUser.isVerifiedOrganizer) {
          loadData();
        } else {
          navigate('/organizer/apply');
          return;
        }
      }
    };

    checkUserAndLoad();
  }, [currentUser, navigate, authLoading, loadData]);

  // Handle success/refresh query parameters from Stripe redirect
  useEffect(() => {
    // Wait for auth to finish loading before processing query params
    if (authLoading || !currentUser) {
      return;
    }

    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true') {
      // Reload data after successful payment or action
      loadData();
      
      // Remove query parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('success');
      setSearchParams(newParams, { replace: true });
    }

    if (refresh === 'true') {
      // Just refresh the data
      loadData();
      
      // Remove query parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('refresh');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, currentUser, loadData, authLoading]);


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

  // Show loading while auth is loading, checking user, or loading data
  if (authLoading || loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
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
              <p className="text-sm uppercase tracking-[0.35em] text-red-500 font-mono mb-4">Organizer Dashboard</p>
              <h1 className="text-4xl sm:text-5xl font-bold font-bodax tracking-wider text-white mb-4 flex items-center">
                <Building2 className="w-8 h-8 mr-3 text-red-500" />
                Tournament Organizer
              </h1>
              <p className="text-gray-300 font-mono text-sm">
                {organizerInfo?.businessName || 'Manage your tournaments and payments'}
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
                to="/organizer/tournaments"
                className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-3 px-8 font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
              >
                <Trophy className="w-5 h-5" />
                <span>Manage Tournaments</span>
              </Link>
            </div>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 transition-colors p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold font-bodax">{stats.totalTournaments}</span>
            </div>
            <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Total Tournaments</p>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 transition-colors p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold font-bodax">{stats.activeTournaments}</span>
            </div>
            <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Active Tournaments</p>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 transition-colors p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold font-bodax">€{stats.totalRevenue.toFixed(2)}</span>
            </div>
            <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Total Revenue</p>
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800 hover:border-gray-700 transition-colors p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold font-bodax">€{stats.totalPayouts.toFixed(2)}</span>
            </div>
            <p className="text-gray-400 text-sm font-mono uppercase tracking-wider">Total Payouts</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/admin/tournaments/create"
            className="bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-gray-800 hover:border-red-800 transition-colors p-6"
          >
            <Plus className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2 font-bodax tracking-wide">Create Tournament</h3>
            <p className="text-gray-400 text-sm font-mono">
              Set up a new tournament with entry fees and manage registrations
            </p>
          </Link>

          <Link
            to="/organizer/tournaments"
            className="bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-gray-800 hover:border-red-800 transition-colors p-6"
          >
            <Settings className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2 font-bodax tracking-wide">Manage Tournaments</h3>
            <p className="text-gray-400 text-sm font-mono">
              View and manage all your tournaments, registrations, and payments
            </p>
          </Link>

          <div className="bg-[#0a0a0a] border border-gray-800 p-6">
            <Building2 className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2 font-bodax tracking-wide">Business Info</h3>
            <p className="text-gray-400 text-sm mb-3 font-mono">
              {organizerInfo?.businessName}
            </p>
            <Link
              to="/organizer/apply"
              className="text-red-500 hover:text-red-400 text-sm font-mono uppercase tracking-wider transition-colors"
            >
              View Details →
            </Link>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div className="bg-[#0a0a0a] border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold font-bodax tracking-wide uppercase">Your Tournaments</h2>
            <Link
              to="/organizer/tournaments"
              className="text-red-500 hover:text-red-400 text-sm font-mono uppercase tracking-wider transition-colors"
            >
              View All →
            </Link>
          </div>

          {tournaments.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400 mb-4 font-mono">You haven't created any tournaments yet</p>
              <Link
                to="/admin/tournaments/create"
                className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 px-8 font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Tournament</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.slice(0, 5).map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                  className="block bg-[#050505] hover:bg-[#0f0f0f] border border-gray-800 hover:border-gray-700 p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 font-bodax">{tournament.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 font-mono">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {tournament.teams.length}/{tournament.format.teamCount} teams
                        </span>
                        {tournament.paymentInfo && (
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            €{tournament.paymentInfo.entryFee} entry fee
                          </span>
                        )}
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(tournament.schedule?.startDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium font-mono uppercase tracking-wider ${
                          tournament.status === 'registration-open'
                            ? 'bg-green-900/20 text-green-400 border border-green-800'
                            : tournament.status === 'in-progress'
                            ? 'bg-red-900/20 text-red-400 border border-red-800'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {tournament.status?.replace('-', ' ')}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
