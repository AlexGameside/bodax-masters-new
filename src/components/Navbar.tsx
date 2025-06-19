import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LogIn, Shield, Trophy, Users, Home, Settings, Bell, Gamepad2 } from 'lucide-react';
import type { User as UserType, Match } from '../types/tournament';
import NotificationBell from './NotificationBell';
import { getUserMatches } from '../services/firebaseService';

interface NavbarProps {
  currentUser: UserType | null;
  isAdmin?: boolean;
  onNavigate?: (path: string) => void; // Callback for navigation
  onLogout?: () => void; // Callback for logout
}

const Navbar = ({ currentUser, isAdmin = false, onNavigate, onLogout }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

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
            <img 
              src="/bodax-pfp.png" 
              alt="Bodax Masters" 
              className="w-8 h-8"
              onError={(e) => {
                console.error('Failed to load logo:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
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
              <div className="flex items-center space-x-3 relative">
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
                <NotificationBell userId={currentUser.id} />
                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen((open) => !open)}
                    className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white focus:outline-none"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:block">{currentUser.username}</span>
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-black border border-gray-700 rounded-lg shadow-lg z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-t-lg transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm flex items-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-gray-600 transition-all duration-200 text-sm flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
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
                <div className="flex flex-col space-y-2 pt-2 border-t border-gray-700">
                  <Link
                    to="/login"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-red-800 transition-all duration-200 text-sm flex items-center justify-center space-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-gray-600 transition-all duration-200 text-sm flex items-center justify-center space-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 