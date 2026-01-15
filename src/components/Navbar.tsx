import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LogIn, Shield, Trophy, Users, Home, Settings, Bell, Gamepad2, Clock, MessageSquare, Target } from 'lucide-react';
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

const Navbar = ({ currentUser, isAdmin = false, onNavigate, onLogout }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use real-time hook for user matches with throttling
  const { matches: userMatches, teams, loading: matchesLoading, error: matchesError } = useRealtimeUserMatches(currentUser?.id || '');
  
  const [loading, setLoading] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const matchIdFromPath = (() => {
    const m = location.pathname.match(/^\/match\/([^/]+)/);
    return m?.[1] || null;
  })();

  const getMatchPriority = (m: Match) => {
    // Higher number = more urgent
    switch (m.matchState) {
      case 'ready_up': return 90;
      case 'map_banning': return 80;
      case 'side_selection_map1':
      case 'side_selection_map2':
      case 'side_selection_decider': return 70;
      case 'playing': return 60;
      case 'waiting_results':
      case 'disputed': return 50;
      case 'scheduled': return 40;
      case 'pending_scheduling': return 30;
      default: return 10;
    }
  };

  const activeMatch: Match | null = (() => {
    if (!currentUser) return null;
    if (matchIdFromPath) {
      return userMatches.find(m => m.id === matchIdFromPath) || null;
    }
    const candidates = userMatches.filter(m => !m.isComplete && m.matchState !== 'completed');
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => getMatchPriority(b) - getMatchPriority(a))[0] || null;
  })();

  const handleLogout = async () => {
    try {
      setLoading(true);
      if (onLogout) {
        await onLogout();
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="bg-black/90 border-b border-red-900/30 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3 group">
             <div className="text-3xl font-bold font-bodax tracking-wider text-white group-hover:text-red-500 transition-colors duration-300">
               <span className="text-red-600">/</span> BODAX
             </div>
          </Link>

          {/* Centered Navigation for Desktop */}
          <div className="hidden lg:flex items-center space-x-12">
            <Link
              to="/tournaments"
              className={`text-lg font-bodax font-medium tracking-wide transition-colors duration-200 uppercase ${
                isActive('/tournaments') ? 'text-red-500' : 'text-gray-300 hover:text-white'
              }`}
            >
              TOURNAMENTS
            </Link>
            {activeMatch && (
              <Link
                to={`/match/${activeMatch.id}`}
                className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-all duration-200 font-mono uppercase tracking-widest text-sm ${
                  matchIdFromPath
                    ? 'bg-red-600/20 border-red-800 text-red-300'
                    : 'bg-[#0a0a0a] border-gray-800 text-gray-200 hover:border-red-700 hover:text-white'
                }`}
                title="Jump to your active match"
              >
                <Gamepad2 className="w-4 h-4 text-red-500" />
                <span className="whitespace-nowrap">
                  Active Match{activeMatch.matchNumber ? ` #${activeMatch.matchNumber}` : ''}
                </span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400">
                  {(activeMatch.matchState || 'active').replace(/_/g, ' ')}
                </span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-lg font-bodax font-medium tracking-wide transition-colors duration-200 uppercase ${
                  isActive('/admin') ? 'text-red-500' : 'text-gray-300 hover:text-white'
                }`}
              >
                ADMIN
              </Link>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-6">
            {/* Social Icons Placeholder */}
             <div className="flex items-center space-x-4 border-r border-gray-800 pr-6 mr-2">
                <a href="https://x.com/GamingBodax" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
                 <a href="https://discord.gg/ewAk7wBgHT" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-500 transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </a>
             </div>


            {currentUser ? (
              <div className="flex items-center space-x-3 relative">
                <NotificationBell userId={currentUser.id} />
                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-150"
                  >
                    <User className="w-6 h-6 rounded-full" />
                    <span className="font-bodax font-medium tracking-wide text-lg pt-1">{currentUser.username}</span>
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-black border border-red-900/50 rounded-none shadow-xl z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-3 text-gray-300 hover:bg-red-900/20 hover:text-white font-bodax tracking-wide text-lg transition-colors duration-150"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        PROFILE
                      </Link>
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full text-left px-4 py-3 text-gray-300 hover:bg-red-900/20 hover:text-white font-bodax tracking-wide text-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-t border-red-900/30"
                      >
                        LOGOUT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-white hover:text-red-500 font-bodax text-xl tracking-wide transition-colors duration-150 flex items-center space-x-2 px-4 py-1"
                >
                  <span>LOGIN</span>
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white transition-colors duration-150 p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t border-gray-800 bg-black/95 transition-colors duration-150">
            <div className="flex flex-col space-y-3 px-2">
              <Link
                to="/tournaments"
                className="px-4 py-3 text-lg font-bodax tracking-wide text-gray-300 hover:text-red-500 hover:bg-white/5"
                onClick={() => setIsOpen(false)}
              >
                TOURNAMENTS
              </Link>
              {activeMatch && (
                <Link
                  to={`/match/${activeMatch.id}`}
                  className="px-4 py-3 text-lg font-bodax tracking-wide text-gray-200 hover:text-red-400 hover:bg-white/5 flex items-center gap-3"
                  onClick={() => setIsOpen(false)}
                >
                  <Gamepad2 className="w-5 h-5 text-red-500" />
                  <span>
                    ACTIVE MATCH{activeMatch.matchNumber ? ` #${activeMatch.matchNumber}` : ''}
                    <span className="text-gray-500 font-mono text-xs uppercase tracking-widest ml-2">
                      {activeMatch.matchState?.replace(/_/g, ' ') || 'active'}
                    </span>
                  </span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-3 text-lg font-bodax tracking-wide text-gray-300 hover:text-red-500 hover:bg-white/5"
                  onClick={() => setIsOpen(false)}
                >
                  ADMIN
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