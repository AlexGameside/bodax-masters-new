import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LogIn, Shield, Trophy, Users, Home, Settings, Bell, Gamepad2 } from 'lucide-react';
import type { User as UserType, Match } from '../types/tournament';
import NotificationBell from './NotificationBell';
import { getUserMatches } from '../services/firebaseService';

interface NavbarProps {
  currentUser: UserType | null;
  isAdmin?: boolean;
  onTeamUpdate?: () => void; // Callback to notify parent component of team changes
  onNavigate?: (path: string) => void; // Callback for navigation
  onLogout?: () => void; // Callback for logout
}

const Navbar = ({ currentUser, isAdmin = false, onTeamUpdate, onNavigate, onLogout }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const loadActiveMatches = async () => {
      if (!currentUser) return;
      
      try {
        const matches = await getUserMatches(currentUser.id);
        // Filter for matches that are ready_up, map_banning, side_selection, or playing
        const active = matches.filter(match => 
          ['ready_up', 'map_banning', 'side_selection', 'playing'].includes(match.matchState)
        );
        setActiveMatches(active);
      } catch (error) {
        console.error('Error loading active matches:', error);
      }
    };

    loadActiveMatches();
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveMatches, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      if (onLogout) {
        await onLogout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = () => {
    if (activeMatches.length > 0) {
      // Navigate to the first active match
      navigate(`/match/${activeMatches[0].id}`);
    }
  };

  return (
    <nav className="bg-black/80 shadow-sm border-b border-gray-700 sticky top-0 z-40 transition-colors duration-200 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BM</span>
            </div>
            <span className="text-xl font-bold text-white hidden sm:block transition-colors duration-200">Bodax Masters</span>
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/') ? 'text-red-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              Home
            </Link>
            {currentUser ? (
              <Link
                to="/profile"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/profile') ? 'text-red-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                Profile
              </Link>
            ) : (
              <Link
                to="/register"
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive('/register') ? 'text-red-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                Register
              </Link>
            )}
            <Link
              to="/tournaments"
              className={`text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                isActive('/tournaments') ? 'text-red-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tournaments</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                  isActive('/admin') ? 'text-red-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/tournaments"
                className={`text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                  isActive('/admin/tournaments') ? 'text-red-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Tournament Management</span>
              </Link>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Active Match Indicator */}
                {activeMatches.length > 0 && (
                  <button
                    onClick={handleMatchClick}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 animate-pulse border border-green-800"
                    title={`You have ${activeMatches.length} active match${activeMatches.length > 1 ? 'es' : ''}`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Match Active</span>
                  </button>
                )}
                
                <NotificationBell userId={currentUser.id} onTeamUpdate={onTeamUpdate} onNavigate={onNavigate} />
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{currentUser.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>

          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t border-gray-700 bg-black/90 transition-colors duration-200">
            <div className="flex flex-col space-y-3">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive('/') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              {currentUser ? (
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/profile') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
              ) : (
                <Link
                  to="/register"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/register') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
              )}
              <Link
                to="/tournaments"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive('/tournaments') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsOpen(false)}
              >
                Tournaments
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    isActive('/admin') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin/tournaments"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    isActive('/admin/tournaments') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Tournament Management</span>
                </Link>
              )}
              {currentUser ? (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="px-3 py-2 text-sm text-gray-300 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>{currentUser.username}</span>
                  </div>
                  
                  {/* Active Match Indicator for Mobile */}
                  {activeMatches.length > 0 && (
                    <div className="px-3 py-2">
                      <button
                        onClick={handleMatchClick}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 animate-pulse border border-green-800"
                        title={`You have ${activeMatches.length} active match${activeMatches.length > 1 ? 'es' : ''}`}
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Match Active</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="px-3 py-2">
                    <NotificationBell userId={currentUser.id} onTeamUpdate={onTeamUpdate} onNavigate={onNavigate} />
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    disabled={loading}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center space-x-2 w-full text-left"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm flex items-center space-x-2 mt-3"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 