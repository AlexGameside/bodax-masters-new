import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LogIn, Shield, Trophy, Users, Home, Settings, Bell, Gamepad2, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRealtimeUserMatches } from '../hooks/useRealtimeData';
import type { User as UserType, Match } from '../types/tournament';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  currentUser: UserType | null;
  isAdmin?: boolean;
  onNavigate?: (path: string) => void; // Callback for navigation
  onLogout?: () => void; // Callback for logout
}

// Sound notification utility
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Sound notification not supported or blocked by browser');
  }
};

const Navbar = ({ currentUser, isAdmin = false, onNavigate, onLogout }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use real-time hook for user matches
  const { matches: userMatches, loading: matchesLoading, error: matchesError } = useRealtimeUserMatches(currentUser?.id || '');
  
  const [loading, setLoading] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const previousActiveMatchesRef = useRef<Match[]>([]);
  const [hasNewMatch, setHasNewMatch] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Filter active matches from real-time data
  const activeMatches = userMatches.filter(match => 
    !match.isComplete && (match.matchState === 'ready_up' || match.matchState === 'playing')
  );

  useEffect(() => {
    if (!currentUser) {
      previousActiveMatchesRef.current = [];
      setHasNewMatch(false);
      return;
    }

    // Only show notifications if we had previous matches (not on initial load)
    const hadPreviousMatches = previousActiveMatchesRef.current.length > 0;
    
    // Check if there are new active matches
    const previousMatchIds = new Set(previousActiveMatchesRef.current.map(m => m.id));
    const newMatches = activeMatches.filter(match => !previousMatchIds.has(match.id));
    
    // Show toast notification and play sound for new active matches
    // Only if we had previous matches (to avoid showing on initial page load)
    if (newMatches.length > 0 && hadPreviousMatches) {
      // Play notification sound
      playNotificationSound();
      
      // Set new match flag for visual enhancement
      setHasNewMatch(true);
      
      // Clear the new match flag after 10 seconds
      setTimeout(() => setHasNewMatch(false), 10000);
      
      newMatches.forEach(match => {
        toast.success(
          `🎮 Match Active! Your team has a new match ready.`,
          {
            duration: 8000,
            icon: '🎮',
            style: {
              background: '#10B981',
              color: '#fff',
              fontWeight: 'bold',
            },
          }
        );
      });
    }
    
    previousActiveMatchesRef.current = activeMatches;
  }, [currentUser, activeMatches]);

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
    <nav className="bg-black/80 shadow-sm border-b border-pink-400/30 sticky top-0 z-40 transition-colors duration-200 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <span className="text-xl font-bold text-white hidden sm:block transition-colors duration-200">Unity League</span>
          </Link>

          <div className="hidden lg:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive('/') ? 'text-cyan-400' : 'text-pink-200 hover:text-white'
              }`}
            >
              Home
            </Link>
            {/* Coming Soon Notice */}
            <div className="text-sm text-blue-200 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/40 rounded-lg px-4 py-2 backdrop-blur-sm shadow-lg">
              <div className="flex items-center space-x-2">
                <span className="text-blue-300">🚀</span>
                <span className="font-medium">Vorbereitungsphase läuft!</span>
              </div>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                  isActive('/admin') ? 'text-cyan-400' : 'text-pink-200 hover:text-white'
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
                  isActive('/admin') ? 'text-cyan-400' : 'text-pink-200 hover:text-white'
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
                {/* Active Match Button - Coming Soon */}
                {activeMatches.length > 0 && (
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-orange-600 to-red-600 text-orange-100 shadow-lg backdrop-blur-sm">
                    <Clock className="w-4 h-4" />
                    <span>⏳ Matches starten bald</span>
                  </div>
                )}
                <NotificationBell userId={currentUser.id} />
                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <User className="w-6 h-6 rounded-full" />
                    <span className="font-medium text-sm">{currentUser.username}</span>
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
              {/* Coming Soon Notice */}
              <div className="px-3 py-3 text-sm text-blue-200 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/40 rounded-lg backdrop-blur-sm shadow-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-300">🚀</span>
                  <span className="font-medium">Vorbereitungsphase läuft!</span>
                </div>
              </div>
              {currentUser ? (
                <>
                  {/* Active Match Button for Mobile - Coming Soon */}
                  {activeMatches.length > 0 && (
                    <div className="px-3 py-3 text-sm text-orange-200 bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/40 rounded-lg backdrop-blur-sm shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-300">⏳</span>
                        <span className="font-medium">Matches starten bald</span>
                      </div>
                    </div>
                  )}
                  <Link
                    to="/profile"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      isActive('/profile') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/team-management"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-2 ${
                      isActive('/team-management') ? 'text-red-400 bg-red-900/20' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>Team Management</span>
                  </Link>
                  {currentUser?.discordLinked && (
                    <div className="px-3 py-3 text-sm text-orange-200 bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/40 rounded-lg backdrop-blur-sm shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-300">⏳</span>
                        <span className="font-medium">Support Tickets starten bald</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
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