import React, { useState } from 'react';
import { Menu, X, Users, Star, Home } from 'lucide-react';
import { onAuthStateChange } from '../services/authService';
import type { User } from '../types/tournament';

interface ComingSoonNavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

const ComingSoonNavbar = ({ currentUser, onLogout }: ComingSoonNavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="bg-black/80 backdrop-blur-sm border-b border-purple-500/30 fixed w-full z-50">
      <div className="container-modern">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="Unity League" 
              className="w-8 h-8 rounded-full"
            />
            <span className="text-xl font-bold text-white">Unity League</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="/" className="text-white hover:text-purple-400 transition-colors flex items-center">
              <Home className="w-4 h-4 mr-2" />
              Home
            </a>
            
            {currentUser && (
              <>
                <a href="/profile" className="text-white hover:text-purple-400 transition-colors flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Profile
                </a>
                <a href="/create-team" className="text-white hover:text-purple-400 transition-colors flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Create Team
                </a>
              </>
            )}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-300 text-sm hidden sm:block">
                  {currentUser.username}
                </span>
                <button
                  onClick={onLogout}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <a href="/login" className="text-white hover:text-purple-400 transition-colors">
                  Login
                </a>
                <a href="/register" className="btn-primary text-sm px-4 py-2">
                  Sign Up
                </a>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-white hover:text-purple-400 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black/95 border-t border-purple-500/30">
            <div className="px-4 py-4 space-y-3">
              <a 
                href="/" 
                className="block text-white hover:text-purple-400 transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Home
              </a>
              
              {currentUser && (
                <>
                  <a 
                    href="/profile" 
                    className="block text-white hover:text-purple-400 transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Star className="w-4 h-4 inline mr-2" />
                    Profile
                  </a>
                  <a 
                    href="/create-team" 
                    className="block text-white hover:text-purple-400 transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Create Team
                  </a>
                </>
              )}
              
              {!currentUser && (
                <>
                  <a 
                    href="/login" 
                    className="block text-white hover:text-purple-400 transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </a>
                  <a 
                    href="/register" 
                    className="block text-white hover:text-purple-400 transition-colors py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ComingSoonNavbar; 